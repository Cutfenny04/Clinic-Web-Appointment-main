import { getPool, withTransaction } from "../db/pool.js";
import { todayJakarta } from "../config/index.js";

/**
 * QueueService — penyimpanan PERSISTEN di PostgreSQL (tabel public.queue_tickets).
 * Skema dibuat oleh backend/sql/02_security_status_queue.sql.
 *
 * Jaminan:
 *  - Satu appointment = satu tiket (UNIQUE appointment_id + advisory lock → idempotent)
 *  - Nomor unik per dokter & tanggal (queue_counters + UNIQUE(doctor_id, queue_date, queue_number))
 *  - Status tiket serving/done selalu sinkron dengan status appointment (satu transaksi)
 */

const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const TICKET_COLUMNS = `
  t.id, t.appointment_id, t.doctor_id, t.patient_id, t.schedule_id,
  to_char(t.queue_date, 'YYYY-MM-DD') AS date, t.queue_number, t.queue_code, t.status,
  t.called_at, t.serving_at, t.finished_at, t.created_at, t.updated_at,
  dp.full_name AS doctor_name, pp.full_name AS patient_name,
  dd.specialty AS doctor_specialty`;
const TICKET_FROM = `
  FROM public.queue_tickets t
  LEFT JOIN public.profiles dp ON dp.id = t.doctor_id
  LEFT JOIN public.profiles pp ON pp.id = t.patient_id
  LEFT JOIN public.doctor_details dd ON dd.user_id = t.doctor_id`;

// Transisi status tiket yang diizinkan
const TICKET_TRANSITIONS = {
  waiting: ["calling", "skipped", "cancelled"],
  calling: ["serving", "skipped", "waiting", "cancelled"],
  skipped: ["waiting", "cancelled"],
  serving: ["done"],
  done: [],
  cancelled: [],
};

async function findTicket(client, where, params) {
  const { rows } = await client.query(`SELECT ${TICKET_COLUMNS} ${TICKET_FROM} WHERE ${where}`, params);
  return rows[0] || null;
}

function mapDbError(e) {
  if (e.statusCode) return e;
  if (e.code === "P0020" || e.code === "P0022") return fail(409, e.message);
  if (e.code === "22P02") return fail(400, "Format ID tidak valid.");
  return e;
}

