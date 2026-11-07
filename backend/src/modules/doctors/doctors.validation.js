import { z } from "zod";

const phone = z.string().regex(/^(\+62|62|0)[0-9]{8,13}$/, "Format nomor telepon tidak valid.").optional().or(z.literal(""));
const detail = {
  specialty: z.string({ required_error: "Spesialisasi dokter wajib diisi." })
    .min(2, "Spesialisasi minimal 2 karakter.").max(100, "Spesialisasi maksimal 100 karakter.").trim(),
  bio: z.string().max(1000, "Bio maksimal 1000 karakter.").optional().or(z.literal("")),
  experience_years: z.coerce.number().int().min(0, "Tahun pengalaman tidak boleh negatif.").optional(),
  consultation_fee: z.coerce.number().min(0, "Biaya konsultasi tidak boleh negatif.").optional(),
  is_available: z.boolean().optional(),
};

export const createDoctorSchema = z.union([
  z.object({
    email: z.string({ required_error: "Email wajib diisi." }).email("Format email tidak valid.").toLowerCase().trim(),
    password: z.string({ required_error: "Kata sandi wajib diisi." }).min(8, "Kata sandi minimal 8 karakter.").max(72),
    full_name: z.string({ required_error: "Nama lengkap wajib diisi." }).min(3, "Nama minimal 3 karakter.").max(100).trim(),
    phone,
    ...detail,
  }),
  z.object({ user_id: z.string().uuid("ID pengguna tidak valid."), full_name: z.string().min(3).max(100).optional(), phone, ...detail }),
], { errorMap: () => ({ message: "Lengkapi email, kata sandi, nama, dan spesialisasi dokter." }) });

export const updateDoctorSchema = z.object({
  full_name: z.string().min(3, "Nama minimal 3 karakter.").max(100).trim().optional(),
  phone,
  is_active: z.boolean().optional(),
  specialty: detail.specialty.optional(),
  bio: detail.bio,
  experience_years: detail.experience_years,
  consultation_fee: detail.consultation_fee,
  is_available: detail.is_available,
});
