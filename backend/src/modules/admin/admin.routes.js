import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { toApiError } from "../../utils/dbError.js";
import { todayJakarta } from "../../utils/time.js";

const router = Router();
router.use(authenticate, authorize("admin"));

/** GET /api/v1/admin/stats — semua angka dihitung di database (tidak ada angka hardcoded) */
router.get("/stats", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.rpc("admin_dashboard_stats");
    if (error) throw toApiError(error, "Gagal memuat statistik.");
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/** GET /api/v1/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD — rekap janji temu per hari, dokter, status */
router.get("/reports", async (req, res, next) => {
  try {
    const to = req.query.to || todayJakarta();
    const from = req.query.from || new Date(Date.parse(to) - 29 * 864e5).toISOString().slice(0, 10);
    const { data: scheds, error: sErr } = await req.supabase.from("doctor_schedules")
      .select("id, doctor_id, schedule_date").gte("schedule_date", from).lte("schedule_date", to);
    if (sErr) throw toApiError(sErr);
    const S = Object.fromEntries((scheds || []).map((s) => [s.id, s]));
    let appts = [];
    if (scheds?.length) {
      const { data, error } = await req.supabase.from("appointments").select("id, schedule_id, doctor_id, status").in("schedule_id", Object.keys(S));
      if (error) throw toApiError(error);
      appts = data || [];
    }
    const { data: docs } = await req.supabase.from("profiles").select("id, full_name").eq("role", "doctor");
    const name = Object.fromEntries((docs || []).map((d) => [d.id, d.full_name]));

    const byDay = {}; const byDoctor = {}; const byStatus = {};
    for (const a of appts) {
      const d = S[a.schedule_id].schedule_date;
      (byDay[d] ||= { date: d, total: 0, completed: 0, cancelled: 0 }).total += 1;
      if (a.status === "completed") byDay[d].completed += 1;
      if (a.status === "cancelled") byDay[d].cancelled += 1;
      (byDoctor[a.doctor_id] ||= { doctor_id: a.doctor_id, doctor_name: name[a.doctor_id] || "Dokter", total: 0, completed: 0 }).total += 1;
      if (a.status === "completed") byDoctor[a.doctor_id].completed += 1;
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    }
    res.json({
      success: true,
      data: {
        from, to, total: appts.length,
        by_day: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
        by_doctor: Object.values(byDoctor).sort((a, b) => b.total - a.total),
        by_status: byStatus,
      },
    });
  } catch (err) { next(err); }
});

export default router;
