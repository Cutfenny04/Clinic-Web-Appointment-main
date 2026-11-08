import { supabaseAdmin } from "../../config/supabase.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Provider Supabase Storage. Memakai service role (HANYA di server) setelah
 * backend memastikan pemanggil adalah admin. Antarmuka { put, remove } sengaja
 * sederhana agar mudah dibuat padanannya untuk Amazon S3 (PutObject/DeleteObject).
 */
export function createSupabaseStorageProvider(bucket) {
  function client() {
    if (!supabaseAdmin) {
      throw new ApiError(503,
        "Unggah foto membutuhkan SUPABASE_SERVICE_ROLE_KEY pada server backend. Hubungi pengelola sistem.");
    }
    return supabaseAdmin.storage.from(bucket);
  }

  return {
    async put(path, buffer, contentType) {
      const { error } = await client().upload(path, buffer, { contentType, upsert: false, cacheControl: "31536000" });
      if (error) {
        console.error("[storage] gagal mengunggah", path, error.message);
        if (/bucket not found/i.test(error.message)) {
          throw new ApiError(503, `Bucket "${bucket}" belum dibuat. Jalankan backend/sql/03_doctor_photos.sql.`);
        }
        if (/size|too large/i.test(error.message)) throw new ApiError(413, "Ukuran foto maksimal 2 MB.");
        if (/mime|type/i.test(error.message)) throw new ApiError(415, "Format foto harus JPG, JPEG, PNG, atau WebP.");
        throw new ApiError(502, "Gagal mengunggah foto ke penyimpanan. Coba lagi.");
      }
    },
    async remove(path) {
      const { error } = await client().remove([path]);
      if (error) {
        console.error("[storage] gagal menghapus", path, error.message);
        throw new ApiError(502, "Gagal menghapus foto dari penyimpanan.");
      }
    },
  };
}
