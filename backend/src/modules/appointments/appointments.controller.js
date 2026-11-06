import * as appointmentService from "./appointments.service.js";

export async function createAppointment(req, res, next) {
  try {
    const appointment = await appointmentService.createAppointment(
      req.body,
      req.user,
      req.supabase
    );
    res.status(201).json({
      success: true,
      message: "Janji temu berhasil dibuat.",
      data: appointment,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyAppointments(req, res, next) {
  try {
    const appointments = await appointmentService.getMyAppointments(
      req.user.id,
      req.supabase
    );
    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAllAppointments(req, res, next) {
  try {
    const appointments = await appointmentService.getAllAppointments(
      req.profile,
      req.supabase,
      req.query
    );
    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAppointmentById(req, res, next) {
  try {
    const appointment = await appointmentService.getAppointmentById(
      req.params.id,
      req.profile,
      req.supabase
    );
    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelAppointment(req, res, next) {
  try {
    const result = await appointmentService.cancelAppointment(
      req.params.id,
      req.profile,
      req.supabase
    );
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.appointment,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAppointmentStatus(req, res, next) {
  try {
    const updated = await appointmentService.updateAppointmentStatus(
      req.params.id,
      req.body.status,
      req.profile,
      req.supabase
    );
    res.status(200).json({
      success: true,
      message: "Status janji temu berhasil diperbarui.",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}
