
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !publishableKey) {
  throw new Error(
    "SUPABASE_URL dan SUPABASE_PUBLISHABLE_KEY harus diisi."
  );
}

// Client untuk verifikasi identitas pengguna.
export const supabaseAuthClient = createClient(
  supabaseUrl,
  publishableKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

// Client yang menggunakan token pengguna.
// Query database melalui client ini akan mengikuti RLS.
export function createUserSupabaseClient(accessToken) {
  return createClient(
    supabaseUrl,
    publishableKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}
