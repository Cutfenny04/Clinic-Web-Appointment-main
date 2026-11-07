import { ApiError } from "./ApiError.js";

/**
 * Memetakan error PostgreSQL/Supabase ke ApiError berbahasa Indonesia.
 * Kode P00xx berasal dari fungsi di sql/02 dan pesannya sudah Bahasa Indonesia.
 * Pesan mentah lain TIDAK diteruskan ke klien (hindari kebocoran detail DB).
 */
const STATUS_BY_CODE = {
  P0002: 404, // tidak ditemukan
  P0003: 400, // jadwal/dokter tidak aktif
  P0004: 400, // jadwal sudah lewat
  P0005: 409, // booking ganda
  P0006: 409, // kapasitas penuh
  P0010: 403, // tidak berwenang
  P0011: 400, // data pasien tidak valid
  P0020: 409, // transisi status tidak valid
  P0021: 400, // aturan pembatalan/check-in
  P0022: 409, // masih ada pemeriksaan berjalan
  42501: 403, // permission denied / RLS
};

const GENERIC_BY_CODE = {
  42501: "Anda tidak memiliki akses untuk tindakan ini.",
  23505: "Data yang sama sudah ada.",
  23503: "Data terkait tidak ditemukan.",
  "22P02": "Format data tidak valid.",
  PGRST116: "Data tidak ditemukan.",
};

export function toApiError(error, fallback = "Terjadi kesalahan pada server.") {
  if (!error) return ApiError.internal(fallback);
  if (error instanceof ApiError) return error;
  const code = String(error.code || "");
  if (/^P00\d\d$/.test(code) && STATUS_BY_CODE[code]) {
    return new ApiError(STATUS_BY_CODE[code], error.message);
  }
  if (code === "42501") return ApiError.forbidden(GENERIC_BY_CODE[code]);
  if (code === "23505") return ApiError.conflict(GENERIC_BY_CODE[code]);
  if (code === "23503" || code === "22P02") return ApiError.badRequest(GENERIC_BY_CODE[code]);
  if (code === "PGRST116") return ApiError.notFound(GENERIC_BY_CODE[code]);
  console.error("[DB Error]", code, error.message);
  return ApiError.internal(fallback);
}
