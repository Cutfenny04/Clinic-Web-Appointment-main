import express, { Router } from "express";
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
  uploadPhoto,
  deletePhoto,
} from "./doctors.controller.js";
import { MAX_PHOTO_BYTES } from "../../services/storage/doctorPhotoStorage.js";
import { ApiError } from "../../utils/ApiError.js";
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

/**
 * PUT /api/v1/doctors/:id/photo
 * Admin only — unggah/ganti foto. Body = isi file mentah, Content-Type = image/jpeg|png|webp (maks 2 MB)
 */
const rawPhoto = express.raw({ type: () => true, limit: MAX_PHOTO_BYTES });
function photoBody(req, res, next) {
  rawPhoto(req, res, (err) => {
    if (err?.type === "entity.too.large") return next(new ApiError(413, "Ukuran foto maksimal 2 MB."));
    if (err) return next(ApiError.badRequest("File foto tidak dapat dibaca."));
    next();
  });
}
router.put("/:id/photo", authenticate, authorize("admin"), photoBody, uploadPhoto);

/**
 * DELETE /api/v1/doctors/:id/photo
 * Admin only — hapus foto dokter
 */
router.delete("/:id/photo", authenticate, authorize("admin"), deletePhoto);

export default router;
