import { useState } from "react";
import { Link } from "react-router-dom";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, Card, AsyncBlock, Button, Field, Textarea, Input, ConfirmDialog, StatusBadge, EmptyState } from "@/components/ui";
import { formatDateLong, formatTimeRange, formatDateTime } from "@/utils/format";
import toast from "@/lib/toast";

export default function DoctorConsultation() {
  const active = useApi(() => apiService.appointments.list({ status: "in_progress" }), []);
  const appt = active.data?.[0];
  const history = useApi(() => apiService.appointments.list({ patient_id: appt.patient_id, status: "completed" }), [appt?.patient_id], { enabled: !!appt });
  const [form, setForm] = useState({ diagnosis: "", consultation_notes: "" });
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const ask = () => {
    const e = {};
    if (form.diagnosis.trim().length < 2) e.diagnosis = "Diagnosis wajib diisi.";
    setErrors(e);
    if (!Object.keys(e).length) setConfirm(true);
  };
  const finish = async () => {
    setBusy(true);
    try {
      await apiService.appointments.setStatus(appt.id, "completed", {
        diagnosis: form.diagnosis.trim(), consultation_notes: form.consultation_notes.trim() || undefined,
      });
      toast.success("Konsultasi selesai dan tersimpan di riwayat pemeriksaan.");
      setConfirm(false); setForm({ diagnosis: "", consultation_notes: "" }); active.reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <SidebarLayout>
      <PageHeader title="Konsultasi" description="Pemeriksaan pasien yang sedang berlangsung." />
      <AsyncBlock loading={active.loading} error={active.error} onRetry={active.reload}>
        {!appt ? (
          <Card><EmptyState title="Tidak ada pemeriksaan yang berlangsung"
            description="Panggil pasien dari antrean lalu tekan “Mulai Pemeriksaan”."
            action={<Link to="/doctor/queue" className="inline-flex px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-teal-500 text-white">Ke Antrean Hari Ini</Link>} /></Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card title="Data Pasien">
              <p className="text-3xl font-black text-blue-600">{appt.queue_ticket?.queue_code || `#${appt.queue_number}`}</p>
              <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{appt.patient_name}</p>
              <p className="text-sm text-gray-500">{appt.patient_phone || "Tanpa nomor telepon"}</p>
              <div className="mt-4 space-y-1 text-sm">
                <p><span className="text-gray-500">Jadwal:</span> {formatDateLong(appt.schedule_date)}, {formatTimeRange(appt.start_time, appt.end_time)}</p>
                <p><span className="text-gray-500">Mulai diperiksa:</span> {formatDateTime(appt.started_at)}</p>
                <p className="flex items-center gap-2"><span className="text-gray-500">Status:</span> <StatusBadge status={appt.status} /></p>
              </div>
              <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-sm">
                <p className="font-bold text-amber-800 dark:text-amber-200 mb-1">Keluhan</p>
                <p className="text-amber-900 dark:text-amber-100">{appt.complaint || "Tidak diisi"}</p>
              </div>
            </Card>
            <Card title="Hasil Pemeriksaan" className="xl:col-span-2">
              <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="space-y-4" noValidate>
                <Field label="Diagnosis" error={errors.diagnosis} htmlFor="c-diag">
                  <Input id="c-diag" maxLength={500} value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} placeholder="Contoh: ISPA ringan" />
                </Field>
                <Field label="Catatan & Anjuran" hint="Terapi, anjuran, atau rencana kontrol." htmlFor="c-notes">
                  <Textarea id="c-notes" rows={6} maxLength={4000} value={form.consultation_notes} onChange={(e) => setForm({ ...form, consultation_notes: e.target.value })} />
                </Field>
                <div className="flex justify-end"><Button type="submit" variant="success">Selesaikan Konsultasi</Button></div>
              </form>
              <h3 className="mt-8 mb-2 text-sm font-bold text-gray-900 dark:text-white">Riwayat Pemeriksaan Sebelumnya (dengan Anda)</h3>
              <AsyncBlock loading={history.loading} error={history.error} empty={!history.data?.length} emptyTitle="Belum ada riwayat sebelumnya">
                <ul className="divide-y divide-gray-50 dark:divide-slate-700/60 text-sm">
                  {(history.data || []).map((h) => (
                    <li key={h.id} className="py-2"><p className="font-semibold">{formatDateLong(h.schedule_date)} — {h.diagnosis || "Tanpa diagnosis"}</p>
                      {h.consultation_notes && <p className="text-gray-500 whitespace-pre-line">{h.consultation_notes}</p>}</li>
                  ))}
                </ul>
              </AsyncBlock>
            </Card>
          </div>
        )}
      </AsyncBlock>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={finish} processing={busy} variant="success"
        title="Selesaikan konsultasi?" confirmLabel="Selesaikan"
        message="Diagnosis dan catatan akan disimpan dan tidak dapat diubah dari halaman ini. Status antrean pasien menjadi selesai." />
    </SidebarLayout>
  );
}
