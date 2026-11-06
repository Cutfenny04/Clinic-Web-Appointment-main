import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import {
  getHealth,
  createTicket,
  getQueues,
  getCurrentServing,
  callNext,
  updateStatus,
  getStats,
} from "../controllers/queue.controller.js";

const router = Router();

const createTicketSchema = z.object({
  appointment_id: z.string().optional(),
  doctor_id: z.string({ required_error: "doctor_id wajib diisi." }),
  doctor_name: z.string().optional(),
  patient_id: z.string({ required_error: "patient_id wajib diisi." }),
  patient_name: z.string().optional(),
  schedule_id: z.string({ required_error: "schedule_id wajib diisi." }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["waiting", "calling", "serving", "done", "skipped"], {
    errorMap: () => ({
      message:
        "Status tidak valid. Harus: waiting, calling, serving, done, atau skipped.",
    }),
  }),
});

// Health check
router.get("/health", getHealth);

// Ticket creation (idempotent)
router.post("/ticket", validate(createTicketSchema), createTicket);

// List queues
router.get("/", getQueues);

// Statistics
router.get("/stats", getStats);

// Current serving patient for a doctor
router.get("/current/:doctorId", getCurrentServing);

// Call next patient
router.post("/call", callNext);

// Update queue status
router.patch("/:ticketId/status", validate(updateStatusSchema), updateStatus);

export default router;
