export function errorHandler(err, req, res, next) {
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  console.error("[Queue Service Error]", err);
  return res.status(500).json({
    success: false,
    message: "Terjadi kesalahan internal pada Queue Service.",
  });
}
