import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { validate } from "../../middleware/validate.js";
import { createScheduleSchema, updateScheduleSchema } from "./schedules.validation.js";
import {
  getSchedules,
  getDoctorSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "./schedules.controller.js";

const router = Router();

/**
 * GET /api/v1/schedules
 * Publik — melihat seluruh jadwal praktik dokter
 */
router.get("/", optionalAuth, getSchedules);

/**
 * GET /api/v1/schedules/doctor/:doctorId
 * Publik — melihat jadwal praktik dokter tertentu
 */
router.get("/doctor/:doctorId", optionalAuth, getDoctorSchedules);

/**
 * POST /api/v1/schedules
 * Admin atau Dokter
 */
router.post(
  "/",
  authenticate,
  authorize("admin", "doctor"),
  validate(createScheduleSchema),
  createSchedule
);

/**
 * PUT /api/v1/schedules/:id
 * Admin atau Dokter pemilik jadwal
 */
router.put(
  "/:id",
  authenticate,
  authorize("admin", "doctor"),
  validate(updateScheduleSchema),
  updateSchedule
);

/**
 * DELETE /api/v1/schedules/:id
 * Admin atau Dokter pemilik jadwal
 */
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "doctor"),
  deleteSchedule
);

export default router;
