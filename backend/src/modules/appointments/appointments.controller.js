import * as svc from "./appointments.service.js";

const ok = (res, data, message, status = 200) => res.status(status).json({ success: true, ...(message && { message }), data });

export async function createAppointment(req, res, next) {
  try {
    ok(res, await svc.createAppointment(req.body, req.user, req.supabase),
      "Janji temu berhasil dibuat. Menunggu konfirmasi klinik.", 201);
  } catch (err) { next(err); }
}

export async function getMyAppointments(req, res, next) {
  try { ok(res, await svc.getMyAppointments(req.user.id, req.supabase)); } catch (err) { next(err); }
}

export async function getAllAppointments(req, res, next) {
  try { ok(res, await svc.getAllAppointments(req.profile, req.supabase, req.query)); } catch (err) { next(err); }
}

export async function getAppointmentById(req, res, next) {
  try { ok(res, await svc.getAppointmentById(req.params.id, req.profile, req.supabase)); } catch (err) { next(err); }
}

export async function cancelAppointment(req, res, next) {
  try {
    const r = await svc.cancelAppointment(req.params.id, req.profile, req.supabase, req.body?.reason);
    ok(res, r.appointment, r.message);
  } catch (err) { next(err); }
}

const STATUS_MESSAGES = {
  confirmed: "Janji temu dikonfirmasi.",
  checked_in: "Check-in berhasil.",
  in_progress: "Pemeriksaan dimulai.",
  completed: "Konsultasi selesai.",
  cancelled: "Janji temu dibatalkan.",
};

export async function updateAppointmentStatus(req, res, next) {
  try {
    const { status, ...extra } = req.body;
    ok(res, await svc.updateAppointmentStatus(req.params.id, status, req.profile, req.supabase, extra),
      STATUS_MESSAGES[status] || "Status janji temu berhasil diperbarui.");
  } catch (err) { next(err); }
}

export async function checkIn(req, res, next) {
  try {
    const r = await svc.checkIn(req.params.id, req.profile, req.supabase);
    ok(res, r.appointment, `Check-in berhasil. Nomor antrean: ${r.ticket.queue_code}.`);
  } catch (err) { next(err); }
}
