import { useState } from "react";
import { Link } from "react-router-dom";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, StatCard, Card, AsyncBlock, DataTable, StatusBadge, Button, ConfirmDialog } from "@/components/ui";
import { formatDateLong, formatTimeRange, todayJakarta, addDays } from "@/utils/format";
import toast from "@/lib/toast";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const today = todayJakarta();
  const queue = useApi(() => apiService.queue.today(), [], { interval: 10000 });
  const todays = useApi(() => apiService.appointments.list({ date: today }), [today], { interval: 15000 });
  const pending = useApi(() => apiService.appointments.list({ status: "pending", from: today, to: addDays(today, 60) }), [today]);
  const schedules = useApi(() => apiService.schedules.list({ mine: "true", from: today, to: addDays(today, 7) }), [today]);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const st = queue.data?.stats || {};
  const current = queue.data?.tickets?.find((t) => t.status === "serving") || queue.data?.tickets?.find((t) => t.status === "calling");

  const doConfirm = async () => {
    setBusy(true);
    try {
      await apiService.appointments.setStatus(confirm.id, "confirmed");
      toast.success("Janji temu dikonfirmasi."); setConfirm(null); pending.reload({ silent: true }); todays.reload({ silent: true });
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <SidebarLayout>
      <PageHeader title={`Selamat bertugas, ${user?.name || "Dokter"}`} description={formatDateLong(today)}
        actions={<Link to="/doctor/queue" className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-700 text-white shadow-md">Buka Antrean Hari Ini</Link>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard loading={todays.loading} label="Janji temu hari ini" value={(todays.data || []).filter((a) => a.status !== "cancelled").length} tone="blue" />
        <StatCard loading={queue.loading} label="Pasien menunggu" value={(st.waiting ?? 0) + (st.calling ?? 0)} tone="amber" />
        <StatCard loading={queue.loading} label="Selesai hari ini" value={st.done} tone="teal" />
        <StatCard loading={pending.loading} label="Perlu konfirmasi" value={pending.data?.length} tone="rose" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card title="Pasien Saat Ini">
          {current ? (
            <div className="text-center">
              <p className="text-xs font-bold text-gray-500 uppercase">{current.status === "serving" ? "Sedang diperiksa" : "Sedang dipanggil"}</p>
              <p className="text-5xl font-black text-blue-600 my-2">{current.queue_code}</p>
              <p className="font-semibold text-gray-900 dark:text-white">{current.patient_name}</p>
              <Link to={current.status === "serving" ? "/doctor/consultation" : "/doctor/queue"} className="mt-4 inline-flex px-4 py-2 rounded-xl text-sm font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                {current.status === "serving" ? "Lanjutkan Konsultasi" : "Mulai Pemeriksaan"}
              </Link>
            </div>
          ) : <p className="text-sm text-gray-500 text-center py-6">Belum ada pasien dipanggil.</p>}
        </Card>

        <Card title="Jadwal 7 Hari ke Depan" className="xl:col-span-2" actions={<Link to="/doctor/schedules" className="text-sm font-bold text-blue-600 hover:underline">Kelola</Link>}>
          <AsyncBlock loading={schedules.loading} error={schedules.error} onRetry={schedules.reload} empty={!schedules.data?.length}
            emptyTitle="Belum ada jadwal minggu ini" emptyAction={<Link to="/doctor/schedules" className="text-sm font-bold text-blue-600">+ Tambah jadwal</Link>}>
            <ul className="divide-y divide-gray-50 dark:divide-slate-700/60">
              {(schedules.data || []).map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                  <div><p className="font-semibold">{formatDateLong(s.schedule_date)}</p><p className="text-xs text-gray-500">{formatTimeRange(s.start_time, s.end_time)}</p></div>
                  <div className="text-right"><p className="font-bold">{s.booked_count}/{s.capacity}</p><StatusBadge status={s.is_active ? "active" : "inactive"} /></div>
                </li>
              ))}
            </ul>
          </AsyncBlock>
        </Card>
      </div>

      <Card title="Janji Temu Menunggu Konfirmasi" className="mt-6">
        <AsyncBlock loading={pending.loading} error={pending.error} onRetry={pending.reload} empty={!pending.data?.length} emptyTitle="Tidak ada janji temu yang perlu dikonfirmasi">
          <DataTable rows={pending.data || []} columns={[
            { key: "p", label: "Pasien", render: (a) => <span className="font-semibold">{a.patient_name}</span> },
            { key: "d", label: "Jadwal", render: (a) => `${formatDateLong(a.schedule_date)} · ${formatTimeRange(a.start_time, a.end_time)}` },
            { key: "c", label: "Keluhan", render: (a) => <span className="line-clamp-1 max-w-xs">{a.complaint || "–"}</span> },
            { key: "a", label: <span className="sr-only">Aksi</span>, className: "text-right", render: (a) => <Button size="sm" onClick={() => setConfirm(a)}>Konfirmasi</Button> },
          ]} />
        </AsyncBlock>
      </Card>
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doConfirm} processing={busy} variant="primary"
        title="Konfirmasi janji temu?" confirmLabel="Konfirmasi" message={confirm && `${confirm.patient_name} · ${formatDateLong(confirm.schedule_date)}`} />
    </SidebarLayout>
  );
}
