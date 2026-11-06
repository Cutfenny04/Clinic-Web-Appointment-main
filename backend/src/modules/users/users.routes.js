import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { ApiError } from "../../utils/ApiError.js";

const router = Router();

/**
 * GET /api/v1/users
 * Admin melihat daftar pengguna (bisa difilter role=patient/doctor/admin)
 */
router.get(
  "/",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const { role, search } = req.query;
      let query = req.supabase
        .from("profiles")
        .select("id, full_name, role, created_at")
        .order("created_at", { ascending: false });

      if (role) {
        query = query.eq("role", role);
      }
      if (search) {
        query = query.ilike("full_name", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) {
        throw ApiError.internal("Gagal memuat pengguna: " + error.message);
      }

      res.status(200).json({
        success: true,
        data: data || [],
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/users/:id
 * Admin melihat detail satu pengguna
 */
router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const { data, error } = await req.supabase
        .from("profiles")
        .select("id, full_name, role, created_at")
        .eq("id", req.params.id)
        .single();

      if (error || !data) {
        throw ApiError.notFound("Pengguna tidak ditemukan.");
      }

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
