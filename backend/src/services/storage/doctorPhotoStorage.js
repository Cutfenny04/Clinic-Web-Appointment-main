import { randomUUID } from "node:crypto";
import { ApiError } from "../../utils/ApiError.js";
import { createSupabaseStorageProvider } from "./supabaseProvider.js";

/**
 * Abstraksi penyimpanan foto profil dokter.
 *
 * Seluruh kode lain (controller, service dokter) HANYA memanggil tiga fungsi ini:
 *   uploadDoctorPhoto(), getDoctorPhotoUrl(), deleteDoctorPhoto()
 * Database menyimpan *path* objek ("<doctor_id>/<nama-unik>.jpg"), bukan URL penyedia.
 *
 * Pindah ke Amazon S3 nanti: buat provider baru dengan antarmuka yang sama
 * ({ put(path, buffer, contentType), remove(path) }), pilih lewat STORAGE_PROVIDER=s3,
 * dan set PUBLIC_PHOTO_BASE_URL ke domain CloudFront/S3. Frontend tidak perlu diubah.
 */

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB
export const BUCKET = process.env.DOCTOR_PHOTO_BUCKET || "doctor-photos";

export const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg", // beberapa browser/OS mengirim image/jpg
  "image/png": "png",
  "image/webp": "webp",
};

/** Deteksi format dari isi file (magic bytes) — Content-Type dari klien tidak dipercaya begitu saja. */
export function detectImageType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Validasi tipe & ukuran. Melempar ApiError dengan pesan Bahasa Indonesia. */
export function validatePhoto(buffer, declaredType) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw ApiError.badRequest("File foto belum dipilih atau kosong.");
  }
  if (buffer.length > MAX_PHOTO_BYTES) {
    throw new ApiError(413, "Ukuran foto maksimal 2 MB.");
  }
  const declared = String(declaredType || "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_TYPES[declared]) {
    throw new ApiError(415, "Format foto harus JPG, JPEG, PNG, atau WebP.");
  }
  const actual = detectImageType(buffer);
  if (!actual) throw new ApiError(415, "File bukan gambar JPG, PNG, atau WebP yang valid.");
  const norm = (t) => (t === "image/jpg" ? "image/jpeg" : t);
  if (norm(declared) !== actual) {
    throw new ApiError(415, "Isi file tidak sesuai dengan formatnya. Unggah ulang foto JPG, PNG, atau WebP.");
  }
  return { contentType: actual, ext: ALLOWED_TYPES[actual] };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Nama file unik di folder milik dokter: "<doctor_id>/<timestamp>-<uuid>.<ext>" */
export function buildPhotoPath(doctorId, ext) {
  if (!UUID_RE.test(doctorId)) throw ApiError.badRequest("ID dokter tidak valid.");
  return `${doctorId.toLowerCase()}/${Date.now()}-${randomUUID()}.${ext}`;
}

let provider = null;
/** Untuk pengujian: ganti provider dengan versi palsu. */
export function setStorageProvider(p) { provider = p; }
function getProvider() {
  if (provider) return provider;
  const name = (process.env.STORAGE_PROVIDER || "supabase").toLowerCase();
  if (name === "supabase") provider = createSupabaseStorageProvider(BUCKET);
  else throw new ApiError(503, `Penyedia penyimpanan "${name}" belum dikonfigurasi di server.`);
  return provider;
}

/**
 * Unggah foto baru. Tidak menimpa file lama (nama selalu unik), sehingga foto lama
 * tetap aman bila langkah berikutnya gagal.
 * @returns {Promise<{ path: string, contentType: string, size: number }>}
 */
export async function uploadDoctorPhoto({ doctorId, buffer, contentType }) {
  const { contentType: type, ext } = validatePhoto(buffer, contentType);
  const path = buildPhotoPath(doctorId, ext);
  await getProvider().put(path, buffer, type);
  return { path, contentType: type, size: buffer.length };
}

/** URL publik untuk ditampilkan. null bila dokter belum punya foto. */
export function getDoctorPhotoUrl(path) {
  if (!path) return null;
  const base = process.env.PUBLIC_PHOTO_BASE_URL?.replace(/\/+$/, "");
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  if (base) return `${base}/${encoded}`;
  const supabaseUrl = (process.env.SUPABASE_URL || "http://localhost:54321").replace(/\/+$/, "");
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${encoded}`;
}

/** Hapus file. Tidak melempar error bila file sudah tidak ada. */
export async function deleteDoctorPhoto(path) {
  if (!path) return;
  await getProvider().remove(path);
}
