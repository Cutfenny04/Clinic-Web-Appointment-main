import { supabaseAuthClient, supabaseAdmin } from "../../config/supabase.js";
import { ApiError } from "../../utils/ApiError.js";
import { toApiError } from "../../utils/dbError.js";

const DETAIL_COLS = "specialty, bio, experience_years, consultation_fee, is_available";

function mapDoctor(p, includePrivate = false) {
  const d = Array.isArray(p.doctor_details) ? p.doctor_details[0] : p.doctor_details;
  return {
    id: p.id,
    name: p.full_name,
    full_name: p.full_name,
    role: p.role,
    specialty: d?.specialty || "Dokter Umum",
    bio: d?.bio || "",
    experience_years: d?.experience_years ?? 0,
    consultation_fee: Number(d?.consultation_fee ?? 0),
    is_available: d?.is_available !== false,
    is_active: p.is_active !== false,
    avatar_url: p.avatar_url || null,
    ...(includePrivate && { email: p.email || null, phone: p.phone || null, created_at: p.created_at }),
  };
}

/** Daftar dokter. Publik melihat dokter aktif saja; admin melihat semua + kontak. */
export async function getDoctorsList(client = supabaseAuthClient, query = {}, viewer = null) {
  const isAdmin = viewer?.role === "admin";
  let q = client
    .from("profiles")
    .select(`id, full_name, role, avatar_url, is_active, email, phone, created_at, doctor_details (${DETAIL_COLS})`)
    .eq("role", "doctor")
    .order("full_name");
  if (!isAdmin) q = q.eq("is_active", true);
  if (query.search) q = q.ilike("full_name", `%${query.search}%`);

  const { data, error } = await q;
  if (error) throw toApiError(error, "Gagal memuat daftar dokter.");

  let rows = (data || []).map((p) => mapDoctor(p, isAdmin));
  if (!isAdmin) rows = rows.filter((d) => d.is_available);
  if (query.specialty) {
    const s = String(query.specialty).toLowerCase();
    rows = rows.filter((d) => d.specialty.toLowerCase().includes(s));
  }
  return rows;
}

export async function getDoctorById(doctorId, client = supabaseAuthClient, viewer = null) {
  const { data, error } = await client
    .from("profiles")
    .select(`id, full_name, role, avatar_url, is_active, email, phone, created_at, doctor_details (${DETAIL_COLS})`)
    .eq("id", doctorId)
    .eq("role", "doctor")
    .maybeSingle();
  if (error) throw toApiError(error, "Gagal memuat data dokter.");
  if (!data) throw ApiError.notFound("Dokter tidak ditemukan.");
  return mapDoctor(data, viewer?.role === "admin" || viewer?.id === doctorId);
}

function requireAdminClient() {
  if (!supabaseAdmin) {
    throw new ApiError(503,
      "Pembuatan akun dokter membutuhkan SUPABASE_SERVICE_ROLE_KEY pada server backend. Hubungi pengelola sistem.");
  }
  return supabaseAdmin;
}

/**
 * Admin membuat dokter.
 * (a) Akun baru: { email, password, full_name, phone?, specialty, ... } → dibuat via Supabase Admin API
 * (b) Akun yang sudah ada: { user_id, specialty, ... } → dipromosikan menjadi dokter
 */
export async function createDoctor(payload, client) {
  const { user_id, email, password, full_name, phone, ...details } = payload;
  let doctorId = user_id;

  if (!doctorId) {
    const admin = requireAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone: phone || null },
    });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) throw ApiError.conflict("Email sudah terdaftar.");
      throw ApiError.badRequest("Gagal membuat akun dokter. Periksa email dan kata sandi.");
    }
    doctorId = data.user.id;
  } else {
    const { data: prof, error } = await client.from("profiles").select("id").eq("id", doctorId).maybeSingle();
    if (error) throw toApiError(error);
    if (!prof) throw ApiError.notFound("Pengguna tidak ditemukan.");
  }

  // Trigger membuat profil sebagai 'patient'; admin menaikkan role (diizinkan oleh trigger & RLS admin)
  const profileUpdate = { role: "doctor", is_active: true };
  if (full_name) profileUpdate.full_name = full_name;
  if (phone !== undefined) profileUpdate.phone = phone || null;
  const { error: roleErr } = await client.from("profiles").update(profileUpdate).eq("id", doctorId);
  if (roleErr) throw toApiError(roleErr, "Gagal menetapkan role dokter.");

  const { error: detErr } = await client.from("doctor_details").upsert({
    user_id: doctorId,
    specialty: details.specialty,
    bio: details.bio || "",
    experience_years: details.experience_years ?? 0,
    consultation_fee: details.consultation_fee ?? 0,
    is_available: details.is_available ?? true,
  });
  if (detErr) throw toApiError(detErr, "Gagal menyimpan detail dokter.");

  return getDoctorById(doctorId, client, { role: "admin" });
}

export async function updateDoctor(doctorId, payload, client, viewer) {
  const { full_name, phone, is_active, ...rest } = payload;
  const details = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));

  const profileUpdate = {};
  if (full_name !== undefined) profileUpdate.full_name = full_name;
  if (phone !== undefined) profileUpdate.phone = phone || null;
  if (is_active !== undefined) {
    if (viewer.role !== "admin") throw ApiError.forbidden("Hanya admin yang dapat mengubah status akun.");
    profileUpdate.is_active = is_active;
  }
  if (Object.keys(profileUpdate).length) {
    const { error } = await client.from("profiles").update(profileUpdate).eq("id", doctorId).eq("role", "doctor");
    if (error) throw toApiError(error, "Gagal memperbarui profil dokter.");
  }
  if (Object.keys(details).length) {
    const { error } = await client.from("doctor_details").update(details).eq("user_id", doctorId);
    if (error) throw toApiError(error, "Gagal memperbarui detail dokter.");
  }
  return getDoctorById(doctorId, client, viewer);
}

/**
 * "Hapus" dokter = nonaktifkan (soft delete) agar riwayat janji temu tetap utuh.
 * Ditolak bila masih ada janji temu aktif yang belum selesai.
 */
export async function deleteDoctor(doctorId, client) {
  const { count, error: cErr } = await client
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", doctorId)
    .in("status", ["pending", "confirmed", "checked_in", "in_progress"]);
  if (cErr) throw toApiError(cErr);
  if (count > 0) {
    throw ApiError.conflict(`Dokter masih memiliki ${count} janji temu aktif. Selesaikan atau batalkan terlebih dahulu.`);
  }
  const { error } = await client.from("profiles").update({ is_active: false }).eq("id", doctorId).eq("role", "doctor");
  if (error) throw toApiError(error, "Gagal menonaktifkan dokter.");
  await client.from("doctor_details").update({ is_available: false }).eq("user_id", doctorId);
  return { message: "Dokter berhasil dinonaktifkan. Riwayat konsultasi tetap tersimpan." };
}
