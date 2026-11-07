import { supabaseAuthClient } from "../../config/supabase.js";
import { ApiError } from "../../utils/ApiError.js";
import { toApiError } from "../../utils/dbError.js";
import { todayJakarta } from "../../utils/time.js";

const COLS = "id, doctor_id, schedule_date, start_time, end_time, capacity, is_active, created_at";

/**
 * Daftar jadwal + nama/spesialisasi dokter + kuota terisi.
 * Query: doctor_id, date, from, to, is_active, upcoming=true
 * Dokter yang login (mine=true) melihat jadwalnya sendiri termasuk yang nonaktif.
 */
export async function getSchedulesList(client = supabaseAuthClient, query = {}, viewer = null) {
  let q = client.from("doctor_schedules").select(COLS)
    .order("schedule_date", { ascending: true }).order("start_time", { ascending: true });

  const doctorId = viewer?.role === "doctor" && query.mine === "true" ? viewer.id : query.doctor_id;
  if (doctorId) q = q.eq("doctor_id", doctorId);
  if (query.date) q = q.eq("schedule_date", query.date);
  if (query.from) q = q.gte("schedule_date", query.from);
  if (query.to) q = q.lte("schedule_date", query.to);
  if (query.upcoming === "true") q = q.gte("schedule_date", todayJakarta());
  if (query.is_active !== undefined) q = q.eq("is_active", query.is_active === "true" || query.is_active === true);

  const { data, error } = await q;
  if (error) throw toApiError(error, "Gagal memuat jadwal.");
  if (!data?.length) return [];

  const doctorIds = [...new Set(data.map((s) => s.doctor_id))];
  const [docs, details, counts] = await Promise.all([
    client.from("profiles").select("id, full_name").in("id", doctorIds),
    client.from("doctor_details").select("user_id, specialty").in("user_id", doctorIds),
    client.rpc("schedule_booked_counts", { p_schedule_ids: data.map((s) => s.id) }),
  ]);
  const name = Object.fromEntries((docs.data || []).map((d) => [d.id, d.full_name]));
  const spec = Object.fromEntries((details.data || []).map((d) => [d.user_id, d.specialty]));
  const booked = Object.fromEntries((counts.data || []).map((c) => [c.schedule_id, c.booked]));

  return data.map((s) => {
    const b = booked[s.id] || 0;
    return {
      ...s,
      doctor_name: name[s.doctor_id] || "Dokter",
      doctor_specialty: spec[s.doctor_id] || null,
      booked_count: b,
      remaining: Math.max(0, s.capacity - b),
      is_full: b >= s.capacity,
    };
  });
}

export async function getSchedulesByDoctor(doctorId, client = supabaseAuthClient) {
  return getSchedulesList(client, { doctor_id: doctorId, is_active: true, upcoming: "true" });
}

function assertTimes(start, end) {
  if (start && end && start >= end) throw ApiError.badRequest("Jam mulai harus lebih awal dari jam selesai.");
}

async function loadOwned(scheduleId, userProfile, client) {
  const { data, error } = await client.from("doctor_schedules").select(COLS).eq("id", scheduleId).maybeSingle();
  if (error) throw toApiError(error);
  if (!data) throw ApiError.notFound("Jadwal tidak ditemukan.");
  if (userProfile.role === "doctor" && data.doctor_id !== userProfile.id) {
    throw ApiError.forbidden("Anda hanya boleh mengelola jadwal praktik Anda sendiri.");
  }
  return data;
}

async function activeBookings(client, scheduleId) {
  const { data } = await client.rpc("schedule_booked_counts", { p_schedule_ids: [scheduleId] });
  return data?.[0]?.booked || 0;
}

export async function createSchedule(payload, userProfile, client) {
  const doctorId = userProfile.role === "doctor" ? userProfile.id : payload.doctor_id;
  if (!doctorId) throw ApiError.badRequest("Dokter wajib dipilih.");
  assertTimes(payload.start_time, payload.end_time);
  if (payload.schedule_date < todayJakarta()) throw ApiError.badRequest("Tanggal praktik tidak boleh di masa lalu.");

  const { data: overlap } = await client.from("doctor_schedules").select("id")
    .eq("doctor_id", doctorId).eq("schedule_date", payload.schedule_date)
    .lt("start_time", payload.end_time).gt("end_time", payload.start_time).limit(1);
  if (overlap?.length) throw ApiError.conflict("Jadwal bertabrakan dengan jadwal lain dokter ini pada tanggal yang sama.");

  const { data, error } = await client.from("doctor_schedules").insert({
    doctor_id: doctorId,
    schedule_date: payload.schedule_date,
    start_time: payload.start_time,
    end_time: payload.end_time,
    capacity: payload.capacity || 10,
    is_active: payload.is_active ?? true,
  }).select(COLS).single();
  if (error) throw toApiError(error, "Gagal membuat jadwal.");
  return data;
}

export async function updateSchedule(scheduleId, payload, userProfile, client) {
  const existing = await loadOwned(scheduleId, userProfile, client);
  assertTimes(payload.start_time || existing.start_time, payload.end_time || existing.end_time);
  if (payload.capacity !== undefined) {
    const b = await activeBookings(client, scheduleId);
    if (payload.capacity < b) throw ApiError.badRequest(`Kapasitas tidak boleh kurang dari jumlah booking aktif (${b}).`);
  }
  const { data, error } = await client.from("doctor_schedules").update(payload).eq("id", scheduleId).select(COLS).single();
  if (error) throw toApiError(error, "Gagal memperbarui jadwal.");
  return data;
}

/** Menghapus jadwal akan menghapus janji temu terkait (ON DELETE CASCADE) — jadi ditolak bila ada booking aktif. */
export async function deleteSchedule(scheduleId, userProfile, client) {
  await loadOwned(scheduleId, userProfile, client);
  const b = await activeBookings(client, scheduleId);
  if (b > 0) {
    throw ApiError.conflict(`Jadwal memiliki ${b} janji temu aktif. Nonaktifkan jadwal atau batalkan janji temu terlebih dahulu.`);
  }
  const { count } = await client.from("appointments").select("id", { count: "exact", head: true }).eq("schedule_id", scheduleId);
  if (count > 0) {
    // Ada riwayat (selesai/batal): nonaktifkan saja agar riwayat tidak hilang
    await client.from("doctor_schedules").update({ is_active: false }).eq("id", scheduleId);
    return { message: "Jadwal memiliki riwayat janji temu sehingga dinonaktifkan (tidak dihapus)." };
  }
  const { error } = await client.from("doctor_schedules").delete().eq("id", scheduleId);
  if (error) throw toApiError(error, "Gagal menghapus jadwal.");
  return { message: "Jadwal berhasil dihapus." };
}
