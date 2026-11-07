import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { createAppointmentSchema, updateAppointmentStatusSchema, cancelAppointmentSchema } from "./appointments.validation.js";
import {
  createAppointment, getMyAppointments, getAllAppointments, getAppointmentById,
  cancelAppointment, updateAppointmentStatus, checkIn,
} from "./appointments.controller.js";

const router = Router();
router.use(authenticate);

// Pasien membuat janji temu (atomik di database)
router.post("/", authorize("patient"), validate(createAppointmentSchema), createAppointment);
// Janji temu milik pasien yang login
router.get("/mine", authorize("patient"), getMyAppointments);
// Admin: semua; dokter: hanya miliknya
router.get("/", authorize("admin", "doctor"), getAllAppointments);
// Detail + riwayat status (pasien/dokter terkait atau admin)
router.get("/:id", getAppointmentById);
// Pembatalan (pasien sesuai aturan, dokter miliknya, admin)
router.patch("/:id/cancel", authorize("patient", "doctor", "admin"), validate(cancelAppointmentSchema), cancelAppointment);
// Check-in + pembuatan nomor antrean (petugas/admin atau pasien di hari praktik)
router.post("/:id/check-in", authorize("admin", "patient"), checkIn);
// Perubahan status (otorisasi detail di database)
router.patch("/:id/status", authorize("admin", "doctor"), validate(updateAppointmentStatusSchema), updateAppointmentStatus);

export default router;
