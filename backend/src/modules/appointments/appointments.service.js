import { ApiError } from "../../utils/ApiError.js";

/**
 * Membuat appointment baru dengan proteksi double-booking dan kapasitas
 */
export async function createAppointment({ schedule_id, complaint }, user, client) {
  const patient_id = user.id;

  // 1. Coba eksekusi melalui PostgreSQL RPC book_appointment_atomic jika tersedia
  const { data: rpcData, error: rpcError } = await client.rpc(
    "book_appointment_atomic",
    {
      p_patient_id: patient_id,
      p_schedule_id: schedule_id,
      p_complaint: complaint || null,
    }
  );

  if (!rpcError && rpcData) {
    return rpcData;
  }

  // Jika RPC melempar exception custom (P0004, P0005, P0006)
  if (rpcError) {
    const msg = rpcError.message || "";
    if (msg.includes("sudah memiliki janji temu") || rpcError.code === "P0005") {
      throw ApiError.conflict("Anda sudah memiliki janji temu aktif pada jadwal ini.");
    }
    if (msg.includes("penuh") || rpcError.code === "P0006") {
      throw ApiError.conflict("Kapasitas jadwal dokter sudah penuh.");
    }
    if (msg.includes("sudah lewat") || rpcError.code === "P0004") {
      throw ApiError.badRequest("Tidak dapat membuat janji untuk jadwal yang sudah lewat.");
    }
    if (msg.includes("tidak ditemukan") || rpcError.code === "P0002") {
      throw ApiError.notFound("Jadwal dokter tidak ditemukan.");
    }
    if (msg.includes("tidak aktif") || rpcError.code === "P0003") {
      throw ApiError.badRequest("Jadwal dokter sedang tidak aktif.");
    }
    // Jika RPC belum diinstall di Supabase, fallback ke logic Node.js di bawah:
  }

  // 2. Fallback: Logika pemeriksaan langsung di Node.js
  const { data: schedule, error: schedErr } = await client
    .from("doctor_schedules")
    .select("id, doctor_id, schedule_date, is_active, capacity")
    .eq("id", schedule_id)
    .single();

  if (schedErr || !schedule) {
    throw ApiError.notFound("Jadwal dokter tidak ditemukan.");
  }

  if (!schedule.is_active) {
    throw ApiError.badRequest("Jadwal dokter sedang tidak aktif.");
  }

  // Cek apakah tanggal jadwal sudah lewat
  const today = new Date().toISOString().split("T")[0];
  if (schedule.schedule_date && schedule.schedule_date < today) {
    throw ApiError.badRequest("Tidak dapat membuat janji untuk jadwal yang sudah lewat.");
  }

  // Cek double booking
  const { data: existingAppt } = await client
    .from("appointments")
    .select("id")
    .eq("patient_id", patient_id)
    .eq("schedule_id", schedule_id)
    .neq("status", "cancelled")
    .limit(1);

  if (existingAppt && existingAppt.length > 0) {
    throw ApiError.conflict("Anda sudah memiliki janji temu aktif pada jadwal ini.");
  }

  // Cek kapasitas
  const { count: bookedCount, error: countErr } = await client
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("schedule_id", schedule_id)
    .neq("status", "cancelled");

  if (!countErr && bookedCount >= (schedule.capacity || 10)) {
    throw ApiError.conflict("Kapasitas jadwal dokter sudah penuh.");
  }

  // Insert appointment
  const nextQueue = (bookedCount || 0) + 1;
  const insertPayload = {
    patient_id,
    doctor_id: schedule.doctor_id,
    schedule_id,
    status: "pending",
    complaint: complaint || null,
  };

  const { data: newAppt, error: insertErr } = await client
    .from("appointments")
    .insert(insertPayload)
    .select()
    .single();

  if (insertErr) {
    throw ApiError.internal("Gagal membuat janji temu: " + insertErr.message);
  }

  return {
    ...newAppt,
    queue_number: nextQueue,
  };
}

async function enrichAppointments(client, appts) {
  if (!appts || appts.length === 0) return [];
  const doctorIds = [...new Set(appts.map((a) => a.doctor_id).filter(Boolean))];
  const patientIds = [...new Set(appts.map((a) => a.patient_id).filter(Boolean))];
  const scheduleIds = [...new Set(appts.map((a) => a.schedule_id).filter(Boolean))];

  const profileIds = [...new Set([...doctorIds, ...patientIds])];
  const profileMap = {};
  if (profileIds.length > 0) {
    const { data: profs } = await client
      .from("profiles")
      .select("id, full_name")
      .in("id", profileIds);
    (profs || []).forEach((p) => {
      profileMap[p.id] = p.full_name;
    });
  }

  const scheduleMap = {};
  if (scheduleIds.length > 0) {
    const { data: scheds } = await client
      .from("doctor_schedules")
      .select("id, schedule_date, start_time, end_time")
      .in("id", scheduleIds);
    (scheds || []).forEach((s) => {
      scheduleMap[s.id] = s;
    });
  }

  return appts.map((a) => ({
    id: a.id,
    patient_id: a.patient_id,
    patient_name: profileMap[a.patient_id] || "Pasien",
    doctor_id: a.doctor_id,
    doctor_name: profileMap[a.doctor_id] || "Dokter",
    schedule_id: a.schedule_id,
    schedule_date: scheduleMap[a.schedule_id]?.schedule_date || null,
    start_time: scheduleMap[a.schedule_id]?.start_time || null,
    end_time: scheduleMap[a.schedule_id]?.end_time || null,
    status: a.status,
    complaint: a.complaint,
    created_at: a.created_at,
  }));
}

