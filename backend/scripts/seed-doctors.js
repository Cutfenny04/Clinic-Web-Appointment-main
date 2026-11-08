#!/usr/bin/env node
/**
 * Mengisi database dengan akun DOKTER dari file JSON (default: scripts/data/dokter-dummy.json).
 * Membutuhkan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di backend/.env.
 *
 *   node scripts/seed-doctors.js               # buat / perbarui 10 dokter
 *   node scripts/seed-doctors.js --jadwal      # + jadwal praktik 14 hari ke depan (untuk uji booking)
 *   node scripts/seed-doctors.js --cek         # hanya validasi file, tidak menulis ke database
 *   node scripts/seed-doctors.js --file path/ke/data.json
 *
 * Aman dijalankan berulang: email yang sudah terdaftar tidak dibuat ulang dan kata sandinya
 * TIDAK diganti; hanya role, profil, dan detail praktiknya yang diperbarui.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const fileArg = args.includes("--file") ? args[args.indexOf("--file") + 1] : path.join(here, "data", "dokter-dummy.json");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+62|62|0)[0-9]{8,13}$/;

function fail(msg) { console.error("✖ " + msg); process.exit(1); }

// ── 1. Baca & validasi data (aturan sama dengan formulir Tambah Dokter) ──
let doctors;
try { doctors = JSON.parse(fs.readFileSync(fileArg, "utf8")).dokter; } catch (e) { fail(`Tidak dapat membaca ${fileArg}: ${e.message}`); }
if (!Array.isArray(doctors) || !doctors.length) fail("File tidak berisi daftar \"dokter\".");

const problems = [];
const seen = new Set();
doctors = doctors.map((d, i) => {
  const row = { ...d, email: String(d.email || "").trim().toLowerCase(), phone: String(d.phone || "").replace(/[\s-]/g, "") };
  const no = `#${i + 1} ${d.full_name || "(tanpa nama)"}`;
  if (!row.full_name || row.full_name.trim().length < 3) problems.push(`${no}: nama minimal 3 karakter`);
  if (!row.specialty || row.specialty.trim().length < 2) problems.push(`${no}: spesialisasi wajib diisi`);
  if (!EMAIL_RE.test(row.email)) problems.push(`${no}: format email tidak valid`);
  if (seen.has(row.email)) problems.push(`${no}: email ganda dalam file`);
  seen.add(row.email);
  if (!row.password || row.password.length < 8) problems.push(`${no}: kata sandi minimal 8 karakter`);
  if (row.phone && !PHONE_RE.test(row.phone)) problems.push(`${no}: format nomor telepon tidak valid`);
  if (!(Number(row.experience_years) >= 0)) problems.push(`${no}: pengalaman tidak valid`);
  if (!(Number(row.consultation_fee) >= 0)) problems.push(`${no}: biaya konsultasi tidak valid`);
  if (row.bio && row.bio.length > 1000) problems.push(`${no}: profil singkat maksimal 1000 karakter`);
  return row;
});
if (problems.length) fail("Data belum valid:\n  - " + problems.join("\n  - "));
console.log(`✔ ${doctors.length} data dokter valid (${path.basename(fileArg)})`);
if (flag("--cek")) process.exit(0);

// ── 2. Tulis ke database ──
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  fail("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib ada di backend/.env");
}
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const todayJakarta = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const addDays = (ymd, n) => { const d = new Date(ymd + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
// Pola jadwal contoh: tiap dokter praktik 3 hari per minggu, pagi atau sore bergantian
const SESSIONS = [["08:00", "12:00"], ["13:00", "16:00"], ["16:00", "20:00"]];

const results = [];
for (const [i, d] of doctors.entries()) {
  let status;
  let userId;
  const { data: created, error } = await admin.auth.admin.createUser({
    email: d.email, password: d.password, email_confirm: true,
    user_metadata: { full_name: d.full_name, phone: d.phone || null },
  });
  if (error) {
    if (!/already|registered|exists/i.test(error.message)) { results.push([d.full_name, "✖ " + error.message]); continue; }
    const { data: found } = await admin.from("profiles").select("id").eq("email", d.email).maybeSingle();
    if (!found) { results.push([d.full_name, "✖ email terdaftar tapi profil tidak ditemukan (jalankan migrasi SQL 02)"]); continue; }
    userId = found.id; status = "diperbarui";
  } else {
    userId = created.user.id; status = "dibuat";
  }

  const { error: pErr } = await admin.from("profiles")
    .update({ role: "doctor", full_name: d.full_name, phone: d.phone || null, is_active: true }).eq("id", userId);
  if (pErr) { results.push([d.full_name, "✖ profil: " + pErr.message]); continue; }

  const { error: dErr } = await admin.from("doctor_details").upsert({
    user_id: userId, specialty: d.specialty, bio: d.bio || "",
    experience_years: Number(d.experience_years), consultation_fee: Number(d.consultation_fee), is_available: true,
  });
  if (dErr) { results.push([d.full_name, "✖ detail praktik: " + dErr.message]); continue; }

  let jadwal = "";
  if (flag("--jadwal")) {
    const start = todayJakarta();
    let made = 0;
    for (let day = 1; day <= 14; day++) {
      if ((day + i) % 7 !== 0 && (day + i) % 7 !== 2 && (day + i) % 7 !== 4) continue; // 3 hari/minggu
      const date = addDays(start, day);
      const [st, en] = SESSIONS[(i + day) % SESSIONS.length];
      const { data: clash } = await admin.from("doctor_schedules").select("id")
        .eq("doctor_id", userId).eq("schedule_date", date).lt("start_time", en).gt("end_time", st).limit(1);
      if (clash?.length) continue;
      const { error: sErr } = await admin.from("doctor_schedules").insert({
        doctor_id: userId, schedule_date: date, start_time: st, end_time: en, capacity: 10, is_active: true,
      });
      if (!sErr) made++;
    }
    jadwal = ` · ${made} jadwal baru`;
  }
  results.push([d.full_name, `✔ ${status}${jadwal}`]);
}

console.log("");
for (const [name, s] of results) console.log(`  ${name.padEnd(34)} ${s}`);
const okCount = results.filter(([, s]) => s.startsWith("✔")).length;
console.log(`\n${okCount}/${doctors.length} dokter siap. Login di /login memakai email & kata sandi dari file data.`);
if (okCount !== doctors.length) process.exit(1);
