import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { ApiError } from "../../utils/ApiError.js";
import { toApiError } from "../../utils/dbError.js";
import { getDoctorPhotoUrl } from "../../services/storage/doctorPhotoStorage.js";

/**
 * Fitur Pesan — chat pasien ↔ dokter dan pasien ↔ admin (kotak masuk bersama).
 * Semua aturan (siapa boleh chat siapa, privasi dari admin) ditegakkan di database
 * oleh fungsi chat_* (backend/sql/04_chat.sql) memakai token pengguna (req.supabase).
 * Alur booking/antrean tidak disentuh.
 */
const router = Router();
router.use(authenticate);

const uuid = z.string().uuid("ID tidak valid.");
const startSchema = z.object({
  kind: z.enum(["doctor", "admin"], { message: "Jenis percakapan harus 'doctor' atau 'admin'." }),
  other_id: uuid.optional().nullable(),
});
const sendSchema = z.object({
  body: z.string({ message: "Pesan wajib diisi." }).trim()
    .min(1, "Pesan tidak boleh kosong.").max(2000, "Pesan maksimal 2000 karakter."),
});

// Batasi spam: 30 pesan per menit per pengguna
const sendLimiter = rateLimit({
  windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => `chat:${req.user?.id}`,
  message: { success: false, message: "Terlalu banyak pesan. Tunggu sebentar lalu coba lagi." },
});

// Polling (GET) dibatasi per pengguna, bukan per IP: 240 request per menit cukup
// untuk beberapa tab terbuka sekaligus, tetapi tetap menahan klien yang rusak.
const readLimiter = rateLimit({
  windowMs: 60 * 1000, max: 240, standardHeaders: true, legacyHeaders: false,
  skip: (req) => req.method !== "GET",
  keyGenerator: (req) => `chat-read:${req.user?.id}`,
  message: { success: false, message: "Terlalu banyak permintaan pesan. Tunggu sebentar." },
});
router.use(readLimiter);

const viewer = (req) => ({ id: req.user.id, role: req.profile.role });

function checkId(req) {
  if (!uuid.safeParse(req.params.id).success) throw ApiError.badRequest("ID percakapan tidak valid.");
  return req.params.id;
}

/** Bentuk percakapan dari sudut pandang pengguna yang melihat. */
function present(row, viewer) {
  const isDoctorChat = row.kind === "doctor";
  let title, subtitle = null, photo_url = null, counterpart_id = null;
  if (viewer.role === "patient") {
    if (isDoctorChat) {
      title = row.doctor_name; subtitle = row.doctor_specialty;
      photo_url = getDoctorPhotoUrl(row.doctor_photo_path); counterpart_id = row.doctor_id;
    } else {
      title = "Admin Klinik"; subtitle = "Pertanyaan jadwal, biaya & booking";
    }
  } else {
    title = row.patient_name; subtitle = isDoctorChat ? "Pasien" : "Pasien · kotak masuk admin";
    counterpart_id = row.patient_id;
  }
  return {
    id: row.id, kind: row.kind, title, subtitle, photo_url, counterpart_id,
    last_message: row.last_message ?? null,
    last_message_mine: row.last_sender_id ? row.last_sender_id === viewer.id : false,
    last_message_at: row.last_message_at,
    unread_count: row.unread_count ?? 0,
    can_send: row.can_send !== false,
  };
}

// GET /api/v1/chat/conversations — daftar percakapan saya
router.get("/conversations", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.rpc("chat_list");
    if (error) throw toApiError(error, "Gagal memuat percakapan.");
    res.json({ success: true, data: (data || []).map((r) => present(r, viewer(req))) });
  } catch (err) { next(err); }
});

// GET /api/v1/chat/unread — total pesan belum dibaca (badge menu)
router.get("/unread", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.rpc("chat_unread_total");
    if (error) throw toApiError(error, "Gagal memuat jumlah pesan.");
    res.json({ success: true, data: { unread: Number(data) || 0 } });
  } catch (err) { next(err); }
});

// GET /api/v1/chat/contacts?search= — siapa saja yang boleh saya hubungi
router.get("/contacts", async (req, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.slice(0, 80) : null;
    const { data, error } = await req.supabase.rpc("chat_contacts", { p_search: search || null });
    if (error) throw toApiError(error, "Gagal memuat kontak.");
    res.json({
      success: true,
      data: (data || []).map((c) => ({
        id: c.id, name: c.full_name, role: c.role, specialty: c.specialty || null,
        photo_url: c.role === "doctor" ? getDoctorPhotoUrl(c.photo_path) : null,
      })),
    });
  } catch (err) { next(err); }
});

// POST /api/v1/chat/conversations — mulai/buka percakapan
router.post("/conversations", validate(startSchema), async (req, res, next) => {
  try {
    const { kind, other_id } = req.body;
    if (req.profile.role !== "patient" && !other_id) throw ApiError.badRequest("Pilih pasien yang ingin dihubungi.");
    if (req.profile.role === "patient" && kind === "doctor" && !other_id) throw ApiError.badRequest("Pilih dokter yang ingin dihubungi.");
    const { data: id, error } = await req.supabase.rpc("chat_start", { p_kind: kind, p_other: other_id ?? null });
    if (error) throw toApiError(error, "Gagal membuka percakapan.");
    const { data: rows, error: lErr } = await req.supabase.rpc("chat_list");
    if (lErr) throw toApiError(lErr, "Gagal memuat percakapan.");
    const row = (rows || []).find((r) => r.id === id);
    res.status(200).json({ success: true, data: row ? present(row, viewer(req)) : { id } });
  } catch (err) { next(err); }
});

// GET /api/v1/chat/conversations/:id/messages?after=<id pesan terakhir>
router.get("/conversations/:id/messages", async (req, res, next) => {
  try {
    const id = checkId(req);
    const after = Number.parseInt(req.query.after, 10);
    const { data, error } = await req.supabase.rpc("chat_history", {
      p_conversation: id, p_after: Number.isFinite(after) && after > 0 ? after : 0, p_limit: 200,
    });
    if (error) throw toApiError(error, "Gagal memuat pesan.");
    res.json({
      success: true,
      data: (data || []).map((m) => ({
        id: Number(m.id), body: m.body, created_at: m.created_at,
        mine: m.sender_id === req.user.id,
        sender_name: m.sender_name, sender_role: m.sender_role,
      })),
    });
  } catch (err) { next(err); }
});

// POST /api/v1/chat/conversations/:id/messages — kirim pesan
router.post("/conversations/:id/messages", sendLimiter, validate(sendSchema), async (req, res, next) => {
  try {
    const id = checkId(req);
    const { data, error } = await req.supabase.rpc("chat_send", { p_conversation: id, p_body: req.body.body });
    if (error) throw toApiError(error, "Gagal mengirim pesan.");
    const m = Array.isArray(data) ? data[0] : data;
    res.status(201).json({
      success: true,
      data: { id: Number(m.id), body: m.body, created_at: m.created_at, mine: true, sender_role: req.profile.role },
    });
  } catch (err) { next(err); }
});

// POST /api/v1/chat/conversations/:id/read — tandai sudah dibaca
router.post("/conversations/:id/read", async (req, res, next) => {
  try {
    const id = checkId(req);
    const { error } = await req.supabase.rpc("chat_mark_read", { p_conversation: id });
    if (error) throw toApiError(error, "Gagal memperbarui status baca.");
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
