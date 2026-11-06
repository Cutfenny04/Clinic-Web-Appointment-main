import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
} from "./appointments.validation.js";
import {
  createAppointment,
  getMyAppointments,
  getAllAppointments,
  getAppointmentById,
  cancelAppointment,
  updateAppointmentStatus,
} from "./appointments.controller.js";

const router = Router();

/**
 * POST /api/v1/appointments
 * Pasien membuat janji temu baru
 */
router.post(
  "/",
  authenticate,
  authorize("patient"),
  validate(createAppointmentSchema),
  createAppointment
);

/**
 * GET /api/v1/appointments/mine
 * Pasien melihat seluruh janji temu miliknya
 * (Harus sebelum /:id agar "mine" tidak diproses sebagai ID)
 */
router.get(
  "/mine",
  authenticate,
  authorize("patient"),
  getMyAppointments
);

/**
 * GET /api/v1/appointments
 * Admin & Dokter melihat janji temu
 */
router.get(
  "/",
  authenticate,
  authorize("admin", "doctor"),
  getAllAppointments
);

/**
 * GET /api/v1/appointments/:id
 * Pasien/Dokter bersangkutan atau Admin
 */
router.get(
  "/:id",
  authenticate,
  getAppointmentById
);

/**
 * PATCH /api/v1/appointments/:id/cancel
 * Pasien membatalkan janji temu
 */
router.patch(
  "/:id/cancel",
  authenticate,
  authorize("patient", "admin"),
  cancelAppointment
);

/**
 * PATCH /api/v1/appointments/:id/status
 * Dokter atau Admin memperbarui status pemeriksaan
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize("admin", "doctor"),
  validate(updateAppointmentStatusSchema),
  updateAppointmentStatus
);

export default router;
