import { useState } from "react";
import { Link } from "react-router-dom";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, StatCard, Card, AsyncBlock, DataTable, StatusBadge, Button, ConfirmDialog } from "@/components/ui";
import AppointmentDetailModal from "@/components/shared/AppointmentDetailModal";
import { formatDateLong, formatTimeRange, todayJakarta } from "@/utils/format";
import toast from "@/lib/toast";

const Ico = ({ d }) => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d} /></svg>;

export default function AdminDashboard() {
  const today = todayJakarta();
  const stats = useApi(() => apiService.admin.stats(), [], { interval: 15000 });
  const appts = useApi(() => apiService.appointments.list({ date: today }), [today], { interval: 15000 });
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null); // {appt, action}
  const [processing, setProcessing] = useState(false);
  const s = stats.data || {};

  const run = async () => {
    const { appt, action } = confirm;
    setProcessing(true);
    try {
      const r = action === "check_in"
        ? await apiService.appointments.checkIn(appt.id)
        : await apiService.appointments.setStatus(appt.id, "confirmed");
      toast.success(r.message);
      setConfirm(null);
      appts.reload({ silent: true });
      stats.reload({ silent: true });
    } catch (e) { toast.error(e.message); } finally { setProcessing(false); }
  };

  const rows = (appts.data || []).filter((a) => a.status !== "cancelled")
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "") || (a.queue_number || 0) - (b.queue_number || 0));

  return (
    <SidebarLayout>
      <PageHeader title="Ringkasan Klinik" description={`Data langsung dari database · ${formatDateLong(today)}`}
        actions={<Link to="/queue/tv" target="_blank" className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50">Buka Layar Antrean (TV)</Link>} />

      {stats.error ? (
        <Card className="mb-6"><AsyncBlock error={stats.error} onRetry={stats.reload} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          <StatCard loading={stats.loading} label="Dokter aktif" value={s.active_doctors} tone="blue" icon={<Ico d="M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M15 7a3 3 0 11-6 0 3 3 0 016 0z" />} />
          <StatCard loading={stats.loading} label="Pasien terdaftar" value={s.registered_patients} tone="teal" icon={<Ico d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1z" />} />
          <StatCard loading={stats.loading} label="Janji temu hari ini" value={s.appointments_today} tone="violet" icon={<Ico d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />} />
          <StatCard loading={stats.loading} label="Janji temu mendatang" value={s.appointments_upcoming} hint="Menunggu & dikonfirmasi" tone="amber" icon={<Ico d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />} />
          <StatCard loading={stats.loading} label="Pasien menunggu" value={s.patients_waiting} hint="Antrean hari ini" tone="rose" icon={<Ico d="M4 6h16M4 10h16M4 14h10M4 18h6" />} />
          <StatCard loading={stats.loading} label="Konsultasi selesai" value={s.consultations_completed} hint="Sepanjang waktu" tone="slate" icon={<Ico d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />} />
        </div>
      )}

      <Card title="Janji Temu Hari Ini" actions={<Link to="/admin/appointments" className="text-sm font-bold text-blue-600 hover:underline">Lihat semua</Link>}>
        <AsyncBlock loading={appts.loading} error={appts.error} onRetry={appts.reload} empty={!rows.length}
          emptyTitle="Tidak ada janji temu hari ini">
          <DataTable rows={rows} onRowClick={(a) => setDetail(a.id)} columns={[
            { key: "no", label: "No.", render: (a) => a.queue_ticket?.queue_code || `#${a.queue_number}` },
            { key: "patient", label: "Pasien", render: (a) => <span className="font-semibold">{a.patient_name}</span> },
            { key: "doctor", label: "Dokter", render: (a) => a.doctor_name },
            { key: "time", label: "Jam", render: (a) => <span className="whitespace-nowrap">{formatTimeRange(a.start_time, a.end_time)}</span> },
            { key: "status", label: "Status", render: (a) => <StatusBadge status={a.status} /> },
            { key: "act", label: <span className="sr-only">Aksi</span>, className: "text-right", render: (a) => (
              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                {a.status === "pending" && <Button size="sm" variant="secondary" onClick={() => setConfirm({ appt: a, action: "confirm" })}>Konfirmasi</Button>}
                {["pending", "confirmed"].includes(a.status) && <Button size="sm" onClick={() => setConfirm({ appt: a, action: "check_in" })}>Check-in</Button>}
              </div>) },
          ]} />
        </AsyncBlock>
      </Card>

      <AppointmentDetailModal appointmentId={detail} onClose={() => setDetail(null)} />
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={run} processing={processing} variant="primary"
        title={confirm?.action === "check_in" ? "Check-in pasien?" : "Konfirmasi janji temu?"}
        confirmLabel={confirm?.action === "check_in" ? "Check-in & Buat Nomor Antrean" : "Konfirmasi"}
        message={confirm && `${confirm.appt.patient_name} — ${confirm.appt.doctor_name}. ${confirm.action === "check_in" ? "Nomor antrean akan dibuat otomatis." : ""}`} />
    </SidebarLayout>
  );
}
