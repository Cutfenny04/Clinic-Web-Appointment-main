/**
 * Tes route API: role & akses, booking, check-in + antrean.
 * Supabase dan Queue Service diganti stub → tidak butuh jaringan/database.
 * Logika SQL (RLS, atomik, transisi) diuji terpisah di tests/db/migrations.db.test.js.
 */
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

process.env.QUEUE_INTERNAL_TOKEN = "stub";
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { default: app } = await import("../src/app.js");
const { authDeps } = await import("../src/middleware/authenticate.js");
const { queueClient } = await import("../src/services/queueClient.js");
const { fakeSupabase } = await import("./helpers/fakeSupabase.js");

const U = {
  admin: { id: "00000000-0000-4000-8000-0000000000a1", email: "admin@test.id", role: "admin" },
  doctor: { id: "00000000-0000-4000-8000-0000000000d1", email: "dokter@test.id", role: "doctor" },
  doctor2: { id: "00000000-0000-4000-8000-0000000000d2", email: "dokter2@test.id", role: "doctor" },
  patient: { id: "00000000-0000-4000-8000-0000000000b1", email: "pasien@test.id", role: "patient" },
  disabled: { id: "00000000-0000-4000-8000-0000000000c1", email: "off@test.id", role: "patient", is_active: false },
};
const APPT = "00000000-0000-4000-8000-00000000aa01";
const SCHED = "00000000-0000-4000-8000-00000000cc01";
const TICKET = "00000000-0000-4000-8000-00000000ee01";

let db, calls, queueCalls, server, base;

function resetDb() {
  calls = [];
  queueCalls = [];
  db = {
    profiles: Object.values(U).map((u) => ({
      id: u.id, full_name: u.email.split("@")[0], role: u.role, email: u.email, is_active: u.is_active !== false,
    })),
    appointments: [{ id: APPT, patient_id: U.patient.id, doctor_id: U.doctor.id, schedule_id: SCHED, status: "confirmed", created_at: "2026-11-08" }],
    doctor_schedules: [{ id: SCHED, doctor_id: U.doctor.id, schedule_date: "2026-11-08", start_time: "08:00", end_time: "12:00", capacity: 2 }],
    queue_tickets: [{ id: TICKET, appointment_id: APPT, doctor_id: U.doctor.id, queue_code: "A-001", status: "waiting" }],
    doctor_details: [],
    appointment_status_history: [],
    rpc: {
      admin_dashboard_stats: () => ({ data: { active_doctors: 2, registered_patients: 1 }, error: null }),
      transition_appointment: ({ p_appointment_id, p_new_status }) => {
        const a = db.appointments.find((x) => x.id === p_appointment_id);
        a.status = p_new_status;
        return { data: a, error: null };
      },
      book_appointment_atomic: () => ({ data: null, error: { code: "P0006", message: "Kapasitas jadwal dokter sudah penuh." } }),
    },
  };
}

