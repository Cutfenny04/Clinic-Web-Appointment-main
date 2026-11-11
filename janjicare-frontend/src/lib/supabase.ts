import { createClient } from "@supabase/supabase-js";

/**
 * Supabase di frontend HANYA dipakai untuk Auth (login, sesi, refresh token).
 * Semua data klinik diambil lewat Backend API, bukan query tabel langsung.
 * Hanya publishable key yang boleh ada di sini — JANGAN pernah service role key.
 */
// "same-origin": Auth dilayani domain yang sama dengan frontend (deploy AWS: CloudFront → /auth/v1 di EC2),
// sehingga build frontend tidak perlu tahu nama domain CloudFront.
const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseUrl = rawUrl === "same-origin" ? window.location.origin : rawUrl;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

if (!isSupabaseConfigured) {
  console.warn("Konfigurasi Supabase belum lengkap. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY di .env.local");
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabasePublishableKey || "placeholder-key",
  { auth: { persistSession: true, autoRefreshToken: true, storageKey: "janjicare-auth" } }
);

export default supabase;
