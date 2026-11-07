import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, Card, AsyncBlock, StatusBadge, Button, ConfirmDialog, Tabs, Field, Textarea } from "@/components/ui";
import AppointmentDetailModal from "@/components/shared/AppointmentDetailModal";
import { formatDateLong, formatTimeRange, todayJakarta } from "@/utils/format";
import toast from "@/lib/toast";

/** Aturan pembatalan sama dengan database: status pending/confirmed dan ≥ 1 jam sebelum praktik */
export function canCancel(a) {
  if (!["pending", "confirmed"].includes(a.status)) return false;
  const start = new Date(`${a.schedule_date}T${a.start_time}+07:00`).getTime();
  return start - Date.now() >= 60 * 60 * 1000;
}
export function canSelfCheckIn(a) {
  if (a.status !== "confirmed" || a.schedule_date !== todayJakarta()) return false;
  return new Date(`${a.schedule_date}T${a.end_time}+07:00`).getTime() > Date.now();
}

export default function PatientAppointments() {
  const { data, loading, error, reload } = useApi(() => apiService.appointments.mine(), [], { interval: 30000 });
  const [tab, setTab] = useState("upcoming");
  const [detail, setDetail] = useState(null);
  const [cancel, setCancel] = useState(null);
  const [reason, setReason] = useState("");
  const [checkin, setCheckin] = useState(null);
  const [busy, setBusy] = useState(false);
  const today = todayJakarta();

  const groups = useMemo(() => {
    const all = data || [];
    return {
      upcoming: all.filter((a) => ["pending", "confirmed", "checked_in", "in_progress"].includes(a.status) && a.schedule_date >= today)
        .sort((a, b) => (a.schedule_date + a.start_time).localeCompare(b.schedule_date + b.start_time)),
      completed: all.filter((a) => a.status === "completed"),
      cancelled: all.filter((a) => a.status === "cancelled" || (["pending", "confirmed"].includes(a.status) && a.schedule_date < today)),
    };
  }, [data, today]);
  const rows = groups[tab];

  const doCancel = async () => {
    setBusy(true);
    try {
      const r = await apiService.appointments.cancel(cancel.id, reason.trim() || undefined);
      toast.success(r.message); setCancel(null); setReason(""); reload({ silent: true });
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const doCheckin = async () => {
    setBusy(true);
    try {
      const r = await apiService.appointments.checkIn(checkin.id);
      toast.success(r.message); setCheckin(null); reload({ silent: true });
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <SidebarLayout>
      <PageHeader title="Janji Temu Saya" actions={<Link to="/patient/book" className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-700 text-white shadow-md">+ Buat Janji Temu</Link>} />
      <div className="mb-4"><Tabs value={tab} onChange={setTab} tabs={[
        { value: "upcoming", label: "Mendatang", count: groups.upcoming.length },
        { value: "completed", label: "Selesai", count: groups.completed.length },
        { value: "cancelled", label: "Dibatalkan / Terlewat", count: groups.cancelled.length },
      ]} /></div>
      <AsyncBlock loading={loading} error={error} onRetry={reload} empty={!rows.length}
        emptyTitle={tab === "upcoming" ? "Tidak ada janji temu mendatang" : "Tidak ada data"}
        emptyAction={tab === "upcoming" && <Link to="/patient/book" className="text-sm font-bold text-blue-600">Buat janji temu</Link>}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rows.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{a.doctor_name}</p>
                  <p className="text-sm text-teal-600 font-semibold">{a.doctor_specialty}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <p className="mt-3 text-sm text-gray-700 dark:text-slate-200">{formatDateLong(a.schedule_date)} · {formatTimeRange(a.start_time, a.end_time)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Nomor urut booking #{a.queue_number}{a.queue_ticket ? ` · Nomor antrean ${a.queue_ticket.queue_code}` : ""}
              </p>
              {a.status === "pending" && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Menunggu konfirmasi dari klinik.</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setDetail(a.id)}>Detail</Button>
                {canSelfCheckIn(a) && <Button size="sm" onClick={() => setCheckin(a)}>Check-in Sekarang</Button>}
                {a.queue_ticket && ["waiting", "calling", "serving"].includes(a.queue_ticket.status) && (
                  <Link to="/patient/queue" className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Lihat Antrean</Link>
                )}
                {canCancel(a) && <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setCancel(a)}>Batalkan</Button>}
              </div>
            </Card>
          ))}
        </div>
      </AsyncBlock>
      <AppointmentDetailModal appointmentId={detail} onClose={() => setDetail(null)} />
      <ConfirmDialog open={!!cancel} onClose={() => { setCancel(null); setReason(""); }} onConfirm={doCancel} processing={busy}
        title="Batalkan janji temu?" confirmLabel="Batalkan Janji Temu"
        message={cancel && `${cancel.doctor_name} · ${formatDateLong(cancel.schedule_date)}, ${formatTimeRange(cancel.start_time, cancel.end_time)}. Kuota akan dibuka kembali untuk pasien lain.`}>
        <Field label="Alasan (opsional)" htmlFor="pc-reason"><Textarea id="pc-reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </ConfirmDialog>
      <ConfirmDialog open={!!checkin} onClose={() => setCheckin(null)} onConfirm={doCheckin} processing={busy} variant="primary"
        title="Check-in sekarang?" confirmLabel="Check-in"
        message="Lakukan check-in saat Anda sudah berada di klinik. Nomor antrean akan dibuat otomatis." />
    </SidebarLayout>
  );
}
