import { supabaseAuthClient } from "../../config/supabase.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * AuthService — business logic untuk autentikasi.
 *
 * Semua interaksi dengan Supabase Auth ada di sini.
 * Controller hanya memanggil service dan mengembalikan HTTP response.
 */

/**
 * Registrasi pengguna baru.
 * - Supabase Auth membuat identitas di auth.users
 * - Trigger database (atau RPC) akan membuat row di public.profiles dengan role 'patient'
 *
 * @param {{ email: string, password: string, full_name: string, phone?: string }} payload
 */
export async function registerUser({ email, password, full_name, phone }) {
  const { data, error } = await supabaseAuthClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        phone: phone || null,
        // Role TIDAK diterima dari input registrasi publik.
        // Role default 'patient' ditetapkan oleh database trigger.
      },
    },
  });

  if (error) {
    // Email sudah terdaftar
    if (error.message.toLowerCase().includes("already registered")) {
      throw ApiError.conflict("Email sudah terdaftar. Gunakan email lain.");
    }
    throw ApiError.badRequest(error.message);
  }

  return { user: data.user, session: data.session };
}

/**
 * Login pengguna.
 * Mengembalikan session yang berisi access_token untuk dipakai frontend.
 *
 * CATATAN ARSITEKTUR:
 * Login bisa dilakukan langsung dari frontend ke Supabase Auth tanpa melewati
 * backend ini. Endpoint ini disediakan sebagai alternatif apabila diperlukan
 * alur login terpusat (misalnya untuk logging, audit, dsb).
 * Frontend tetap dapat login langsung via supabase.auth.signInWithPassword().
 *
 * @param {{ email: string, password: string }} payload
 */
export async function loginUser({ email, password }) {
  const { data, error } =
    await supabaseAuthClient.auth.signInWithPassword({ email, password });

  if (error) {
    // Jangan bocorkan apakah email tidak ada atau password salah
    throw ApiError.unauthorized("Email atau password tidak valid.");
  }

  return { user: data.user, session: data.session };
}

/**
 * Logout — invalidasi session di sisi Supabase Auth.
 *
 * @param {string} accessToken  - Bearer token dari request header
 */
export async function logoutUser(accessToken) {
  // Buat client yang membawa token pengguna agar logout menyentuh session yang tepat
  const { createUserSupabaseClient } = await import("../../config/supabase.js");
  const userClient = createUserSupabaseClient(accessToken);

  const { error } = await userClient.auth.signOut();

  if (error) {
    throw ApiError.internal("Gagal mengakhiri session. Coba lagi.");
  }
}

/**
 * Mengambil profil lengkap pengguna yang sedang login.
 * Data diambil dari req yang sudah di-attach oleh middleware authenticate.
 *
 * @param {{ id: string, full_name: string, role: string }} profile
 * @param {object} authUser - auth.users object dari Supabase
 */
export function getCurrentUserPayload(authUser, profile) {
  return {
    id: authUser.id,
    email: authUser.email,
    email_confirmed_at: authUser.email_confirmed_at,
    full_name: profile.full_name,
    role: profile.role,
    phone: profile.phone || null,
    avatar_url: profile.avatar_url || null,
    created_at: authUser.created_at,
  };
}
