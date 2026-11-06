export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.profile) {
      return res.status(401).json({
        success: false,
        message: "Pengguna belum terautentikasi.",
      });
    }

    if (!allowedRoles.includes(req.profile.role)) {
      return res.status(403).json({
        success: false,
        message: "Kamu tidak memiliki akses.",
      });
    }

    next();
  };
}