/**
 * Mengambil daftar appointment milik pasien yang sedang login
 */
export async function getMyAppointments(patientId, client) {
  const { data, error } = await client
    .from("appointments")
    .select("id, patient_id, doctor_id, schedule_id, status, complaint, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) {
    throw ApiError.internal("Gagal memuat janji temu: " + error.message);
  }

  return enrichAppointments(client, data || []);
}

/**
 * Mengambil seluruh appointment (Admin & Dokter)
 */
export async function getAllAppointments(userProfile, client, query = {}) {
  let dbQuery = client
    .from("appointments")
    .select("id, patient_id, doctor_id, schedule_id, status, complaint, created_at")
    .order("created_at", { ascending: false });

  // Jika dokter, batasi hanya janji temu untuk dokter tersebut
  if (userProfile.role === "doctor") {
    dbQuery = dbQuery.eq("doctor_id", userProfile.id);
  }

  if (query.status) {
    dbQuery = dbQuery.eq("status", query.status);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw ApiError.internal("Gagal memuat daftar janji temu: " + error.message);
  }

  return enrichAppointments(client, data || []);
}

/**
 * Mengambil appointment berdasarkan ID dengan validasi kepemilikan data
 */
export async function getAppointmentById(appointmentId, userProfile, client) {
  const { data: appt, error } = await client
    .from("appointments")
    .select("id, patient_id, doctor_id, schedule_id, status, complaint, created_at")
    .eq("id", appointmentId)
    .single();

  if (error || !appt) {
    throw ApiError.notFound("Janji temu tidak ditemukan.");
  }

  // Validasi akses: pasien pemilik, dokter pemeriksa, atau admin
  const isOwner =
    appt.patient_id === userProfile.id ||
    appt.doctor_id === userProfile.id ||
    userProfile.role === "admin";

  if (!isOwner) {
    throw ApiError.forbidden("Anda tidak memiliki akses ke data janji temu ini.");
  }

  const enriched = await enrichAppointments(client, [appt]);
  return enriched[0];
}

/**
 * Membatalkan appointment oleh Pasien
 */
export async function cancelAppointment(appointmentId, userProfile, client) {
  const { data: appt, error: findErr } = await client
    .from("appointments")
    .select("id, patient_id, status")
    .eq("id", appointmentId)
    .single();

  if (findErr || !appt) {
    throw ApiError.notFound("Janji temu tidak ditemukan.");
  }

  // Pasien hanya bisa membatalkan miliknya sendiri (kecuali admin)
  if (userProfile.role !== "admin" && appt.patient_id !== userProfile.id) {
    throw ApiError.forbidden("Anda hanya dapat membatalkan janji temu Anda sendiri.");
  }

  // Tidak boleh membatalkan yang sudah in_progress, completed, atau already cancelled
  if (appt.status === "cancelled") {
    throw ApiError.badRequest("Janji temu sudah dibatalkan sebelumnya.");
  }
  if (appt.status === "in_progress" || appt.status === "completed") {
    throw ApiError.badRequest(
      `Tidak dapat membatalkan janji temu dengan status '${appt.status}'.`
    );
  }

  const { data, error } = await client
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
    .select()
    .single();

  if (error) {
    throw ApiError.internal("Gagal membatalkan janji temu: " + error.message);
  }

  return {
    message: "Janji temu berhasil dibatalkan.",
    appointment: data,
  };
}

/**
 * Mengupdate status appointment (Dokter / Admin)
 */
export async function updateAppointmentStatus(appointmentId, newStatus, userProfile, client) {
  const { data: appt, error: findErr } = await client
    .from("appointments")
    .select("id, doctor_id, status")
    .eq("id", appointmentId)
    .single();

  if (findErr || !appt) {
    throw ApiError.notFound("Janji temu tidak ditemukan.");
  }

  // Dokter hanya boleh mengupdate status untuk appointment miliknya
  if (userProfile.role === "doctor" && appt.doctor_id !== userProfile.id) {
    throw ApiError.forbidden("Anda hanya dapat mengubah status janji temu pasien Anda.");
  }

  const { data, error } = await client
    .from("appointments")
    .update({ status: newStatus })
    .eq("id", appointmentId)
    .select()
    .single();

  if (error) {
    throw ApiError.internal("Gagal mengubah status janji temu: " + error.message);
  }

  return data;
}
