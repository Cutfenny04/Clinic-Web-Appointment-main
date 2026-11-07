export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.profile) {
      return res.status(401).json({ success: false, message: "Silakan masuk terlebih dahulu." });
    }
    if (!allowedRoles.includes(req.profile.role)) {
      return res.status(403).json({ success: false, code: "FORBIDDEN_ROLE", message: "Anda tidak memiliki akses ke fitur ini." });
    }
    next();
  };
}
