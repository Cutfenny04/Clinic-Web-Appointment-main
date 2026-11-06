import { z } from "zod";

export const createAppointmentSchema = z.object({
  schedule_id: z.string().uuid("schedule_id harus berupa UUID yang valid."),
  complaint: z.string().max(1000, "Keluhan maksimal 1000 karakter.").optional().or(z.literal("")),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"], {
    errorMap: () => ({ message: "Status tidak valid. Harus pending, confirmed, in_progress, completed, atau cancelled." }),
  }),
});
