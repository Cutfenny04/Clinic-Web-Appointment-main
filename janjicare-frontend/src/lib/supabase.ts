import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    "Peringatan: Konfigurasi Supabase frontend belum lengkap. Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY terisi di .env.local"
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabasePublishableKey || "placeholder-key"
);

export default supabase;
