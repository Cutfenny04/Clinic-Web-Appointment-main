import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUserPayload,
} from "./auth.service.js";
import { PROFILE_COLUMNS } from "../../middleware/authenticate.js";
import { toApiError } from "../../utils/dbError.js";

/**
 * AuthController — mengelola HTTP request & response untuk auth.
 * Tidak mengandung business logic; semua didelegasikan ke auth.service.js.
 */

/**
 * POST /api/v1/auth/register
 */
export async function register(req, res, next) {
  try {
    const { full_name, email, password, phone } = req.body;

    const { user, session } = await registerUser({
      full_name,
      email,
      password,
      phone,
    });

    // Jika Supabase email confirmation aktif, session akan null sampai email dikonfirmasi
    return res.status(201).json({
      success: true,
      message: session
        ? "Registrasi berhasil."
        : "Registrasi berhasil. Periksa email untuk konfirmasi.",
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
        session: session
          ? {
              access_token: session.access_token,
              expires_at: session.expires_at,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/login
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const { user, session } = await loginUser({ email, password });

    return res.status(200).json({
      success: true,
      message: "Login berhasil.",
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
        session: {
          access_token: session.access_token,
          expires_at: session.expires_at,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 * Memerlukan authenticate middleware.
 */
export async function logout(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    await logoutUser(token);

    return res.status(200).json({
      success: true,
      message: "Logout berhasil. Session telah diakhiri.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/auth/me
 * Memerlukan authenticate middleware.
 */
export async function me(req, res, next) {
  try {
    // Profil sudah diverifikasi & dimuat oleh middleware authenticate
    return res.status(200).json({ success: true, data: getCurrentUserPayload(req.user, req.profile) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/auth/profile
 * Alias untuk me()
 */
export async function getProfile(req, res, next) {
  return me(req, res, next);
}

/**
 * PUT /api/v1/auth/profile
 * Update profil pengguna yang sedang login
 */
export async function updateProfile(req, res, next) {
  try {
    const { full_name, phone } = req.body;
    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone || null;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "Tidak ada data yang diubah." });
    }

    const { data, error } = await req.supabase
      .from("profiles")
      .update(updates)
      .eq("id", req.user.id)
      .select(PROFILE_COLUMNS)
      .single();

    if (error) throw toApiError(error, "Gagal memperbarui profil.");

    return res.status(200).json({
      success: true,
      message: "Profil berhasil diperbarui.",
      data: getCurrentUserPayload(req.user, data),
    });
  } catch (err) {
    next(err);
  }
}
