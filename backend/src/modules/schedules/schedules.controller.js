import * as scheduleService from "./schedules.service.js";

export async function getSchedules(req, res, next) {
  try {
    const schedules = await scheduleService.getSchedulesList(req.supabase, req.query, req.profile);
    res.status(200).json({
      success: true,
      data: schedules,
    });
  } catch (err) {
    next(err);
  }
}

export async function getDoctorSchedules(req, res, next) {
  try {
    const schedules = await scheduleService.getSchedulesByDoctor(req.params.id || req.params.doctorId, req.supabase);
    res.status(200).json({
      success: true,
      data: schedules,
    });
  } catch (err) {
    next(err);
  }
}

export async function createSchedule(req, res, next) {
  try {
    const schedule = await scheduleService.createSchedule(req.body, req.profile, req.supabase);
    res.status(201).json({
      success: true,
      message: "Jadwal dokter berhasil dibuat.",
      data: schedule,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateSchedule(req, res, next) {
  try {
    const schedule = await scheduleService.updateSchedule(req.params.id, req.body, req.profile, req.supabase);
    res.status(200).json({
      success: true,
      message: "Jadwal dokter berhasil diperbarui.",
      data: schedule,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteSchedule(req, res, next) {
  try {
    const result = await scheduleService.deleteSchedule(req.params.id, req.profile, req.supabase);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
}
