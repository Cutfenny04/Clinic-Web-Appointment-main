/**
 * Tes Queue Service.
 * - Bagian 1 (selalu jalan): health, token internal, validasi input.
 * - Bagian 2 (butuh TEST_DATABASE_URL ke PostgreSQL KOSONG khusus tes): persistensi,
 *   idempotency, nomor unik, pemanggilan, sinkronisasi status appointment.
 *   Contoh: TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/janjicare_test npm test
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOKEN = "token-uji-internal";
const TEST_DB = process.env.TEST_DATABASE_URL;
process.env.QUEUE_INTERNAL_TOKEN = TOKEN;
process.env.DATABASE_URL = TEST_DB || "";
process.env.DATABASE_SSL = "false";
process.env.NODE_ENV = "test";

const { default: app } = await import("../src/app.js");
const { closePool } = await import("../src/db/pool.js");

let server;
let baseUrl;
before(async () => {
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  baseUrl = `http://localhost:${server.address().port}`;
});
after(async () => {
  await new Promise((r) => server.close(r));
  await closePool();
});

async function call(p, { method = "GET", body, token = TOKEN, actor } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["X-Internal-Token"] = token;
  if (actor) headers["X-Actor-Id"] = actor;
  const res = await fetch(baseUrl + p, { method, headers, body: body && method !== "GET" ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
}

describe("Queue Service — keamanan & validasi", () => {
  it("GET /api/v1/queue/health publik dan sehat", async () => {
    const { status, body } = await call("/api/v1/queue/health", { token: null });
    assert.equal(status, 200);
    assert.equal(body.storage, "postgresql");
  });

  it("endpoint data menolak permintaan tanpa token internal (401)", async () => {
    for (const [p, method] of [["/api/v1/queue", "GET"], ["/api/v1/queue/call", "POST"], ["/api/v1/queue/ticket", "POST"]]) {
      const { status } = await call(p, { method, token: null, body: {} });
      assert.equal(status, 401, `${method} ${p}`);
    }
  });

  it("token salah ditolak (401)", async () => {
    const { status } = await call("/api/v1/queue/stats", { token: "salah" });
    assert.equal(status, 401);
  });

  it("appointment_id wajib berupa UUID (400)", async () => {
    const { status, body } = await call("/api/v1/queue/ticket", { method: "POST", body: { doctor_id: "x" } });
    assert.equal(status, 400);
    assert.match(body.errors[0].message, /appointment_id/);
  });

  it("status tiket tidak dikenal ditolak (400)", async () => {
    const { status } = await call("/api/v1/queue/00000000-0000-0000-0000-000000000000/status", {
      method: "PATCH", body: { status: "selesai" },
    });
    assert.equal(status, 400);
  });
});

describe("Queue Service — PostgreSQL (persisten)", { skip: !TEST_DB && "TEST_DATABASE_URL tidak diset" }, () => {
  let pool;
  const ids = {};
  const sqlDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../backend");
  const read = (f) => fs.readFileSync(path.join(sqlDir, f), "utf8");

  async function user(email, name, role) {
    const { rows } = await pool.query("INSERT INTO auth.users (email, raw_user_meta_data) VALUES ($1,$2) RETURNING id",
      [email, JSON.stringify({ full_name: name })]);
    if (role !== "patient") await pool.query("UPDATE public.profiles SET role=$2 WHERE id=$1", [rows[0].id, role]);
    return rows[0].id;
  }
  async function checkedIn(patient, schedule) {
    const { rows } = await pool.query(
      "INSERT INTO public.appointments (patient_id, doctor_id, schedule_id, status, queue_number) " +
      "SELECT $1, doctor_id, id, 'checked_in', (SELECT COUNT(*)+1 FROM public.appointments WHERE schedule_id=$2) " +
      "FROM public.doctor_schedules WHERE id=$2 RETURNING id", [patient, schedule]);
    return rows[0].id;
  }

  before(async () => {
    const pg = (await import("pg")).default;
    pool = new pg.Pool({ connectionString: TEST_DB });
    await pool.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS auth CASCADE;");
    await pool.query(read("tests/db/supabase_stub.sql"));
    await pool.query(read("sql/01_schema_and_rls.sql"));
    await pool.query(read("sql/02_security_status_queue.sql"));
    ids.doctor = await user("dq@test.id", "dr. Antre", "doctor");
    ids.doctor2 = await user("dq2@test.id", "dr. Kedua", "doctor");
    const s = await pool.query(
      `INSERT INTO public.doctor_schedules (doctor_id, schedule_date, start_time, end_time, capacity)
       VALUES ($1, (NOW() AT TIME ZONE 'Asia/Jakarta')::date, '00:00', '23:59', 50),
              ($2, (NOW() AT TIME ZONE 'Asia/Jakarta')::date, '00:00', '23:59', 50) RETURNING id`, [ids.doctor, ids.doctor2]);
    ids.s1 = s.rows[0].id; ids.s2 = s.rows[1].id;
    ids.patients = [];
    for (let i = 0; i < 12; i++) ids.patients.push(await user(`pq${i}@test.id`, `Pasien Antre ${i}`, "patient"));
    ids.a = [];
    for (let i = 0; i < 3; i++) ids.a.push(await checkedIn(ids.patients[i], ids.s1));
    ids.today = (await pool.query("SELECT to_char((NOW() AT TIME ZONE 'Asia/Jakarta')::date,'YYYY-MM-DD') d")).rows[0].d;
  });
  after(async () => pool && pool.end());

  it("membuat tiket A-001 untuk appointment yang sudah check-in", async () => {
    const { status, body } = await call("/api/v1/queue/ticket", { method: "POST", body: { appointment_id: ids.a[0] } });
    assert.equal(status, 201);
    assert.equal(body.data.queue_code, "A-001");
    assert.equal(body.data.date, ids.today);
    assert.equal(body.data.patient_name, "Pasien Antre 0");
    ids.t1 = body.data.id;
  });

  it("permintaan ulang untuk appointment yang sama idempotent (200, tiket sama)", async () => {
    const { status, body } = await call("/api/v1/queue/ticket", { method: "POST", body: { appointment_id: ids.a[0] } });
    assert.equal(status, 200);
    assert.equal(body.is_duplicate, true);
    assert.equal(body.data.id, ids.t1);
  });

  it("10 permintaan bersamaan untuk satu appointment hanya menghasilkan satu tiket", async () => {
    const res = await Promise.all(Array.from({ length: 10 }, () =>
      call("/api/v1/queue/ticket", { method: "POST", body: { appointment_id: ids.a[1] } })));
    assert.equal(new Set(res.map((r) => r.body.data.id)).size, 1);
    assert.equal(res.filter((r) => r.status === 201).length, 1);
    assert.equal(res[0].body.data.queue_code, "A-002");
  });

  it("tiket untuk banyak appointment bersamaan mendapat nomor unik berurutan", async () => {
    const more = [];
    for (let i = 3; i < 9; i++) more.push(await checkedIn(ids.patients[i], ids.s1));
    const res = await Promise.all([ids.a[2], ...more].map((a) =>
      call("/api/v1/queue/ticket", { method: "POST", body: { appointment_id: a } })));
    const nums = res.map((r) => r.body.data.queue_number).sort((x, y) => x - y);
    assert.deepEqual(nums, [3, 4, 5, 6, 7, 8, 9]);
  });

  it("nomor antrean dihitung terpisah per dokter", async () => {
    const a = await checkedIn(ids.patients[10], ids.s2);
    const { body } = await call("/api/v1/queue/ticket", { method: "POST", body: { appointment_id: a } });
    assert.equal(body.data.queue_code, "A-001");
  });

  it("appointment yang belum check-in ditolak (409)", async () => {
    const { rows } = await pool.query(
      "INSERT INTO public.appointments (patient_id, doctor_id, schedule_id, status, queue_number) VALUES ($1,$2,$3,'pending',99) RETURNING id",
      [ids.patients[11], ids.doctor, ids.s1]);
    const { status, body } = await call("/api/v1/queue/ticket", { method: "POST", body: { appointment_id: rows[0].id } });
    assert.equal(status, 409);
    assert.match(body.message, /check-in/);
  });

  it("memanggil pasien berikutnya, melewati yang tidak hadir", async () => {
    let r = await call("/api/v1/queue/call", { method: "POST", body: { doctor_id: ids.doctor } });
    assert.equal(r.body.data.queue_code, "A-001");
    assert.equal(r.body.data.status, "calling");
    r = await call("/api/v1/queue/call", { method: "POST", body: { doctor_id: ids.doctor } });
    assert.equal(r.body.data.queue_code, "A-002");
    const skipped = await pool.query("SELECT status FROM public.queue_tickets WHERE id=$1", [ids.t1]);
    assert.equal(skipped.rows[0].status, "skipped");
  });

  it("serving & done menyinkronkan status appointment dan mencatat pelaku", async () => {
    const cur = await call(`/api/v1/queue/current/${ids.doctor}`);
    const actor = ids.doctor;
    let r = await call(`/api/v1/queue/${cur.body.data.id}/status`, { method: "PATCH", body: { status: "serving" }, actor });
    assert.equal(r.status, 200);
    let a = await pool.query("SELECT status FROM public.appointments WHERE id=$1", [ids.a[1]]);
    assert.equal(a.rows[0].status, "in_progress");

    const blocked = await call("/api/v1/queue/call", { method: "POST", body: { doctor_id: ids.doctor } });
    assert.equal(blocked.status, 409);

    r = await call(`/api/v1/queue/${cur.body.data.id}/status`, { method: "PATCH", body: { status: "done" }, actor });
    a = await pool.query("SELECT status FROM public.appointments WHERE id=$1", [ids.a[1]]);
    assert.equal(a.rows[0].status, "completed");
    const h = await pool.query(
      "SELECT changed_by FROM public.appointment_status_history WHERE appointment_id=$1 AND new_status='completed'", [ids.a[1]]);
    assert.equal(h.rows[0].changed_by, actor);
  });

  it("transisi tiket tidak valid ditolak (409)", async () => {
    const r = await call(`/api/v1/queue/${ids.t1}/status`, { method: "PATCH", body: { status: "done" } });
    assert.equal(r.status, 409);
  });

  it("data tetap ada setelah koneksi ditutup (persisten) dan statistik benar", async () => {
    await closePool();
    const { body } = await call(`/api/v1/queue/stats?date=${ids.today}&doctor_id=${ids.doctor}`);
    assert.equal(body.data.total, 9);
    assert.equal(body.data.done, 1);
    assert.equal(body.data.skipped, 1);
    assert.equal(body.data.waiting, 7);
  });

  it("data layar TV tidak memuat nama lengkap pasien", async () => {
    const { body } = await call(`/api/v1/queue/display?date=${ids.today}`);
    const txt = JSON.stringify(body.data);
    assert.ok(!txt.includes("Pasien Antre"));
    assert.ok(body.data.doctors.find((d) => d.doctor_name === "dr. Antre").waiting.length === 7);
  });
});
