/**
 * Middleware: notFound
 *
 * Harus dipasang SETELAH semua routes.
 * Menangkap request ke endpoint yang tidak terdaftar dan mengembalikan 404.
 */
export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`,
  });
}
