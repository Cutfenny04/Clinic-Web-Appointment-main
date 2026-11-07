import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { ApiError } from "../../utils/ApiError.js";
import { toApiError } from "../../utils/dbError.js";
import { todayJakarta } from "../../utils/time.js";
import { queueClient } from "../../services/queueClient.js";

/**
 * Gateway antrean: frontend TIDAK pernah memanggil Queue Service langsung.
 * Backend memverifikasi pengguna & kepemilikan, lalu meneruskan dengan token internal.
 */
const router = Router();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

// Layar TV (publik, tanpa nama lengkap pasien)
const tvLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
router.get("/display", tvLimiter, async (req, res, next) => {
  try {
    res.json({ success: true, data: await queueClient.display(req.query.date || todayJakarta()) });
  } catch (err) { next(err); }
});

router.use(authenticate);

// Pasien: tiket miliknya
router.get("/mine", authorize("patient"), async (req, res, next) => {
  try {
    const tickets = await queueClient.list({ patient_id: req.user.id, date: req.query.date });
    // posisi dalam antrean untuk tiket hari ini yang masih menunggu
    const today = todayJakarta();
    const enriched = await Promise.all(tickets.map(async (t) => {
      if (t.date !== today || !["waiting", "calling"].includes(t.status)) return t;
      const queue = await queueClient.list({ doctor_id: t.doctor_id, date: t.date, status: "waiting,calling,serving" });
      const ahead = queue.filter((x) => x.queue_number < t.queue_number && x.status === "waiting").length;
      const current = queue.find((x) => x.status === "serving" || x.status === "calling");
      return { ...t, ahead, current_code: current?.queue_code || null };
    }));
    res.json({ success: true, data: enriched.reverse() });
  } catch (err) { next(err); }
});

// Dokter: antrean hari ini miliknya. Admin: semua (atau ?doctor_id=)
router.get("/today", authorize("doctor", "admin"), async (req, res, next) => {
  try {
    const doctorId = req.profile.role === "doctor" ? req.user.id : req.query.doctor_id;
    const d = req.query.date || todayJakarta();
    const [tickets, stats] = await Promise.all([
      queueClient.list({ doctor_id: doctorId, date: d }),
      queueClient.stats({ date: d, doctor_id: doctorId }),
    ]);
    res.json({ success: true, data: { date: d, tickets, stats } });
  } catch (err) { next(err); }
});

// Panggil pasien berikutnya
router.post("/call", authorize("doctor", "admin"),
  validate(z.object({ doctor_id: z.string().uuid().optional(), date })), async (req, res, next) => {
    try {
      const doctorId = req.profile.role === "doctor" ? req.user.id : req.body.doctor_id;
      if (!doctorId) throw ApiError.badRequest("Dokter wajib dipilih.");
      const ticket = await queueClient.callNext(doctorId, req.body.date || todayJakarta(), req.user.id);
      res.json({
        success: true,
        message: ticket ? `Memanggil nomor antrean ${ticket.queue_code}.` : "Tidak ada pasien yang menunggu.",
        data: ticket,
      });
    } catch (err) { next(err); }
  });

// Ubah status tiket (lewati / kembalikan ke antrean / mulai / selesai)
router.patch("/:ticketId/status", authorize("doctor", "admin"),
  validate(z.object({ status: z.enum(["waiting", "calling", "serving", "done", "skipped"], { errorMap: () => ({ message: "Status antrean tidak valid." }) }) })),
  async (req, res, next) => {
    try {
      // RLS: dokter hanya dapat melihat tiket miliknya → sekaligus cek kepemilikan
      const { data: t, error } = await req.supabase.from("queue_tickets").select("id, doctor_id").eq("id", req.params.ticketId).maybeSingle();
      if (error) throw toApiError(error);
      if (!t) throw ApiError.notFound("Tiket antrean tidak ditemukan.");
      if (req.profile.role === "doctor" && t.doctor_id !== req.user.id) throw ApiError.forbidden("Tiket ini bukan antrean Anda.");
      const ticket = await queueClient.setStatus(req.params.ticketId, req.body.status, req.user.id);
      res.json({ success: true, message: "Status antrean diperbarui.", data: ticket });
    } catch (err) { next(err); }
  });

export default router;
