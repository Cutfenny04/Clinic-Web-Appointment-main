export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues || result.error.errors || [];
      const errors = issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      return res.status(400).json({
        success: false,
        message: "Validasi input gagal.",
        errors,
      });
    }
    req.body = result.data;
    next();
  };
}
