import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { internalAuth } from "../middleware/internalAuth.js";
import {
  getHealth, createTicket, getQueues, getCurrentServing, callNext, updateStatus, getStats, getDisplay,
} from "../controllers/queue.controller.js";

const router = Router();
const uuid = (label) => z.string({ required_error: `${label} wajib diisi.` }).uuid(`${label} tidak valid.`);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD.");

// Kontrak tetap kompatibel dengan versi sebelumnya: field lain boleh dikirim,
// tetapi dokter/pasien/tanggal diambil dari database (bukan dari pemanggil).
const createTicketSchema = z.object({
  appointment_id: uuid("appointment_id"),
  doctor_id: z.string().optional(),
  doctor_name: z.string().optional(),
  patient_id: z.string().optional(),
  patient_name: z.string().optional(),
  schedule_id: z.string().optional(),
  date: date.optional(),
});
const callSchema = z.object({ doctor_id: uuid("doctor_id"), date: date.optional() });
const updateStatusSchema = z.object({
  status: z.enum(["waiting", "calling", "serving", "done", "skipped", "cancelled"], {
    errorMap: () => ({ message: "Status tidak valid. Harus: waiting, calling, serving, done, skipped, atau cancelled." }),
  }),
});

router.get("/health", getHealth);

// Semua endpoint data wajib token internal
router.use(internalAuth);
router.post("/ticket", validate(createTicketSchema), createTicket);
router.get("/", getQueues);
router.get("/stats", getStats);
router.get("/display", getDisplay);
router.get("/current/:doctorId", getCurrentServing);
router.post("/call", validate(callSchema), callNext);
router.patch("/:ticketId/status", validate(updateStatusSchema), updateStatus);

export default router;
