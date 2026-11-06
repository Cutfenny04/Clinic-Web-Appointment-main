/**
 * ApiError — Custom error class untuk API responses.
 *
 * Dilempar dari service/controller untuk menandai error yang sudah
 * terprediksi (validasi gagal, tidak ditemukan, dsb). errorHandler
 * akan membedakannya dari error tak terduga (bug, crash).
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode  - HTTP status code (400, 401, 403, 404, 409, 500, dsb)
   * @param {string} message     - Pesan error yang akan dikembalikan ke client
   * @param {any}    [details]   - Detail tambahan opsional (array validasi Zod, dsb)
   */
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }

  // ── Factory helpers ──────────────────────────────────────────────

  static badRequest(message = "Request tidak valid.", details = null) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "Token autentikasi tidak ditemukan atau tidak valid.") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Kamu tidak memiliki akses ke resource ini.") {
    return new ApiError(403, message);
  }

  static notFound(message = "Data tidak ditemukan.") {
    return new ApiError(404, message);
  }

  static conflict(message = "Konflik data.") {
    return new ApiError(409, message);
  }

  static internal(message = "Terjadi kesalahan pada server.") {
    return new ApiError(500, message);
  }
}
