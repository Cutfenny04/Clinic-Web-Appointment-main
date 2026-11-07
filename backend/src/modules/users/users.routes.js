import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { ApiError } from "../../utils/ApiError.js";
import { toApiError } from "../../utils/dbError.js";

const router = Router();
router.use(authenticate, authorize("admin"));

const COLS = "id, full_name, role, email, phone, is_active, created_at";

/**
 * GET /api/v1/users?role=patient&search=budi
 * Admin melihat daftar pengguna + ringkasan janji temu (untuk pasien).
 */
router.get("/", async (req, res, next) => {
  try {
    const { role, search } = req.query;
    let q = req.supabase.from("profiles").select(COLS).order("created_at", { ascending: false });
    if (role) q = q.eq("role", role);
    if (search) q = q.or(`full_name.ilike.%${String(search).replace(/[,()]/g, "")}%,email.ilike.%${String(search).replace(/[,()]/g, "")}%`);
    const { data, error } = await q;
    if (error) throw toApiError(error, "Gagal memuat pengguna.");

    const ids = (data || []).map((u) => u.id);
    const counts = {};
    if (ids.length && role === "patient") {
      const { data: appts } = await req.supabase.from("appointments").select("patient_id, status, created_at").in("patient_id", ids);
      for (const a of appts || []) {
        const c = (counts[a.patient_id] ||= { total: 0, completed: 0, last_visit: null });
        c.total += 1;
        if (a.status === "completed") c.completed += 1;
        if (!c.last_visit || a.created_at > c.last_visit) c.last_visit = a.created_at;
      }
    }
    res.json({
      success: true,
      data: (data || []).map((u) => ({ ...u, name: u.full_name, appointments: counts[u.id] || { total: 0, completed: 0, last_visit: null } })),
    });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from("profiles").select(COLS).eq("id", req.params.id).maybeSingle();
    if (error) throw toApiError(error);
    if (!data) throw ApiError.notFound("Pengguna tidak ditemukan.");
    res.json({ success: true, data: { ...data, name: data.full_name } });
  } catch (err) { next(err); }
});

/** PATCH /api/v1/users/:id/status { is_active } — aktif/nonaktifkan akun (tanpa menghapus data) */
router.patch("/:id/status", validate(z.object({ is_active: z.boolean({ required_error: "Status akun wajib diisi." }) })), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) throw ApiError.badRequest("Anda tidak dapat menonaktifkan akun Anda sendiri.");
    const { data, error } = await req.supabase.from("profiles").update({ is_active: req.body.is_active })
      .eq("id", req.params.id).select(COLS).maybeSingle();
    if (error) throw toApiError(error, "Gagal mengubah status akun.");
    if (!data) throw ApiError.notFound("Pengguna tidak ditemukan.");
    res.json({ success: true, message: req.body.is_active ? "Akun diaktifkan." : "Akun dinonaktifkan.", data });
  } catch (err) { next(err); }
});

export default router;
