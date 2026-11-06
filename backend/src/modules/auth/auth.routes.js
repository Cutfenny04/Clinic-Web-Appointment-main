import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { registerSchema, loginSchema, updateProfileSchema } from "./auth.validation.js";
import { register, login, logout, me, getProfile, updateProfile } from "./auth.controller.js";

const router = Router();

/**
 * POST /api/v1/auth/register
 * Publik — tidak perlu autentikasi
 */
router.post("/register", validate(registerSchema), register);

/**
 * POST /api/v1/auth/login
 * Publik — tidak perlu autentikasi
 *
 * CATATAN: Frontend juga bisa login langsung ke Supabase Auth.
 * Endpoint ini untuk alur login yang melewati backend (audit log, dsb).
 */
router.post("/login", validate(loginSchema), login);

/**
 * POST /api/v1/auth/logout
 * Butuh token — agar server bisa invalidasi session di Supabase Auth
 */
router.post("/logout", authenticate, logout);

/**
 * GET /api/v1/auth/me
 * Mengembalikan data pengguna yang sedang login
 */
router.get("/me", authenticate, me);

/**
 * GET /api/v1/auth/profile
 */
router.get("/profile", authenticate, getProfile);

/**
 * PUT /api/v1/auth/profile
 */
router.put("/profile", authenticate, validate(updateProfileSchema), updateProfile);

export default router;