class QueueService {
  /** Buat tiket untuk appointment yang sudah check-in. Idempotent. */
  async generateTicket({ appointment_id }, actorId = null) {
    try {
      return await withTransaction(async (c) => {
        // Serialisasi permintaan untuk appointment yang sama
        await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [appointment_id]);

        const existing = await findTicket(c, "t.appointment_id = $1", [appointment_id]);
        if (existing) return { ticket: existing, is_duplicate: true };

        const { rows } = await c.query(
          `SELECT a.id, a.status, a.doctor_id, a.patient_id, a.schedule_id, s.schedule_date
             FROM public.appointments a JOIN public.doctor_schedules s ON s.id = a.schedule_id
            WHERE a.id = $1 FOR UPDATE OF a`,
          [appointment_id]
        );
        const appt = rows[0];
        if (!appt) throw fail(404, "Janji temu tidak ditemukan.");
        if (appt.status !== "checked_in") {
          throw fail(409, "Nomor antrean hanya dibuat untuk pasien yang sudah check-in.");
        }

        // Nomor berikutnya: counter per dokter+tanggal (baris counter terkunci selama transaksi)
        const counter = await c.query(
          `INSERT INTO public.queue_counters (doctor_id, queue_date, last_number)
           VALUES ($1, $2, (SELECT COALESCE(MAX(queue_number), 0) + 1 FROM public.queue_tickets
                            WHERE doctor_id = $1 AND queue_date = $2))
           ON CONFLICT (doctor_id, queue_date)
           DO UPDATE SET last_number = public.queue_counters.last_number + 1
           RETURNING last_number`,
          [appt.doctor_id, appt.schedule_date]
        );
        const number = counter.rows[0].last_number;
        const code = `A-${String(number).padStart(3, "0")}`;

        const ins = await c.query(
          `INSERT INTO public.queue_tickets
             (appointment_id, doctor_id, patient_id, schedule_id, queue_date, queue_number, queue_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [appt.id, appt.doctor_id, appt.patient_id, appt.schedule_id, appt.schedule_date, number, code]
        );
        const ticket = await findTicket(c, "t.id = $1", [ins.rows[0].id]);
        return { ticket, is_duplicate: false };
      }, actorId);
    } catch (e) {
      // Balapan langka antar-instance: kembalikan tiket yang sudah dibuat proses lain
      if (e.code === "23505" && String(e.constraint).includes("appointment")) {
        const t = await findTicket(getPool(), "t.appointment_id = $1", [appointment_id]);
        if (t) return { ticket: t, is_duplicate: true };
      }
      throw mapDbError(e);
    }
  }

  async getQueues({ doctor_id, date, status, patient_id, appointment_id } = {}) {
    const where = [];
    const params = [];
    const add = (sql, v) => { params.push(v); where.push(sql.replace("?", `$${params.length}`)); };
    if (doctor_id) add("t.doctor_id = ?", doctor_id);
    if (patient_id) add("t.patient_id = ?", patient_id);
    if (appointment_id) add("t.appointment_id = ?", appointment_id);
    if (date) add("t.queue_date = ?", date);
    if (status) add("t.status = ANY(?)", String(status).split(","));
    try {
      const { rows } = await getPool().query(
        `SELECT ${TICKET_COLUMNS} ${TICKET_FROM} ${where.length ? "WHERE " + where.join(" AND ") : ""}
         ORDER BY t.queue_date, t.doctor_id, t.queue_number`,
        params
      );
      return rows;
    } catch (e) {
      throw mapDbError(e);
    }
  }

  async getCurrentServing(doctorId, date = todayJakarta()) {
    try {
      return await findTicket(
        getPool(),
        `t.doctor_id = $1 AND t.queue_date = $2 AND t.status IN ('calling','serving')
         ORDER BY (t.status = 'serving') DESC, t.called_at DESC LIMIT 1`,
        [doctorId, date]
      );
    } catch (e) {
      throw mapDbError(e);
    }
  }

  /**
   * Panggil pasien berikutnya.
   * - Ditolak bila masih ada pasien yang sedang diperiksa (serving).
   * - Pasien yang dipanggil tapi tidak hadir (calling) ditandai 'skipped'.
   */
  async callNext(doctorId, date = todayJakarta(), actorId = null) {
    try {
      return await withTransaction(async (c) => {
        await c.query("SELECT pg_advisory_xact_lock(hashtext($1 || $2))", [doctorId, date]);
        const serving = await c.query(
          "SELECT 1 FROM public.queue_tickets WHERE doctor_id=$1 AND queue_date=$2 AND status='serving'",
          [doctorId, date]
        );
        if (serving.rowCount) throw fail(409, "Selesaikan pemeriksaan pasien saat ini sebelum memanggil berikutnya.");

        await c.query(
          `UPDATE public.queue_tickets SET status='skipped', updated_at=NOW()
            WHERE doctor_id=$1 AND queue_date=$2 AND status='calling'`,
          [doctorId, date]
        );
        const next = await c.query(
          `UPDATE public.queue_tickets SET status='calling', called_at=NOW(), updated_at=NOW()
            WHERE id = (SELECT id FROM public.queue_tickets
                         WHERE doctor_id=$1 AND queue_date=$2 AND status='waiting'
                         ORDER BY queue_number LIMIT 1 FOR UPDATE SKIP LOCKED)
            RETURNING id`,
          [doctorId, date]
        );
        if (!next.rowCount) return null;
        return findTicket(c, "t.id = $1", [next.rows[0].id]);
      }, actorId);
    } catch (e) {
      throw mapDbError(e);
    }
  }

  async updateTicketStatus(ticketId, newStatus, actorId = null) {
    if (!TICKET_TRANSITIONS[newStatus]) {
      throw fail(400, `Status tidak valid. Harus salah satu dari: ${Object.keys(TICKET_TRANSITIONS).join(", ")}`);
    }
    try {
      return await withTransaction(async (c) => {
        const { rows } = await c.query("SELECT * FROM public.queue_tickets WHERE id=$1 FOR UPDATE", [ticketId]);
        const t = rows[0];
        if (!t) throw fail(404, "Tiket antrean tidak ditemukan.");
        if (t.status === newStatus) return findTicket(c, "t.id = $1", [ticketId]);
        if (!TICKET_TRANSITIONS[t.status].includes(newStatus)) {
          throw fail(409, `Status antrean tidak dapat diubah dari ${t.status} ke ${newStatus}.`);
        }
        if (newStatus === "serving") {
          const other = await c.query(
            "SELECT 1 FROM public.queue_tickets WHERE doctor_id=$1 AND queue_date=$2 AND status='serving' AND id<>$3",
            [t.doctor_id, t.queue_date, t.id]
          );
          if (other.rowCount) throw fail(409, "Masih ada pasien lain yang sedang diperiksa.");
        }
        await c.query(
          `UPDATE public.queue_tickets SET status=$2, updated_at=NOW(),
             called_at   = CASE WHEN $2 IN ('calling','serving') THEN COALESCE(called_at, NOW()) ELSE called_at END,
             serving_at  = CASE WHEN $2 = 'serving' THEN NOW() ELSE serving_at END,
             finished_at = CASE WHEN $2 IN ('done','cancelled') THEN NOW() ELSE finished_at END
           WHERE id=$1`,
          [ticketId, newStatus]
        );
        // Jaga konsistensi dengan appointment (trigger DB memvalidasi transisi & mencatat riwayat)
        const apptStatus = { serving: "in_progress", done: "completed" }[newStatus];
        if (apptStatus) {
          await c.query(
            "UPDATE public.appointments SET status=$2 WHERE id=$1 AND status IS DISTINCT FROM $2",
            [t.appointment_id, apptStatus]
          );
        }
        return findTicket(c, "t.id = $1", [ticketId]);
      }, actorId);
    } catch (e) {
      throw mapDbError(e);
    }
  }

  async getStats(date = todayJakarta(), doctorId = null) {
    try {
      const { rows } = await getPool().query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status='waiting')::int AS waiting,
                COUNT(*) FILTER (WHERE status='calling')::int AS calling,
                COUNT(*) FILTER (WHERE status='serving')::int AS serving,
                COUNT(*) FILTER (WHERE status='done')::int AS done,
                COUNT(*) FILTER (WHERE status='skipped')::int AS skipped,
                COUNT(*) FILTER (WHERE status='cancelled')::int AS cancelled
           FROM public.queue_tickets WHERE queue_date=$1 AND ($2::uuid IS NULL OR doctor_id=$2)`,
        [date, doctorId]
      );
      return { date, ...rows[0] };
    } catch (e) {
      throw mapDbError(e);
    }
  }

  /** Data layar TV: tanpa nama lengkap pasien (privasi), dikelompokkan per dokter. */
  async getDisplay(date = todayJakarta()) {
    const tickets = await this.getQueues({ date });
    const byDoctor = new Map();
    for (const t of tickets) {
      if (!byDoctor.has(t.doctor_id)) {
        byDoctor.set(t.doctor_id, {
          doctor_id: t.doctor_id, doctor_name: t.doctor_name, doctor_specialty: t.doctor_specialty,
          current: null, waiting: [], done_count: 0,
        });
      }
      const g = byDoctor.get(t.doctor_id);
      const pub = {
        id: t.id, queue_code: t.queue_code, queue_number: t.queue_number, status: t.status,
        patient_initials: initials(t.patient_name), called_at: t.called_at,
      };
      if (t.status === "serving" || t.status === "calling") {
        if (!g.current || t.status === "serving") g.current = pub;
      } else if (t.status === "waiting") g.waiting.push(pub);
      else if (t.status === "done") g.done_count += 1;
    }
    return { date, doctors: [...byDoctor.values()] };
  }
}

function initials(name = "") {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase() + ".").join(" ") || "-";
}

export const queueService = new QueueService();
