#!/usr/bin/env node
/**
 * Membuat akun ADMIN atau DOKTER secara administratif (tidak melalui registrasi publik).
 * Membutuhkan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di backend/.env.
 *
 *   node scripts/create-staff-user.js --role admin  --email admin@klinik.id  --name "Admin Klinik" --password "RahasiaKuat123"
 *   node scripts/create-staff-user.js --role doctor --email dokter@klinik.id --name "dr. Sari"    --password "RahasiaKuat123" --specialty "Dokter Umum"
 *
 * Jika email sudah terdaftar, role pengguna tersebut akan diubah (tanpa mengganti kata sandi).
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => (cur.startsWith("--") ? [...acc, [cur.slice(2), arr[i + 1]]] : acc), [])
);
const { role, email, name, password, specialty = "Dokter Umum" } = args;

function exit(msg) { console.error("✖ " + msg); process.exit(1); }
if (!["admin", "doctor"].includes(role)) exit("--role harus admin atau doctor");
if (!email || !name) exit("--email dan --name wajib diisi");
if (!password || password.length < 8) exit("--password wajib diisi, minimal 8 karakter");
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) exit("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib ada di .env");

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let userId;
const { data: created, error } = await admin.auth.admin.createUser({
  email, password, email_confirm: true, user_metadata: { full_name: name },
});
if (error) {
  if (!/already|registered|exists/i.test(error.message)) exit("Gagal membuat akun: " + error.message);
  const { data: found } = await admin.from("profiles").select("id").eq("email", email.toLowerCase()).maybeSingle();
  if (!found) exit("Email sudah terdaftar tetapi profil tidak ditemukan. Jalankan migrasi SQL 02 terlebih dahulu.");
  userId = found.id;
  console.log("ℹ Email sudah terdaftar, role akan diperbarui.");
} else {
  userId = created.user.id;
}

const { error: roleErr } = await admin.from("profiles").update({ role, full_name: name, is_active: true }).eq("id", userId);
if (roleErr) exit("Gagal menetapkan role: " + roleErr.message);
if (role === "doctor") {
  const { error: dErr } = await admin.from("doctor_details").upsert({ user_id: userId, specialty, is_available: true });
  if (dErr) exit("Gagal menyimpan detail dokter: " + dErr.message);
}
console.log(`✔ Akun ${role} siap: ${email} (id ${userId})`);
