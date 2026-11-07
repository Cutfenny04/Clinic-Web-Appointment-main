import { z } from "zod";

export const createAppointmentSchema = z.object({
  schedule_id: z.string({ required_error: "Jadwal wajib dipilih." }).uuid("Jadwal tidak valid."),
  complaint: z.string().max(1000, "Keluhan maksimal 1000 karakter.").optional().or(z.literal("")),
});

export const STATUS_VALUES = ["confirmed", "checked_in", "in_progress", "completed", "cancelled"];

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(STATUS_VALUES, {
    errorMap: () => ({ message: "Status tidak valid." }),
  }),
  note: z.string().max(500, "Catatan maksimal 500 karakter.").optional(),
  diagnosis: z.string().max(500, "Diagnosis maksimal 500 karakter.").optional(),
  consultation_notes: z.string().max(4000, "Catatan konsultasi maksimal 4000 karakter.").optional(),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().max(500, "Alasan maksimal 500 karakter.").optional(),
});
