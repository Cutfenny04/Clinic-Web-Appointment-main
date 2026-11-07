import { useState } from "react";
import { Link } from "react-router-dom";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, Card, AsyncBlock, StatCard, DataTable, Button, ConfirmDialog, StatusBadge } from "@/components/ui";
import { DoctorQueueCard, useGrouped } from "@/components/shared/QueueBoard";
import { formatDateLong, formatTimeRange, todayJakarta } from "@/utils/format";
import toast from "@/lib/toast";

export default function AdminQueue() {
  const today = todayJakarta();
  const q = useApi(() => apiService.queue.today(), [], { interval: 5000 });
  const pending = useApi(() => apiService.appointments.list({ date: today, status: "pending,confirmed" }), [today], { interval: 15000 });
  const groups = useGrouped(q.data?.tickets);
  const st = q.data?.stats || {};
  const [checkin, setCheckin] = useState(null);
  const [busy, setBusy] = useState(false);

  const doCheckin = async () => {
    setBusy(true);
    try {
      const r = await apiService.appointments.checkIn(checkin.id);
      toast.success(r.message); setCheckin(null); q.reload({ silent: true }); pending.reload({ silent: true });
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <SidebarLayout>
      <PageHeader title="Antrean Hari Ini" description={`${formatDateLong(today)} · diperbarui otomatis setiap 5 detik`}
        actions={<Link to="/queue/tv" target="_blank" className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-md">Buka Layar TV</Link>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard loading={q.loading} label="Total tiket" value={st.total} tone="blue" />
        <StatCard loading={q.loading} label="Menunggu" value={(st.waiting ?? 0) + (st.calling ?? 0)} tone="amber" />
        <StatCard loading={q.loading} label="Sedang diperiksa" value={st.serving} tone="violet" />
        <StatCard loading={q.loading} label="Selesai" value={st.done} tone="teal" />
      </div>

      <Card title="Menunggu Check-in" className="mb-6">
        <AsyncBlock loading={pending.loading} error={pending.error} onRetry={pending.reload} empty={!pending.data?.length}
          emptyTitle="Semua pasien hari ini sudah check-in">
          <DataTable rows={pending.data || []} columns={[
            { key: "p", label: "Pasien", render: (a) => <span className="font-semibold">{a.patient_name}</span> },
            { key: "d", label: "Dokter", render: (a) => a.doctor_name },
            { key: "t", label: "Jam", render: (a) => formatTimeRange(a.start_time, a.end_time) },
            { key: "s", label: "Status", render: (a) => <StatusBadge status={a.status} /> },
            { key: "a", label: <span className="sr-only">Aksi</span>, className: "text-right", render: (a) => <Button size="sm" onClick={() => setCheckin(a)}>Check-in</Button> },
          ]} />
        </AsyncBlock>
      </Card>

      <AsyncBlock loading={q.loading} error={q.error} onRetry={q.reload} empty={!groups.length}
        emptyTitle="Belum ada antrean hari ini" emptyDescription="Nomor antrean dibuat otomatis saat pasien check-in.">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {groups.map((g) => (
            <DoctorQueueCard key={g.doctor_id} doctorId={g.doctor_id} doctorName={g.doctor_name} tickets={g.tickets} onChanged={() => q.reload({ silent: true })} />
          ))}
        </div>
      </AsyncBlock>

      <ConfirmDialog open={!!checkin} onClose={() => setCheckin(null)} onConfirm={doCheckin} processing={busy} variant="primary"
        title="Check-in pasien?" confirmLabel="Check-in & Buat Nomor"
        message={checkin && `${checkin.patient_name} — ${checkin.doctor_name}. Nomor antrean akan dibuat otomatis.`} />
    </SidebarLayout>
  );
}
