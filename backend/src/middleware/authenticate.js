
import {
  supabaseAuthClient,
  createUserSupabaseClient,
} from "../config/supabase.js";

export async function authenticate(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Token autentikasi tidak ditemukan.",
      });
    }

    // Verifikasi token ke Supabase Auth.
    const { data, error } =
      await supabaseAuthClient.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        message: "Token tidak valid atau sudah kedaluwarsa.",
      });
    }

    const userSupabase = createUserSupabaseClient(token);

    // Ambil profil dan role pengguna.
    const { data: profile, error: profileError } =
      await userSupabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", data.user.id)
        .single();

    if (profileError || !profile) {
      return res.status(403).json({
        success: false,
        message: "Profil pengguna tidak ditemukan.",
      });
    }

    req.user = data.user;
    req.profile = profile;
    req.supabase = userSupabase;

    next();
  } catch (error) {
    next(error);
  }
}
