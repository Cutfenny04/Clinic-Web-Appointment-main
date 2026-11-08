import api from "./api";

/**
 * Layanan foto profil dokter (sisi frontend).
 * Frontend TIDAK berbicara langsung dengan Supabase Storage / S3: unggah & hapus lewat
 * backend (yang memeriksa role admin), dan URL tampilan selalu diambil dari field
 * `photo_url` pada respons API. Mengganti penyedia storage tidak mengubah kode ini.
 */

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

/** Validasi awal di browser (backend tetap memvalidasi ulang). Mengembalikan pesan error atau null. */
export function validatePhotoFile(file) {
  if (!file) return "Pilih file foto terlebih dahulu.";
  const ext = file.name?.split(".").pop()?.toLowerCase();
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type) || !["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return "Format foto harus JPG, JPEG, PNG, atau WebP.";
  }
  if (file.size > MAX_PHOTO_BYTES) return `Ukuran foto ${(file.size / 1024 / 1024).toFixed(1)} MB — maksimal 2 MB.`;
  if (file.size === 0) return "File foto kosong.";
  return null;
}

/** Admin: unggah/ganti foto dokter. Mengembalikan data dokter terbaru. */
export async function uploadDoctorPhoto(doctorId, file) {
  const res = await api.put(`/doctors/${doctorId}/photo`, file, {
    headers: { "Content-Type": file.type === "image/jpg" ? "image/jpeg" : file.type },
    timeout: 60000,
  });
  return res.data;
}

/** Admin: hapus foto dokter. Mengembalikan data dokter terbaru. */
export async function deleteDoctorPhoto(doctorId) {
  const res = await api.delete(`/doctors/${doctorId}/photo`);
  return res.data;
}

/** URL foto untuk ditampilkan, atau null (komponen menampilkan avatar default). */
export function getDoctorPhotoUrl(doctor) {
  return doctor?.photo_url || null;
}
