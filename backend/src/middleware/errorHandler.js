import { ApiError } from "../utils/ApiError.js";

/**
 * Middleware: errorHandler
 *
 * Harus menjadi middleware TERAKHIR yang didaftarkan di app.js.
 * Express mengenali error handler dari 4 parameter: (err, req, res, next).
 *
 * - Jika error adalah ApiError (operational), kembalikan statusCode & message-nya.
 * - Jika bukan ApiError (bug, crash, error tak terduga), log ke stderr
 *   dan kembalikan 500 generik agar detail internal tidak bocor ke client.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Log seluruh error ke console untuk debugging
  if (err instanceof ApiError) {
    // Operational error — expected, tidak perlu stack trace
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[ApiError ${err.statusCode}] ${err.message}`);
    }

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details && { errors: err.details }),
    });
  }

  // Unexpected error — log lengkap dengan stack trace
  console.error("[Unhandled Error]", err);

  return res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Terjadi kesalahan pada server."
        : err.message,
  });
}
