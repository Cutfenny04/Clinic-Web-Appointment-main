import { z } from "zod";

export const createDoctorSchema = z.object({
  user_id: z.string().uuid("user_id harus berformat UUID yang valid."),
  specialty: z
    .string({ required_error: "Spesialisasi dokter wajib diisi." })
    .min(2, "Spesialisasi minimal 2 karakter.")
    .max(100, "Spesialisasi maksimal 100 karakter.")
    .trim(),
  bio: z.string().max(1000, "Bio maksimal 1000 karakter.").optional().or(z.literal("")),
  experience_years: z.coerce.number().int().min(0, "Tahun pengalaman tidak boleh negatif.").optional().default(0),
  consultation_fee: z.coerce.number().min(0, "Biaya konsultasi tidak boleh negatif.").optional().default(0),
  is_available: z.boolean().optional().default(true),
});

export const updateDoctorSchema = z.object({
  specialty: z.string().min(2).max(100).trim().optional(),
  bio: z.string().max(1000).optional(),
  experience_years: z.coerce.number().int().min(0).optional(),
  consultation_fee: z.coerce.number().min(0).optional(),
  is_available: z.boolean().optional(),
});
