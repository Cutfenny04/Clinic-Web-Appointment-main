import { z } from "zod";

export const createScheduleSchema = z.object({
  doctor_id: z.string().uuid().optional(),
  schedule_date: z
    .string({ required_error: "Tanggal praktik wajib diisi." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD."),
  start_time: z
    .string({ required_error: "Jam mulai wajib diisi." })
    .regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, "Format jam mulai harus HH:MM atau HH:MM:SS."),
  end_time: z
    .string({ required_error: "Jam selesai wajib diisi." })
    .regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, "Format jam selesai harus HH:MM atau HH:MM:SS."),
  capacity: z.coerce.number().int().min(1, "Kapasitas minimal 1 pasien.").default(10),
  is_active: z.boolean().optional().default(true),
});

export const updateScheduleSchema = z.object({
  schedule_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/).optional(),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/).optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  is_active: z.boolean().optional(),
});
