/**
 * Middleware: validate
 *
 * Menerima schema Zod dan memvalidasi req.body terhadapnya.
 * Jika valid, data yang sudah diparsing (dan di-strip dari field asing)
 * disimpan kembali di req.body.
 * Jika gagal, langsung kembalikan 400 dengan detail error per field.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issues = result.error.issues || result.error.errors || [];
      const errors = issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validasi input gagal.",
        errors,
      });
    }

    // Ganti body dengan data yang sudah divalidasi & dibersihkan
    req.body = result.data;
    next();
  };
}
