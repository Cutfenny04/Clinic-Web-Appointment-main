import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, Card, AsyncBlock, Button, Field, Select, Textarea, ConfirmDialog, cx, EmptyState } from "@/components/ui";
import MiniCalendar from "@/components/shared/MiniCalendar";
import { formatCurrency, formatDateLong, formatTimeRange, todayJakarta, addDays } from "@/utils/format";

const STEPS = ["Pilih Dokter", "Pilih Tanggal & Sesi", "Isi Keluhan", "Selesai"];

export default function PatientBook() {
  const [params, setParams] = useSearchParams();
  const today = todayJakarta();
  const doctors = useApi(() => apiService.doctors.list(), []);
  const [doctorId, setDoctorId] = useState(params.get("doctor") || "");
  const schedules = useApi(
    () => apiService.schedules.list({ doctor_id: doctorId, is_active: "true", from: today, to: addDays(today, 60) }),
    [doctorId], { enabled: !!doctorId }
  );
  const [date, setDate] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [complaint, setComplaint] = useState("");
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);

  const doctor = (doctors.data || []).find((d) => d.id === doctorId);
  const nowLocal = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  const usable = useMemo(() => (schedules.data || []).filter((s) => !(s.schedule_date === today && s.end_time.slice(0, 5) <= nowLocal)), [schedules.data, today, nowLocal]);
  const available = useMemo(() => new Set(usable.filter((s) => !s.is_full).map((s) => s.schedule_date)), [usable]);
  const sessions = usable.filter((s) => s.schedule_date === date);
  const schedule = usable.find((s) => s.id === scheduleId);
  const step = result ? 3 : !doctorId ? 0 : !schedule ? 1 : 2;

  useEffect(() => { setDate(""); setScheduleId(""); }, [doctorId]);
  useEffect(() => { setScheduleId(""); }, [date]);

  const pickDoctor = (id) => { setDoctorId(id); setParams(id ? { doctor: id } : {}, { replace: true }); };

  const review = () => {
    const e = {};
    if (!schedule) e.schedule = "Pilih sesi praktik.";
    if (complaint.trim().length < 5) e.complaint = "Jelaskan keluhan Anda (minimal 5 karakter).";
    setErrors(e);
    if (!Object.keys(e).length) { setSubmitError(null); setConfirm(true); }
  };

  const submit = async () => {
    setSubmitting(true); setSubmitError(null);
    try {
      const r = await apiService.appointments.create({ schedule_id: scheduleId, complaint: complaint.trim() });
      setResult(r.data); setConfirm(false);
    } catch (e) {
      setSubmitError(e.message);
      schedules.reload({ silent: true }); // kuota mungkin berubah
    } finally { setSubmitting(false); }
  };

  return (
    <SidebarLayout>
      <PageHeader title="Buat Janji Temu" description="Booking diproses secara atomik: kuota tidak akan terlampaui." />
      <ol className="flex gap-2 mb-6 overflow-x-auto" aria-label="Langkah booking">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined}
            className={cx("flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap",
              i < step ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" : i === step ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400 dark:bg-slate-800")}>
            <span>{i + 1}</span>{s}
          </li>
        ))}
      </ol>

      {result ? (
        <Card className="max-w-xl">
          <div className="text-center py-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center text-3xl mb-4" aria-hidden="true">✓</div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Janji temu berhasil dibuat</h2>
            <p className="text-sm text-gray-500 mt-1">Status: menunggu konfirmasi klinik.</p>
            <div className="mt-6 text-left rounded-xl bg-gray-50 dark:bg-slate-700/40 p-4 text-sm space-y-1">
              <p><span className="text-gray-500">Dokter:</span> <strong>{result.doctor_name}</strong></p>
              <p><span className="text-gray-500">Jadwal:</span> {formatDateLong(result.schedule_date)}, {formatTimeRange(result.start_time, result.end_time)}</p>
              <p><span className="text-gray-500">Nomor urut booking:</span> <strong>#{result.queue_number}</strong></p>
            </div>
            <p className="mt-4 text-xs text-gray-500">Nomor antrean dibuat saat Anda check-in di klinik pada hari praktik.</p>
            <div className="mt-6 flex justify-center gap-2">
              <Link to="/patient/appointments" className="inline-flex px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-teal-500 text-white">Lihat Janji Temu Saya</Link>
              <Button variant="secondary" onClick={() => { setResult(null); setScheduleId(""); setComplaint(""); schedules.reload(); }}>Buat Lagi</Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card title="1. Dokter">
            <AsyncBlock loading={doctors.loading} error={doctors.error} onRetry={doctors.reload} empty={!doctors.data?.length} emptyTitle="Belum ada dokter yang menerima pasien">
              <Field label="Pilih dokter" htmlFor="b-doc">
                <Select id="b-doc" value={doctorId} onChange={(e) => pickDoctor(e.target.value)}>
                  <option value="">— Pilih dokter —</option>
                  {(doctors.data || []).map((d) => <option key={d.id} value={d.id}>{d.name} · {d.specialty}</option>)}
                </Select>
              </Field>
              {doctor && (
                <div className="mt-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4 text-sm">
                  <p className="font-bold text-gray-900 dark:text-white">{doctor.name}</p>
                  <p className="text-teal-700 dark:text-teal-300 font-semibold">{doctor.specialty}</p>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">Biaya konsultasi {formatCurrency(doctor.consultation_fee)}</p>
                </div>
              )}
            </AsyncBlock>
          </Card>

          <Card title="2. Tanggal & Sesi">
            {!doctorId ? <EmptyState title="Pilih dokter terlebih dahulu" /> : (
              <AsyncBlock loading={schedules.loading} error={schedules.error} onRetry={schedules.reload} empty={!available.size}
                emptyTitle="Belum ada jadwal tersedia" emptyDescription="Dokter ini belum membuka jadwal atau semua kuota penuh dalam 60 hari ke depan.">
                <MiniCalendar value={date} onChange={setDate} available={available} />
                {date && (
                  <div className="mt-5">
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Sesi pada {formatDateLong(date)}</p>
                    <div className="space-y-2" role="radiogroup" aria-label="Pilih sesi praktik">
                      {sessions.map((s) => (
                        <button key={s.id} type="button" role="radio" aria-checked={scheduleId === s.id} disabled={s.is_full}
                          onClick={() => setScheduleId(s.id)}
                          className={cx("w-full flex items-center justify-between p-3 rounded-xl border text-sm font-semibold transition-all",
                            scheduleId === s.id ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                              : s.is_full ? "border-gray-100 dark:border-slate-700 text-gray-300 cursor-not-allowed"
                                : "border-gray-200 dark:border-slate-600 hover:border-blue-300")}>
                          <span>{formatTimeRange(s.start_time, s.end_time)}</span>
                          <span className={s.is_full ? "text-rose-500" : "text-teal-600"}>{s.is_full ? "Penuh" : `Sisa ${s.remaining} dari ${s.capacity}`}</span>
                        </button>
                      ))}
                    </div>
                    {errors.schedule && <p className="mt-1 text-xs text-rose-600">{errors.schedule}</p>}
                  </div>
                )}
              </AsyncBlock>
            )}
          </Card>

          <Card title="3. Keluhan">
            {!schedule ? <EmptyState title="Pilih sesi praktik terlebih dahulu" /> : (
              <form onSubmit={(e) => { e.preventDefault(); review(); }} noValidate className="space-y-4">
                <Field label="Keluhan utama" error={errors.complaint} hint={`${complaint.length}/1000 karakter`} htmlFor="b-comp">
                  <Textarea id="b-comp" rows={6} maxLength={1000} value={complaint} onChange={(e) => { setComplaint(e.target.value); if (errors.complaint) setErrors({}); }}
                    placeholder="Contoh: demam 3 hari disertai batuk." />
                </Field>
                <p className="text-xs text-gray-500">Pembatalan dapat dilakukan paling lambat 1 jam sebelum jam praktik dimulai.</p>
                <Button type="submit" className="w-full">Tinjau Booking</Button>
              </form>
            )}
          </Card>
        </div>
      )}

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={submit} processing={submitting} variant="primary"
        title="Konfirmasi Janji Temu" confirmLabel="Ya, Buat Janji Temu">
        {schedule && (
          <div className="text-sm space-y-1">
            <p><span className="text-gray-500">Dokter:</span> <strong>{doctor?.name}</strong> ({doctor?.specialty})</p>
            <p><span className="text-gray-500">Tanggal:</span> {formatDateLong(schedule.schedule_date)}</p>
            <p><span className="text-gray-500">Jam:</span> {formatTimeRange(schedule.start_time, schedule.end_time)}</p>
            <p><span className="text-gray-500">Keluhan:</span> {complaint}</p>
            {submitError && <p role="alert" className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 font-semibold">{submitError}</p>}
          </div>
        )}
      </ConfirmDialog>
    </SidebarLayout>
  );
}
