import { ApiError } from "../../utils/ApiError.js";
import { toApiError } from "../../utils/dbError.js";
import { queueClient } from "../../services/queueClient.js";

/**
 * AppointmentService
 * - Booking HANYA melalui RPC book_appointment_atomic (kunci baris jadwal di PostgreSQL).
 *   Tidak ada jalur cadangan non-atomik.
 * - Semua perubahan status melalui RPC transition_appointment (otorisasi per role +
 *   validasi transisi + riwayat status di database).
 */

const APPT_COLUMNS =
  "id, patient_id, doctor_id, schedule_id, status, complaint, queue_number, diagnosis, consultation_notes, " +
  "cancel_reason, confirmed_at, checked_in_at, started_at, completed_at, cancelled_at, created_at, updated_at";

export async function enrichAppointments(client, appts) {
  if (!appts || appts.length === 0) return [];
  const uniq = (k) => [...new Set(appts.map((a) => a[k]).filter(Boolean))];
  const profileIds = [...new Set([...uniq("doctor_id"), ...uniq("patient_id")])];
  const scheduleIds = uniq("schedule_id");
  const apptIds = appts.map((a) => a.id);

  const [profs, details, scheds, tickets] = await Promise.all([
    client.from("profiles").select("id, full_name, email, phone").in("id", profileIds),
    client.from("doctor_details").select("user_id, specialty").in("user_id", uniq("doctor_id")),
    client.from("doctor_schedules").select("id, schedule_date, start_time, end_time").in("id", scheduleIds),
    client.from("queue_tickets").select("id, appointment_id, queue_code, queue_number, status, called_at").in("appointment_id", apptIds),
  ]);

  const byId = (rows, key = "id") => Object.fromEntries((rows || []).map((r) => [r[key], r]));
  const P = byId(profs.data);
  const D = byId(details.data, "user_id");
  const S = byId(scheds.data);
  const T = byId(tickets.data, "appointment_id");

  return appts.map((a) => ({
    ...a,
    patient_name: P[a.patient_id]?.full_name || "Pasien",
    patient_email: P[a.patient_id]?.email || null,
    patient_phone: P[a.patient_id]?.phone || null,
    doctor_name: P[a.doctor_id]?.full_name || "Dokter",
    doctor_specialty: D[a.doctor_id]?.specialty || null,
    schedule_date: S[a.schedule_id]?.schedule_date || null,
    start_time: S[a.schedule_id]?.start_time || null,
    end_time: S[a.schedule_id]?.end_time || null,
    queue_ticket: T[a.id] || null,
  }));
}

async function loadOne(client, id) {
  const { data, error } = await client.from("appointments").select(APPT_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw toApiError(error, "Gagal memuat janji temu.");
  if (!data) throw ApiError.notFound("Janji temu tidak ditemukan.");
  return (await enrichAppointments(client, [data]))[0];
}

export async function createAppointment({ schedule_id, complaint }, user, client) {
  const { data, error } = await client.rpc("book_appointment_atomic", {
    p_patient_id: user.id,
    p_schedule_id: schedule_id,
    p_complaint: complaint || null,
  });
  if (error) {
    if (error.code === "PGRST202") {
      throw new ApiError(503, "Fungsi booking belum terpasang di database. Jalankan migrasi SQL terbaru.");
    }
    throw toApiError(error, "Gagal membuat janji temu.");
  }
  return loadOne(client, data.id);
}

export async function getMyAppointments(patientId, client) {
  const { data, error } = await client
    .from("appointments")
    .select(APPT_COLUMNS)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw toApiError(error, "Gagal memuat janji temu.");
  return enrichAppointments(client, data || []);
}

/**
 * Admin: semua janji temu. Dokter: hanya miliknya (dipaksa di sini DAN oleh RLS).
 * Filter: status (boleh dipisah koma), date (YYYY-MM-DD), from/to, doctor_id (admin), patient_id, schedule_id
 */
export async function getAllAppointments(userProfile, client, query = {}) {
  let q = client.from("appointments").select(APPT_COLUMNS).order("created_at", { ascending: false });

  if (userProfile.role === "doctor") q = q.eq("doctor_id", userProfile.id);
  else if (query.doctor_id) q = q.eq("doctor_id", query.doctor_id);
  if (query.patient_id) q = q.eq("patient_id", query.patient_id);
  if (query.schedule_id) q = q.eq("schedule_id", query.schedule_id);
  if (query.status) q = q.in("status", String(query.status).split(","));

  if (query.date || query.from || query.to) {
    let sq = client.from("doctor_schedules").select("id");
    if (query.date) sq = sq.eq("schedule_date", query.date);
    if (query.from) sq = sq.gte("schedule_date", query.from);
    if (query.to) sq = sq.lte("schedule_date", query.to);
    if (userProfile.role === "doctor") sq = sq.eq("doctor_id", userProfile.id);
    const { data: sIds, error: sErr } = await sq;
    if (sErr) throw toApiError(sErr, "Gagal memuat jadwal.");
    if (!sIds?.length) return [];
    q = q.in("schedule_id", sIds.map((s) => s.id));
  }

  const { data, error } = await q;
  if (error) throw toApiError(error, "Gagal memuat daftar janji temu.");
  return enrichAppointments(client, data || []);
}

export async function getAppointmentById(appointmentId, userProfile, client) {
  // RLS hanya mengembalikan baris milik pasien/dokter terkait atau admin
  const appt = await loadOne(client, appointmentId);
  const allowed =
    userProfile.role === "admin" || appt.patient_id === userProfile.id || appt.doctor_id === userProfile.id;
  if (!allowed) throw ApiError.forbidden("Anda tidak memiliki akses ke data janji temu ini.");

  const { data: history } = await client
    .from("appointment_status_history")
    .select("id, old_status, new_status, changed_by, note, created_at")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: true });
  return { ...appt, status_history: history || [] };
}

export async function transition(appointmentId, status, client, extra = {}) {
  const { data, error } = await client.rpc("transition_appointment", {
    p_appointment_id: appointmentId,
    p_new_status: status,
    p_note: extra.note || null,
    p_diagnosis: extra.diagnosis || null,
    p_consultation_notes: extra.consultation_notes || null,
  });
  if (error) throw toApiError(error, "Gagal mengubah status janji temu.");
  return loadOne(client, data.id);
}

export async function cancelAppointment(appointmentId, userProfile, client, reason) {
  const appointment = await transition(appointmentId, "cancelled", client, { note: reason });
  return { message: "Janji temu berhasil dibatalkan.", appointment };
}

export async function updateAppointmentStatus(appointmentId, newStatus, userProfile, client, extra = {}) {
  if (newStatus === "checked_in") {
    return (await checkIn(appointmentId, userProfile, client)).appointment;
  }
  return transition(appointmentId, newStatus, client, extra);
}

/**
 * Check-in → buat nomor antrean (idempotent di kedua sisi).
 * Jika queue service gagal, status check-in tetap tercatat dan permintaan dapat diulang
 * tanpa menghasilkan tiket ganda.
 */
export async function checkIn(appointmentId, userProfile, client) {
  const current = await loadOne(client, appointmentId);
  const appointment = current.status === "checked_in" ? current : await transition(appointmentId, "checked_in", client);
  try {
    const ticket = await queueClient.createTicket(appointmentId, userProfile.id);
    return { appointment: { ...appointment, queue_ticket: ticket }, ticket };
  } catch (e) {
    throw new ApiError(
      e.statusCode === 409 ? 409 : 502,
      `Check-in berhasil dicatat, tetapi nomor antrean belum dapat dibuat: ${e.message} Silakan ulangi check-in.`
    );
  }
}
