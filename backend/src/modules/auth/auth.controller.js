import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUserPayload,
} from "./auth.service.js";

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
    // req.user dan req.profile sudah di-attach oleh middleware authenticate
    const { data: profile, error } = await req.supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .eq("id", req.user.id)
      .single();

    if (error || !profile) {
      return res.status(403).json({
        success: false,
        message: "Profil pengguna tidak ditemukan.",
      });
    }

    const payload = getCurrentUserPayload(req.user, profile);

    return res.status(200).json({
      success: true,
      data: payload,
    });
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

    const { data, error } = await req.supabase
      .from("profiles")
      .update(updates)
      .eq("id", req.user.id)
      .select("id, full_name, role, created_at")
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal memperbarui profil.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profil berhasil diperbarui.",
      data,
    });
  } catch (err) {
    next(err);
  }
}

