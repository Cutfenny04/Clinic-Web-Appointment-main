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
    throw ApiError.badRequest(translateAuthError(error.message));
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
    if (error.message?.toLowerCase().includes("email not confirmed")) {
      throw ApiError.unauthorized("Email belum dikonfirmasi. Periksa kotak masuk Anda.");
    }
    throw ApiError.unauthorized("Email atau kata sandi salah.");
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
    email: profile.email || authUser.email,
    email_confirmed_at: authUser.email_confirmed_at || null,
    full_name: profile.full_name,
    name: profile.full_name,
    role: profile.role,
    phone: profile.phone || null,
    avatar_url: profile.avatar_url || null,
    is_active: profile.is_active !== false,
    created_at: profile.created_at || authUser.created_at,
  };
}

/** Terjemahan pesan umum Supabase Auth ke Bahasa Indonesia */
export function translateAuthError(message = "") {
  const m = message.toLowerCase();
  // Pesan asli dicatat di terminal backend agar mudah ditelusuri
  console.warn("[Supabase Auth]", message);
  if (m.includes("weak") || m.includes("easy to guess") || m.includes("pwned") || m.includes("leaked")) {
    return "Kata sandi terlalu mudah ditebak (pernah bocor di internet). Gunakan kombinasi huruf, angka, dan simbol, misalnya Klinik#2026.";
  }
  if (m.includes("password should contain") || m.includes("characters")) {
    return "Kata sandi belum memenuhi syarat keamanan: gunakan huruf besar, huruf kecil, angka, dan simbol.";
  }
  if (m.includes("password should be") || m.includes("at least")) return "Kata sandi terlalu pendek.";
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("already exists")) {
    return "Email sudah terdaftar. Silakan masuk atau gunakan email lain.";
  }
  if (m.includes("not authorized")) {
    return "Supabase hanya boleh mengirim email konfirmasi ke anggota tim project (SMTP bawaan). Matikan 'Confirm email' di Supabase saat pengujian, atau pasang SMTP sendiri.";
  }
  if (m.includes("invalid") && m.includes("email")) return "Alamat email ditolak oleh sistem. Gunakan alamat email yang aktif.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes")) {
    return "Terlalu banyak percobaan pendaftaran. Tunggu beberapa menit lalu coba lagi.";
  }
  if (m.includes("sending") && m.includes("email")) {
    return "Email konfirmasi gagal dikirim oleh Supabase. Matikan 'Confirm email' saat pengujian atau atur SMTP.";
  }
  if (m.includes("email not confirmed")) return "Email belum dikonfirmasi. Periksa kotak masuk Anda.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled")) return "Pendaftaran sedang dinonaktifkan di pengaturan Supabase.";
  return `Pendaftaran ditolak oleh layanan autentikasi: ${message}`;
}
