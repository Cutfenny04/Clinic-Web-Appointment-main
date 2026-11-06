import { z } from "zod";

export const registerSchema = z.object({
  full_name: z
    .string({ required_error: "Nama lengkap wajib diisi." })
    .min(3, "Nama minimal 3 karakter.")
    .max(100, "Nama maksimal 100 karakter.")
    .trim(),

  email: z
    .string({ required_error: "Email wajib diisi." })
    .email("Format email tidak valid.")
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: "Password wajib diisi." })
    .min(8, "Password minimal 8 karakter.")
    .max(72, "Password maksimal 72 karakter."),

  phone: z
    .string()
    .regex(/^(\+62|62|0)[0-9]{8,13}$/, "Format nomor telepon tidak valid.")
    .optional()
    .or(z.literal("")),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email wajib diisi." })
    .email("Format email tidak valid.")
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: "Password wajib diisi." })
    .min(1, "Password wajib diisi."),
});

export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .min(3, "Nama minimal 3 karakter.")
    .max(100, "Nama maksimal 100 karakter.")
    .trim()
    .optional(),

  phone: z
    .string()
    .regex(/^(\+62|62|0)[0-9]{8,13}$/, "Format nomor telepon tidak valid.")
    .optional()
    .or(z.literal("")),
});
