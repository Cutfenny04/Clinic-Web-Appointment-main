import { supabaseAuthClient } from "../../config/supabase.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Mengambil daftar jadwal dokter dengan optional filter
 */
export async function getSchedulesList(client = supabaseAuthClient, query = {}) {
  const { doctor_id, date, is_active } = query;

  let dbQuery = client
    .from("doctor_schedules")
    .select(`
      id,
      doctor_id,
      schedule_date,
      start_time,
      end_time,
      capacity,
      is_active,
      created_at
    `)
    .order("schedule_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (doctor_id) {
    dbQuery = dbQuery.eq("doctor_id", doctor_id);
  }

  if (date) {
    dbQuery = dbQuery.eq("schedule_date", date);
  }

  if (is_active !== undefined) {
    dbQuery = dbQuery.eq("is_active", is_active === "true" || is_active === true);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw ApiError.internal("Gagal memuat jadwal: " + error.message);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Ambil nama dokter secara efisien
  const doctorIds = [...new Set(data.map((s) => s.doctor_id).filter(Boolean))];
  const doctorMap = {};
  if (doctorIds.length > 0) {
    const { data: doctors } = await client
      .from("profiles")
      .select("id, full_name")
      .in("id", doctorIds);
    if (doctors) {
      doctors.forEach((d) => {
        doctorMap[d.id] = d.full_name;
      });
    }
  }

  return data.map((s) => ({
    id: s.id,
    doctor_id: s.doctor_id,
    doctor_name: doctorMap[s.doctor_id] || "Dokter",
    schedule_date: s.schedule_date,
    start_time: s.start_time,
    end_time: s.end_time,
    capacity: s.capacity,
    is_active: s.is_active,
    created_at: s.created_at,
  }));
}

/**
 * Mengambil seluruh jadwal untuk dokter tertentu
 */
export async function getSchedulesByDoctor(doctorId, client = supabaseAuthClient) {
  return getSchedulesList(client, { doctor_id: doctorId, is_active: true });
}

/**
 * Membuat jadwal dokter baru (Admin atau Dokter untuk dirinya sendiri)
 */
export async function createSchedule(payload, userProfile, client) {
  let targetDoctorId = payload.doctor_id;

  // Jika yang login dokter, doctor_id otomatis adalah dirinya
  if (userProfile.role === "doctor") {
    targetDoctorId = userProfile.id;
  } else if (!targetDoctorId) {
    throw ApiError.badRequest("doctor_id wajib diisi oleh Admin.");
  }

  // Validasi jam mulai < jam selesai
  if (payload.start_time >= payload.end_time) {
    throw ApiError.badRequest("Jam mulai harus lebih awal dari jam selesai.");
  }

  const { data, error } = await client
    .from("doctor_schedules")
    .insert({
      doctor_id: targetDoctorId,
      schedule_date: payload.schedule_date,
      start_time: payload.start_time,
      end_time: payload.end_time,
      capacity: payload.capacity || 10,
      is_active: payload.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    throw ApiError.internal("Gagal membuat jadwal: " + error.message);
  }

  return data;
}

/**
 * Mengupdate jadwal (Admin atau Dokter pemilik jadwal)
 */
export async function updateSchedule(scheduleId, payload, userProfile, client) {
  // Cek jadwal eksis
  const { data: existing, error: existErr } = await client
    .from("doctor_schedules")
    .select("id, doctor_id")
    .eq("id", scheduleId)
    .single();

  if (existErr || !existing) {
    throw ApiError.notFound("Jadwal tidak ditemukan.");
  }

  // Otorisasi: hanya admin atau dokter pemilik
  if (userProfile.role === "doctor" && existing.doctor_id !== userProfile.id) {
    throw ApiError.forbidden("Anda hanya boleh mengubah jadwal praktik Anda sendiri.");
  }

  if (payload.start_time && payload.end_time && payload.start_time >= payload.end_time) {
    throw ApiError.badRequest("Jam mulai harus lebih awal dari jam selesai.");
  }

  const { data, error } = await client
    .from("doctor_schedules")
    .update(payload)
    .eq("id", scheduleId)
    .select()
    .single();

  if (error) {
    throw ApiError.internal("Gagal mengupdate jadwal: " + error.message);
  }

  return data;
}

/**
 * Menghapus jadwal (Admin atau Dokter pemilik jadwal)
 */
export async function deleteSchedule(scheduleId, userProfile, client) {
  const { data: existing, error: existErr } = await client
    .from("doctor_schedules")
    .select("id, doctor_id")
    .eq("id", scheduleId)
    .single();

  if (existErr || !existing) {
    throw ApiError.notFound("Jadwal tidak ditemukan.");
  }

  if (userProfile.role === "doctor" && existing.doctor_id !== userProfile.id) {
    throw ApiError.forbidden("Anda hanya boleh menghapus jadwal praktik Anda sendiri.");
  }

  const { error } = await client
    .from("doctor_schedules")
    .delete()
    .eq("id", scheduleId);

  if (error) {
    throw ApiError.internal("Gagal menghapus jadwal: " + error.message);
  }

  return { message: "Jadwal berhasil dihapus." };
}
