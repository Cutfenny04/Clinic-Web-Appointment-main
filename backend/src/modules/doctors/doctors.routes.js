import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { validate } from "../../middleware/validate.js";
import { createDoctorSchema, updateDoctorSchema } from "./doctors.validation.js";
import {
  getDoctors,
  getDoctor,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from "./doctors.controller.js";
import { getDoctorSchedules } from "../schedules/schedules.controller.js";

const router = Router();

/**
 * GET /api/v1/doctors
 * Publik — pasien atau pengunjung bisa melihat daftar dokter
 */
router.get("/", optionalAuth, getDoctors);

/**
 * GET /api/v1/doctors/:id
 * Publik — melihat profil dokter
 */
router.get("/:id", optionalAuth, getDoctor);

/**
 * GET /api/v1/doctors/:id/schedules
 * Publik — melihat jadwal spesifik seorang dokter
 */
router.get("/:id/schedules", optionalAuth, getDoctorSchedules);

/**
 * POST /api/v1/doctors
 * Admin only — menetapkan dokter baru
 */
router.post(
  "/",
  authenticate,
  authorize("admin"),
  validate(createDoctorSchema),
  createDoctor
);

/**
 * PUT /api/v1/doctors/:id
 * Admin atau dokter itu sendiri
 */
router.put(
  "/:id",
  authenticate,
  authorize("admin", "doctor"),
  validate(updateDoctorSchema),
  updateDoctor
);

/**
 * DELETE /api/v1/doctors/:id
 * Admin only — mencabut status dokter
 */
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deleteDoctor
);

export default router;
