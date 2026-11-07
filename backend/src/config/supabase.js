import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // HANYA di server, jangan pernah ke frontend

if (!supabaseUrl || !publishableKey) {
  const msg = "SUPABASE_URL dan SUPABASE_PUBLISHABLE_KEY harus diisi.";
  if (process.env.NODE_ENV === "production") throw new Error(msg);
  console.warn(`⚠️  ${msg} (mode ${process.env.NODE_ENV || "development"}: memakai placeholder)`);
}

const URL = supabaseUrl || "http://localhost:54321";
const KEY = publishableKey || "placeholder-key";
const noSession = { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false };

// Client untuk verifikasi identitas & data publik (mengikuti RLS sebagai anon).
export const supabaseAuthClient = createClient(URL, KEY, { auth: noSession });

// Client yang membawa token pengguna → semua query mengikuti RLS pengguna tersebut.
export function createUserSupabaseClient(accessToken) {
  return createClient(URL, KEY, {
    auth: noSession,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// Client administratif (service role) — dipakai HANYA untuk membuat akun staf (dokter/admin).
export const supabaseAdmin = serviceRoleKey ? createClient(URL, serviceRoleKey, { auth: noSession }) : null;
