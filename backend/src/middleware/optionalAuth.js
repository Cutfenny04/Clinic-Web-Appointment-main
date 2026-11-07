import { authenticate } from "./authenticate.js";

/** Jika ada Bearer token, verifikasi (agar admin bisa melihat data lengkap); jika tidak, lanjut sebagai publik. */
export function optionalAuth(req, res, next) {
  if (!req.headers.authorization) return next();
  return authenticate(req, res, next);
}
