/**
 * Tes integrasi database untuk sql/01 + sql/02.
 * Berjalan hanya jika TEST_DATABASE_URL diset ke PostgreSQL KOSONG khusus pengujian
 * (database akan diisi ulang). Jangan arahkan ke Supabase produksi.
 *
 *   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/janjicare_test npm test
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DB_URL = process.env.TEST_DATABASE_URL;
const here = path.dirname(fileURLToPath(import.meta.url));
const sql = (f) => fs.readFileSync(path.join(here, f), "utf8");

describe("Database: RLS, booking atomik, status, antrean", { skip: !DB_URL && "TEST_DATABASE_URL tidak diset" }, () => {
  let pg, pool;
  const ids = {};

  async function as(userId, fn) {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      if (userId) {
        await c.query("SET LOCAL ROLE authenticated");
        await c.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [userId]);
      }
      const r = await fn(c);
      await c.query("COMMIT");
      return r;
    } catch (e) {
      await c.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      c.release();
    }
  }
  const book = (uid, patient, schedule) =>
    as(uid, (c) => c.query("SELECT public.book_appointment_atomic($1,$2,'Demam') AS r", [patient, schedule]).then((r) => r.rows[0].r));
  const move = (uid, appt, status, note = null) =>
    as(uid, (c) => c.query("SELECT public.transition_appointment($1,$2,$3) AS r", [appt, status, note]).then((r) => r.rows[0].r));

  async function newUser(email, name, role) {
    const { rows } = await pool.query(
      "INSERT INTO auth.users (email, raw_user_meta_data) VALUES ($1, $2) RETURNING id",
      [email, JSON.stringify({ full_name: name, role: "admin" })] // upaya eskalasi via metadata
    );
    if (role !== "patient") await pool.query("UPDATE public.profiles SET role=$2 WHERE id=$1", [rows[0].id, role]);
    return rows[0].id;
  }
  async function schedule(doctor, dayOffset, start, end, capacity = 3, active = true) {
    const { rows } = await pool.query(
      `INSERT INTO public.doctor_schedules (doctor_id, schedule_date, start_time, end_time, capacity, is_active)
       VALUES ($1, (NOW() AT TIME ZONE 'Asia/Jakarta')::date + $2::int, $3, $4, $5, $6) RETURNING id`,
      [doctor, dayOffset, start, end, capacity, active]
    );
    return rows[0].id;
  }

  before(async () => {
    pg = (await import("pg")).default;
    pool = new pg.Pool({ connectionString: DB_URL, max: 12 });
    await pool.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS auth CASCADE; DROP SCHEMA IF EXISTS storage CASCADE;");
    await pool.query(sql("supabase_stub.sql"));
    await pool.query(sql("../../sql/01_schema_and_rls.sql"));
    await pool.query(sql("../../sql/02_security_status_queue.sql"));
    await pool.query(sql("../../sql/03_doctor_photos.sql"));
    await pool.query(sql("../../sql/03_doctor_photos.sql")); // idempotent
    await pool.query(sql("../../sql/04_chat.sql"));
    await pool.query(sql("../../sql/04_chat.sql")); // idempotent
    ids.admin = await newUser("admin@test.id", "Admin", "admin");
    ids.doctor = await newUser("dokter@test.id", "dr. Uji", "doctor");
    ids.doctor2 = await newUser("dokter2@test.id", "dr. Lain", "doctor");
    ids.p1 = await newUser("p1@test.id", "Pasien Satu", "patient");
    ids.p2 = await newUser("p2@test.id", "Pasien Dua", "patient");
    ids.p3 = await newUser("p3@test.id", "Pasien Tiga", "patient");
    await pool.query("INSERT INTO public.doctor_details (user_id, specialty) VALUES ($1,'Umum'),($2,'Anak')", [ids.doctor, ids.doctor2]);
  });
  after(async () => pool && pool.end());

  it("registrasi publik selalu menjadi patient walau metadata berisi role admin", async () => {
    const { rows } = await pool.query("SELECT role, email FROM public.profiles WHERE id=$1", [ids.p1]);
    assert.equal(rows[0].role, "patient");
    assert.equal(rows[0].email, "p1@test.id");
  });

  it("pasien tidak bisa menaikkan role dirinya", async () => {
    await assert.rejects(
      as(ids.p1, (c) => c.query("UPDATE public.profiles SET role='admin' WHERE id=$1", [ids.p1])),
      /tidak diizinkan mengubah role/
    );
  });

  it("booking berhasil dan nomor urut dimulai dari 1", async () => {
    ids.s1 = await schedule(ids.doctor, 1, "08:00", "12:00", 2);
    const a = await book(ids.p1, ids.p1, ids.s1);
    assert.equal(a.status, "pending");
    assert.equal(a.queue_number, 1);
    ids.a1 = a.id;
  });

  it("booking ganda ditolak", async () => {
    await assert.rejects(book(ids.p1, ids.p1, ids.s1), /sudah memiliki janji temu aktif/);
  });

  it("pasien tidak bisa booking atas nama pasien lain", async () => {
    await assert.rejects(book(ids.p1, ids.p2, ids.s1), /atas nama pasien lain/);
  });

  it("dokter tidak bisa membuat booking", async () => {
    await assert.rejects(book(ids.doctor, ids.doctor, ids.s1), /tidak diizinkan|Hanya pasien/);
  });

  it("kapasitas penuh ditolak", async () => {
    await book(ids.p2, ids.p2, ids.s1);
    await assert.rejects(book(ids.p3, ids.p3, ids.s1), /Kapasitas jadwal dokter sudah penuh/);
  });

  it("jadwal yang sudah lewat & tidak aktif ditolak", async () => {
    const past = await schedule(ids.doctor, -1, "08:00", "12:00");
    await assert.rejects(book(ids.p1, ids.p1, past), /sudah lewat/);
    const off = await schedule(ids.doctor, 2, "08:00", "12:00", 5, false);
    await assert.rejects(book(ids.p1, ids.p1, off), /tidak aktif/);
  });

  it("pasien tidak bisa mengubah appointment langsung (RLS)", async () => {
    const n = await as(ids.p1, (c) =>
      c.query("UPDATE public.appointments SET status='completed' WHERE id=$1", [ids.a1]).then((r) => r.rowCount)
    );
    assert.equal(n, 0);
    const n2 = await as(ids.p1, (c) =>
      c.query("INSERT INTO public.appointments (patient_id, doctor_id, schedule_id) VALUES ($1,$2,$3)", [ids.p1, ids.doctor, ids.s1])
        .then((r) => r.rowCount).catch(() => 0)
    );
    assert.equal(n2, 0);
  });

  it("nomor urut tidak dipakai ulang setelah pembatalan", async () => {
    await move(ids.p1, ids.a1, "cancelled", "Berhalangan");
    const a = await book(ids.p3, ids.p3, ids.s1);
    assert.equal(a.queue_number, 3);
  });

  it("transisi tidak valid ditolak dan riwayat tercatat", async () => {
    const s = await schedule(ids.doctor, 0, "00:00", "23:59", 5);
    const a = await book(ids.p1, ids.p1, s);
    await assert.rejects(move(ids.doctor, a.id, "completed"), /tidak diizinkan/);
    await assert.rejects(move(ids.doctor2, a.id, "confirmed"), /pasien Anda/);
    await move(ids.doctor, a.id, "confirmed");
    await move(ids.p1, a.id, "checked_in");
    await assert.rejects(move(ids.p1, a.id, "cancelled"), /sudah check-in/);
    await move(ids.doctor, a.id, "in_progress");
    const done = await as(ids.doctor, (c) =>
      c.query("SELECT public.transition_appointment($1,'completed',NULL,'ISPA','Istirahat 3 hari') AS r", [a.id]).then((r) => r.rows[0].r)
    );
    assert.equal(done.diagnosis, "ISPA");
    const { rows } = await pool.query(
      "SELECT old_status, new_status, changed_by FROM public.appointment_status_history WHERE appointment_id=$1 ORDER BY id", [a.id]
    );
    assert.deepEqual(rows.map((r) => r.new_status), ["pending", "confirmed", "checked_in", "in_progress", "completed"]);
    assert.equal(rows[1].changed_by, ids.doctor);
    assert.equal(rows[2].changed_by, ids.p1);
  });

  it("pembatalan pasien ditolak bila kurang dari 1 jam sebelum praktik", async () => {
    const s = await schedule(ids.doctor2, 0, "00:00", "23:59", 5);
    const a = await book(ids.p2, ids.p2, s);
    await assert.rejects(move(ids.p2, a.id, "cancelled"), /paling lambat 1 jam/);
    await move(ids.admin, a.id, "cancelled", "Dibatalkan petugas"); // admin tetap bisa
  });

  it("status tiket antrean mengikuti status appointment", async () => {
    const s = await schedule(ids.doctor2, 0, "00:00", "23:59", 5);
    const a = await book(ids.p3, ids.p3, s);
    await move(ids.admin, a.id, "checked_in");
    await pool.query(
      `INSERT INTO public.queue_tickets (appointment_id, doctor_id, patient_id, schedule_id, queue_date, queue_number, queue_code)
       VALUES ($1,$2,$3,$4,(NOW() AT TIME ZONE 'Asia/Jakarta')::date,1,'A-001')`, [a.id, ids.doctor2, ids.p3, s]
    );
    await move(ids.doctor2, a.id, "in_progress");
    let t = await pool.query("SELECT status FROM public.queue_tickets WHERE appointment_id=$1", [a.id]);
    assert.equal(t.rows[0].status, "serving");
    await move(ids.doctor2, a.id, "completed");
    t = await pool.query("SELECT status FROM public.queue_tickets WHERE appointment_id=$1", [a.id]);
    assert.equal(t.rows[0].status, "done");
    const own = await as(ids.p3, (c) => c.query("SELECT count(*)::int n FROM public.queue_tickets").then((r) => r.rows[0].n));
    assert.equal(own, 1);
    const other = await as(ids.p1, (c) => c.query("SELECT count(*)::int n FROM public.queue_tickets").then((r) => r.rows[0].n));
    assert.equal(other, 0);
    await assert.rejects(as(ids.p3, (c) => c.query("UPDATE public.queue_tickets SET status='done'")), /permission denied/);
  });

  it("10 booking bersamaan pada kapasitas 3 hanya menghasilkan 3", async () => {
    const s = await schedule(ids.doctor, 3, "08:00", "12:00", 3);
    const pts = [];
    for (let i = 0; i < 10; i++) pts.push(await newUser(`race${i}@test.id`, `Race ${i}`, "patient"));
    const res = await Promise.allSettled(pts.map((p) => book(p, p, s)));
    const ok = res.filter((r) => r.status === "fulfilled").map((r) => r.value.queue_number).sort();
    assert.deepEqual(ok, [1, 2, 3]);
    assert.ok(res.filter((r) => r.status === "rejected").every((r) => /penuh/.test(r.reason.message)));
  });

  it("statistik admin hanya untuk admin", async () => {
    const st = await as(ids.admin, (c) => c.query("SELECT public.admin_dashboard_stats() s").then((r) => r.rows[0].s));
    assert.equal(st.active_doctors, 2);
    assert.ok(st.registered_patients >= 3);
    await assert.rejects(as(ids.p1, (c) => c.query("SELECT public.admin_dashboard_stats()")), /Akses ditolak/);
  });
  it("bucket doctor-photos publik, maks 2 MB, hanya JPEG/PNG/WebP", async () => {
    const { rows } = await pool.query("SELECT public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id='doctor-photos'");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].public, true);
    assert.equal(Number(rows[0].file_size_limit), 2 * 1024 * 1024);
    assert.deepEqual(rows[0].allowed_mime_types, ["image/jpeg", "image/png", "image/webp"]);
  });

  it("hanya admin yang boleh mengatur photo_path; dokter & pasien ditolak", async () => {
    const p = `${ids.doctor}/1731050000000-a1b2.jpg`;
    await assert.rejects(
      as(ids.doctor, (c) => c.query("UPDATE public.doctor_details SET photo_path=$2 WHERE user_id=$1", [ids.doctor, p])),
      /Hanya admin/
    );
    const n = await as(ids.p1, (c) => c.query("UPDATE public.doctor_details SET photo_path=$2 WHERE user_id=$1", [ids.doctor, p]).then((r) => r.rowCount));
    assert.equal(n, 0); // RLS: pasien tidak melihat baris untuk diubah
    await as(ids.admin, (c) => c.query("UPDATE public.doctor_details SET photo_path=$2 WHERE user_id=$1", [ids.doctor, p]));
    const { rows } = await pool.query("SELECT photo_path, photo_updated_at FROM public.doctor_details WHERE user_id=$1", [ids.doctor]);
    assert.equal(rows[0].photo_path, p);
    assert.ok(rows[0].photo_updated_at);
    // dokter masih boleh mengubah bio sendiri
    await as(ids.doctor, (c) => c.query("UPDATE public.doctor_details SET bio='Bio baru' WHERE user_id=$1", [ids.doctor]));
  });

  it("photo_path harus berada di folder dokter itu sendiri dan berekstensi gambar", async () => {
    await assert.rejects(
      pool.query("UPDATE public.doctor_details SET photo_path=$2 WHERE user_id=$1", [ids.doctor, `${ids.doctor2}/x.jpg`]),
      /photo_path_check/
    );
    await assert.rejects(
      pool.query("UPDATE public.doctor_details SET photo_path=$2 WHERE user_id=$1", [ids.doctor, `${ids.doctor}/x.svg`]),
      /photo_path_check/
    );
  });

  it("Storage policy: publik bisa membaca, hanya admin bisa menulis ke doctor-photos", async () => {
    const ins = (uid) => as(uid, (c) => c.query(
      "INSERT INTO storage.objects (bucket_id, name) VALUES ('doctor-photos', $1)", [`${ids.doctor}/${uid.slice(0, 8)}.jpg`]));
    await assert.rejects(ins(ids.p1), /row-level security/);
    await assert.rejects(ins(ids.doctor), /row-level security/);
    await ins(ids.admin);
    const c = await pool.connect();
    try {
      await c.query("BEGIN; SET LOCAL ROLE anon");
      const r = await c.query("SELECT count(*)::int n FROM storage.objects WHERE bucket_id='doctor-photos'");
      assert.equal(r.rows[0].n, 1);
      const d = await c.query("DELETE FROM storage.objects WHERE bucket_id='doctor-photos'");
      assert.equal(d.rowCount, 0);
      await c.query("ROLLBACK");
    } finally { c.release(); }
    const del = await as(ids.p1, (cl) => cl.query("DELETE FROM storage.objects WHERE bucket_id='doctor-photos'").then((r) => r.rowCount));
    assert.equal(del, 0);
  });
  describe("Fitur Pesan (04_chat.sql)", () => {
    const start = (uid, kind, other = null) =>
      as(uid, (c) => c.query("SELECT public.chat_start($1,$2) AS id", [kind, other]).then((r) => r.rows[0].id));
    const send = (uid, conv, body) =>
      as(uid, (c) => c.query("SELECT (public.chat_send($1,$2)).id AS id", [conv, body]).then((r) => r.rows[0].id));
    const list = (uid) => as(uid, (c) => c.query("SELECT * FROM public.chat_list()").then((r) => r.rows));
    const history = (uid, conv, after = 0) =>
      as(uid, (c) => c.query("SELECT * FROM public.chat_history($1,$2)", [conv, after]).then((r) => r.rows));
    let p3, p4, convDoc, convAdmin;

    before(async () => {
      p3 = await newUser("chat-p3@test.id", "Pasien Tiga", "patient");
      p4 = await newUser("chat-p4@test.id", "Pasien Empat", "patient");
      const s = await schedule(ids.doctor2, 3, "09:00", "11:00", 5);
      await book(p3, p3, s);                       // p3 punya janji temu dengan doctor2
      const r4 = await book(p4, p4, s);            // p4 janji temu lalu dibatalkan
      await move(p4, r4.id, "cancelled");
    });

    it("pasien hanya bisa chat dokter yang pernah ditemui (janji temu tidak dibatalkan)", async () => {
      convDoc = await start(p3, "doctor", ids.doctor2);
      assert.ok(convDoc);
      assert.equal(await start(p3, "doctor", ids.doctor2), convDoc, "percakapan yang sama dipakai ulang");
      await assert.rejects(start(p3, "doctor", ids.doctor), /pernah membuat janji temu/);
      await assert.rejects(start(p4, "doctor", ids.doctor2), /pernah membuat janji temu/, "janji temu dibatalkan tidak dihitung");
    });

    it("dokter boleh memulai chat hanya dengan pasiennya sendiri", async () => {
      assert.equal(await start(ids.doctor2, "doctor", p3), convDoc);
      await assert.rejects(start(ids.doctor2, "doctor", p4), /pernah membuat janji temu/);
      await assert.rejects(start(ids.doctor2, "admin", p3), /tidak memakai kotak masuk admin/);
    });

    it("pesan dua arah, urut, dan hitungan belum dibaca", async () => {
      await send(p3, convDoc, "  Dok, masih pusing setelah minum obat  ");
      await send(ids.doctor2, convDoc, "Minum air yang cukup dan istirahat.");
      const h = await history(p3, convDoc);
      assert.deepEqual(h.map((m) => m.body), ["Dok, masih pusing setelah minum obat", "Minum air yang cukup dan istirahat."]);
      assert.equal(h[1].sender_role, "doctor");
      const after = await history(p3, convDoc, h[0].id);
      assert.equal(after.length, 1, "polling hanya mengambil pesan baru");
      const lp = (await list(p3)).find((c) => c.id === convDoc);
      assert.equal(lp.unread_count, 1);
      assert.equal(lp.doctor_name, "dr. Lain");
      await as(p3, (c) => c.query("SELECT public.chat_mark_read($1)", [convDoc]));
      assert.equal((await list(p3)).find((c) => c.id === convDoc).unread_count, 0);
      assert.equal(await as(ids.doctor2, (c) => c.query("SELECT public.chat_unread_total() n").then((r) => r.rows[0].n)), 0);
    });

    it("privasi: admin, dokter lain, dan pasien lain tidak bisa membaca chat dokter–pasien", async () => {
      for (const uid of [ids.admin, ids.doctor, p4]) {
        await assert.rejects(history(uid, convDoc), /tidak ditemukan/);
        await assert.rejects(send(uid, convDoc, "halo"), /tidak ditemukan/);
        assert.equal((await list(uid)).some((c) => c.id === convDoc), false);
        const direct = await as(uid, (c) => c.query("SELECT count(*)::int n FROM public.chat_messages WHERE conversation_id=$1", [convDoc]));
        assert.equal(direct.rows[0].n, 0, "RLS menyembunyikan baris");
      }
      await assert.rejects(start(ids.admin, "doctor", p3), /Admin tidak dapat/);
    });

    it("kotak masuk admin: pasien atau admin memulai, semua admin melihat, dokter tidak", async () => {
      convAdmin = await start(p4, "admin");
      assert.equal(await start(ids.admin, "admin", p4), convAdmin);
      await send(p4, convAdmin, "Dokter anak praktik hari apa?");
      const admin2 = await newUser("chat-admin2@test.id", "Admin Dua", "admin");
      assert.equal((await list(admin2)).find((c) => c.id === convAdmin).unread_count, 1);
      await send(admin2, convAdmin, "Senin dan Kamis pagi.");
      assert.equal((await list(ids.admin)).find((c) => c.id === convAdmin).unread_count, 2, "penanda baca per admin");
      await assert.rejects(history(ids.doctor2, convAdmin), /tidak ditemukan/);
      // pasien tidak bisa membuka kotak masuk admin milik pasien lain: p_other diabaikan → tetap percakapannya sendiri
      assert.equal(await start(p4, "admin", p3), convAdmin);
    });

    it("tulis langsung ke tabel ditolak; isi pesan divalidasi", async () => {
      await assert.rejects(
        as(p3, (c) => c.query("INSERT INTO public.chat_messages (conversation_id, sender_id, body) VALUES ($1,$2,'x')", [convDoc, p3])),
        /permission denied|row-level security/
      );
      await assert.rejects(
        as(p3, (c) => c.query("INSERT INTO public.chat_conversations (kind, patient_id) VALUES ('admin',$1)", [p3])),
        /permission denied|row-level security/
      );
      await assert.rejects(send(p3, convDoc, "   "), /tidak boleh kosong/);
      await assert.rejects(send(p3, convDoc, "x".repeat(2001)), /maksimal 2000/);
      await assert.rejects(as(null, (c) => c.query("SET LOCAL ROLE anon").then(() => c.query("SELECT public.chat_list()"))), /permission denied/);
    });

    it("tabel lama tidak berubah: alur booking tetap jalan setelah migrasi 04", async () => {
      const s2 = await schedule(ids.doctor2, 4, "13:00", "14:00", 2);
      const r = await book(p4, p4, s2);
      assert.ok(r);
    });
  });
});