before(async () => {
  authDeps.getUser = async (token) => {
    const u = Object.values(U).find((x) => `tok-${x.email}` === token);
    // metadata sengaja berisi role admin untuk membuktikan role diambil dari tabel profiles
    return u ? { data: { user: { id: u.id, email: u.email, user_metadata: { role: "admin" } } }, error: null }
      : { data: { user: null }, error: { message: "invalid" } };
  };
  authDeps.createClient = () => fakeSupabase(db, calls);
  Object.assign(queueClient, {
    createTicket: async (id, actor) => { queueCalls.push(["createTicket", id, actor]); return { id: TICKET, queue_code: "A-001", status: "waiting" }; },
    display: async () => ({ date: "2026-11-08", doctors: [] }),
    setStatus: async (id, status, actor) => { queueCalls.push(["setStatus", id, status, actor]); return { id, status }; },
  });
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}/api/v1`;
});
after(() => new Promise((r) => server.close(r)));
beforeEach(resetDb);

async function req(path, { as, method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (as) headers.Authorization = `Bearer tok-${U[as].email}`;
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
}

describe("Autentikasi & role", () => {
  it("/auth/me mengambil role dari tabel profiles, bukan metadata token", async () => {
    const r = await req("/auth/me", { as: "patient" });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.role, "patient");
  });

  it("akun nonaktif ditolak (403)", async () => {
    const r = await req("/auth/me", { as: "disabled" });
    assert.equal(r.status, 403);
    assert.equal(r.body.code, "ACCOUNT_DISABLED");
  });

  it("token tidak valid → 401 dengan pesan Bahasa Indonesia", async () => {
    const res = await fetch(base + "/auth/me", { headers: { Authorization: "Bearer palsu" } });
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.match(body.message, /Sesi Anda sudah berakhir/);
  });

  for (const [role, expected] of [["patient", 403], ["doctor", 403], ["admin", 200]]) {
    it(`GET /admin/stats sebagai ${role} → ${expected}`, async () => {
      assert.equal((await req("/admin/stats", { as: role })).status, expected);
    });
  }

  it("pasien tidak bisa melihat daftar semua janji temu atau pengguna", async () => {
    assert.equal((await req("/appointments", { as: "patient" })).status, 403);
    assert.equal((await req("/users?role=patient", { as: "patient" })).status, 403);
  });

  it("dokter tidak bisa membuat janji temu", async () => {
    const r = await req("/appointments", { as: "doctor", method: "POST", body: { schedule_id: SCHED } });
    assert.equal(r.status, 403);
  });

  it("dokter hanya melihat janji temu miliknya", async () => {
    db.appointments.push({ id: "x2", patient_id: U.patient.id, doctor_id: U.doctor2.id, schedule_id: SCHED, status: "pending" });
    const r = await req("/appointments", { as: "doctor" });
    assert.deepEqual(r.body.data.map((a) => a.doctor_id), [U.doctor.id]);
  });
});

describe("Booking", () => {
  it("kapasitas penuh dari database → 409 dengan pesan Indonesia", async () => {
    const r = await req("/appointments", { as: "patient", method: "POST", body: { schedule_id: SCHED } });
    assert.equal(r.status, 409);
    assert.equal(r.body.message, "Kapasitas jadwal dokter sudah penuh.");
  });

  it("error RPC tak dikenal TIDAK memicu insert non-atomik", async () => {
    db.rpc.book_appointment_atomic = () => ({ data: null, error: { code: "XX000", message: "boom" } });
    const r = await req("/appointments", { as: "patient", method: "POST", body: { schedule_id: SCHED } });
    assert.equal(r.status, 500);
    assert.ok(!calls.some((c) => c.table === "appointments" && c.op === "insert"));
    assert.ok(!JSON.stringify(r.body).includes("boom"), "pesan DB mentah tidak boleh bocor");
  });

  it("validasi schedule_id berbahasa Indonesia", async () => {
    const r = await req("/appointments", { as: "patient", method: "POST", body: { schedule_id: "abc" } });
    assert.equal(r.status, 400);
    assert.equal(r.body.message, "Jadwal tidak valid.");
  });
});

describe("Check-in & antrean", () => {
  it("check-in mengubah status lalu membuat tiket dengan pelaku tercatat", async () => {
    const r = await req(`/appointments/${APPT}/check-in`, { as: "patient", method: "POST" });
    assert.equal(r.status, 200);
    assert.match(r.body.message, /A-001/);
    assert.equal(db.appointments[0].status, "checked_in");
    assert.deepEqual(queueCalls[0], ["createTicket", APPT, U.patient.id]);
  });

  it("check-in ulang tidak mengubah status lagi (idempotent)", async () => {
    db.appointments[0].status = "checked_in";
    await req(`/appointments/${APPT}/check-in`, { as: "admin", method: "POST" });
    assert.ok(!calls.some((c) => c.rpc === "transition_appointment"));
    assert.equal(queueCalls.length, 1);
  });

  it("queue service gagal → 502 dengan instruksi mengulang", async () => {
    const orig = queueClient.createTicket;
    queueClient.createTicket = async () => { throw Object.assign(new Error("Layanan antrean sedang tidak dapat dihubungi."), { statusCode: 503 }); };
    const r = await req(`/appointments/${APPT}/check-in`, { as: "admin", method: "POST" });
    queueClient.createTicket = orig;
    assert.equal(r.status, 502);
    assert.match(r.body.message, /ulangi check-in/);
  });

  it("dokter lain tidak bisa mengubah tiket antrean", async () => {
    const r = await req(`/queue/${TICKET}/status`, { as: "doctor2", method: "PATCH", body: { status: "skipped" } });
    assert.equal(r.status, 403);
    assert.equal(queueCalls.length, 0);
  });

  it("dokter pemilik bisa melewati tiket", async () => {
    const r = await req(`/queue/${TICKET}/status`, { as: "doctor", method: "PATCH", body: { status: "skipped" } });
    assert.equal(r.status, 200);
    assert.deepEqual(queueCalls[0], ["setStatus", TICKET, "skipped", U.doctor.id]);
  });

  it("layar TV dapat diakses tanpa login", async () => {
    assert.equal((await req("/queue/display")).status, 200);
  });
});

describe("Administrasi dokter", () => {
  it("membuat akun dokter tanpa service role key → 503 dengan penjelasan", async () => {
    const r = await req("/doctors", {
      as: "admin", method: "POST",
      body: { email: "baru@test.id", password: "rahasia123", full_name: "dr. Baru", specialty: "Umum" },
    });
    assert.equal(r.status, 503);
    assert.match(r.body.message, /SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("menonaktifkan dokter ditolak bila masih ada janji temu aktif", async () => {
    const r = await req(`/doctors/${U.doctor.id}`, { as: "admin", method: "DELETE" });
    assert.equal(r.status, 409);
  });
});
