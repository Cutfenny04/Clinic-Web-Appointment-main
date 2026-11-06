import { supabaseAuthClient } from "../../config/supabase.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Mengambil daftar seluruh dokter aktif beserta profilnya.
 * Terbuka untuk umum / pasien agar bisa memilih dokter.
 */
export async function getDoctorsList(client = supabaseAuthClient, query = {}) {
  const { specialty, search } = query;

  let dbQuery = client
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      doctor_details (
        specialty,
        bio,
        created_at
      )
    `)
    .eq("role", "doctor");

  if (search) {
    dbQuery = dbQuery.ilike("full_name", `%${search}%`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw ApiError.internal("Gagal memuat daftar dokter: " + error.message);
  }

  // Filter specialty jika diberikan
  let results = data || [];
  if (specialty) {
    results = results.filter((doc) =>
      doc.doctor_details?.some((d) =>
        d.specialty?.toLowerCase().includes(specialty.toLowerCase())
      )
    );
  }

  return results.map((doc) => ({
    id: doc.id,
    name: doc.full_name,
    role: doc.role,
    specialty: doc.doctor_details?.[0]?.specialty || "Dokter Umum",
    bio: doc.doctor_details?.[0]?.bio || "",
  }));
}

/**
 * Mengambil detail dokter berdasarkan ID.
 */
export async function getDoctorById(doctorId, client = supabaseAuthClient) {
  const { data: profile, error } = await client
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      doctor_details (
        specialty,
        bio,
        created_at
      )
    `)
    .eq("id", doctorId)
    .eq("role", "doctor")
    .single();

  if (error || !profile) {
    throw ApiError.notFound("Dokter tidak ditemukan.");
  }

  return {
    id: profile.id,
    name: profile.full_name,
    role: profile.role,
    specialty: profile.doctor_details?.[0]?.specialty || "Dokter Umum",
    bio: profile.doctor_details?.[0]?.bio || "",
  };
}

/**
 * Menambahkan profil dokter baru (Admin only).
 * 1. Mengubah role user di profiles menjadi 'doctor'
 * 2. Menyimpan detail di doctor_details
 */
export async function createDoctor(payload, client) {
  const { user_id, specialty, bio } = payload;

  // 1. Pastikan user ada di profiles
  const { data: profile, error: profileErr } = await client
    .from("profiles")
    .select("id, role")
    .eq("id", user_id)
    .single();

  if (profileErr || !profile) {
    throw ApiError.notFound("User tidak ditemukan.");
  }

  // 2. Update role menjadi doctor
  const { error: updateRoleErr } = await client
    .from("profiles")
    .update({ role: "doctor" })
    .eq("id", user_id);

  if (updateRoleErr) {
    throw ApiError.internal("Gagal mengupdate role dokter: " + updateRoleErr.message);
  }

  // 3. Upsert detail dokter
  const { data: details, error: detailErr } = await client
    .from("doctor_details")
    .upsert({
      user_id,
      specialty,
      bio: bio || "",
    })
    .select()
    .single();

  if (detailErr) {
    throw ApiError.internal("Gagal menyimpan detail dokter: " + detailErr.message);
  }

  return details;
}

/**
 * Mengupdate data dokter (Admin atau dokter bersangkutan).
 */
export async function updateDoctor(doctorId, payload, client) {
  const { specialty, bio } = payload;

  const updates = {};
  if (specialty !== undefined) updates.specialty = specialty;
  if (bio !== undefined) updates.bio = bio;

  const { data, error } = await client
    .from("doctor_details")
    .update(updates)
    .eq("user_id", doctorId)
    .select()
    .single();

  if (error) {
    throw ApiError.internal("Gagal mengupdate detail dokter: " + error.message);
  }

  return data;
}

/**
 * Menghapus peran dokter (Admin only).
 * Mengembalikan role menjadi 'patient'.
 */
export async function deleteDoctor(doctorId, client) {
  // Hapus detail
  await client.from("doctor_details").delete().eq("user_id", doctorId);

  // Ubah role kembali ke patient
  const { error } = await client
    .from("profiles")
    .update({ role: "patient" })
    .eq("id", doctorId);

  if (error) {
    throw ApiError.internal("Gagal menghapus status dokter: " + error.message);
  }

  return { message: "Status dokter berhasil dicabut." };
}
