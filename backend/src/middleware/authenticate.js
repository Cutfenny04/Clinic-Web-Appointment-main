import { supabaseAuthClient, createUserSupabaseClient } from "../config/supabase.js";

/** Dependensi yang dapat diganti saat pengujian (tanpa jaringan ke Supabase). */
export const authDeps = {
  getUser: (token) => supabaseAuthClient.auth.getUser(token),
  createClient: (token) => createUserSupabaseClient(token),
};

export const PROFILE_COLUMNS = "id, full_name, role, phone, avatar_url, email, is_active, created_at";

/**
 * Verifikasi Bearer token ke Supabase Auth, lalu ambil role dari tabel profiles.
 * Role TIDAK pernah diambil dari token/metadata yang bisa diatur pengguna.
 */
export async function authenticate(req, res, next) {
  try {
    const [scheme, token] = (req.headers.authorization || "").split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ success: false, code: "TOKEN_MISSING", message: "Silakan masuk terlebih dahulu." });
    }

    const { data, error } = await authDeps.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        code: "TOKEN_INVALID",
        message: "Sesi Anda sudah berakhir. Silakan masuk kembali.",
      });
    }

    const userSupabase = authDeps.createClient(token);
    const { data: profile, error: profileError } = await userSupabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ success: false, code: "PROFILE_MISSING", message: "Profil pengguna tidak ditemukan." });
    }
    if (profile.is_active === false) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message: "Akun Anda dinonaktifkan. Hubungi admin klinik.",
      });
    }

    req.user = data.user;
    req.profile = profile;
    req.supabase = userSupabase;
    req.accessToken = token;
    next();
  } catch (error) {
    next(error);
  }
}
