import { useMemo, useState } from "react";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, Card, AsyncBlock, DataTable, StatusBadge, Button, ConfirmDialog, Tabs, Input, Select, Field, Textarea } from "@/components/ui";
import AppointmentDetailModal from "@/components/shared/AppointmentDetailModal";
import { formatDateLong, formatTimeRange, todayJakarta, addDays } from "@/utils/format";
import toast from "@/lib/toast";

const TABS = [
  { value: "", label: "Semua" }, { value: "pending", label: "Menunggu" }, { value: "confirmed", label: "Dikonfirmasi" },
  { value: "checked_in", label: "Check-in" }, { value: "in_progress", label: "Diperiksa" },
  { value: "completed", label: "Selesai" }, { value: "cancelled", label: "Dibatalkan" },
];

export default function AdminAppointments() {
  const today = todayJakarta();
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(addDays(today, 30));
  const [doctorId, setDoctorId] = useState("");
  const params = useMemo(() => ({ status: status || undefined, from, to, doctor_id: doctorId || undefined }), [status, from, to, doctorId]);
  const { data, loading, error, reload } = useApi(() => apiService.appointments.list(params), [JSON.stringify(params)], { interval: 20000 });
  const { data: doctors } = useApi(() => apiService.doctors.list(), []);
  const [detail, setDetail] = useState(null);
  const [action, setAction] = useState(null); // {appt, type}
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => [...(data || [])].sort((a, b) =>
    (a.schedule_date || "").localeCompare(b.schedule_date || "") || (a.start_time || "").localeCompare(b.start_time || "") ||
    (a.queue_number || 0) - (b.queue_number || 0)), [data]);

  const run = async () => {
    const { appt, type } = action;
    setBusy(true);
    try {
      let r;
      if (type === "confirm") r = await apiService.appointments.setStatus(appt.id, "confirmed");
      if (type === "check_in") r = await apiService.appointments.checkIn(appt.id);
      if (type === "cancel") r = await apiService.appointments.cancel(appt.id, reason.trim() || "Dibatalkan oleh petugas klinik");
      toast.success(r.message); setAction(null); setReason(""); setDetail(null); reload({ silent: true });
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const actionButtons = (a) => (
    <>
      {a.status === "pending" && <Button size="sm" variant="secondary" onClick={() => setAction({ appt: a, type: "confirm" })}>Konfirmasi</Button>}
      {["pending", "confirmed"].includes(a.status) && a.schedule_date === today && <Button size="sm" onClick={() => setAction({ appt: a, type: "check_in" })}>Check-in</Button>}
      {["pending", "confirmed", "checked_in"].includes(a.status) && <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setAction({ appt: a, type: "cancel" })}>Batalkan</Button>}
    </>
  );

  const LABEL = { confirm: "Konfirmasi janji temu?", check_in: "Check-in pasien?", cancel: "Batalkan janji temu?" };

  return (
    <SidebarLayout>
      <PageHeader title="Janji Temu" description="Konfirmasi, check-in, dan pembatalan. Semua perubahan status tercatat." />
      <Card>
        <div className="flex flex-col gap-3 mb-4">
          <Tabs tabs={TABS} value={status} onChange={setStatus} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Dari tanggal" htmlFor="f-from"><Input id="f-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="Sampai tanggal" htmlFor="f-to"><Input id="f-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></Field>
            <Field label="Dokter" htmlFor="f-doc">
              <Select id="f-doc" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                <option value="">Semua dokter</option>
                {(doctors || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
          </div>
        </div>
        <AsyncBlock loading={loading} error={error} onRetry={reload} empty={!rows.length} emptyTitle="Tidak ada janji temu pada filter ini">
          <DataTable rows={rows} onRowClick={(a) => setDetail(a.id)} columns={[
            { key: "date", label: "Jadwal", render: (a) => (
              <div className="whitespace-nowrap"><p className="font-semibold">{formatDateLong(a.schedule_date)}</p><p className="text-xs text-gray-500">{formatTimeRange(a.start_time, a.end_time)}</p></div>) },
            { key: "no", label: "No.", render: (a) => a.queue_ticket?.queue_code || `#${a.queue_number ?? "-"}` },
            { key: "patient", label: "Pasien", render: (a) => <span className="font-semibold">{a.patient_name}</span> },
            { key: "doctor", label: "Dokter", render: (a) => a.doctor_name },
            { key: "status", label: "Status", render: (a) => <StatusBadge status={a.status} /> },
            { key: "act", label: <span className="sr-only">Aksi</span>, className: "text-right", render: (a) => (
              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>{actionButtons(a)}</div>) },
          ]} />
        </AsyncBlock>
      </Card>
      <AppointmentDetailModal appointmentId={detail} onClose={() => setDetail(null)} />
      <ConfirmDialog open={!!action} onClose={() => { setAction(null); setReason(""); }} onConfirm={run} processing={busy}
        variant={action?.type === "cancel" ? "danger" : "primary"} title={action && LABEL[action.type]}
        confirmLabel={action?.type === "cancel" ? "Batalkan Janji Temu" : action?.type === "check_in" ? "Check-in" : "Konfirmasi"}
        message={action && `${action.appt.patient_name} · ${action.appt.doctor_name} · ${formatDateLong(action.appt.schedule_date)}`}>
        {action?.type === "cancel" && (
          <Field label="Alasan pembatalan" htmlFor="c-reason">
            <Textarea id="c-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: dokter berhalangan" />
          </Field>
        )}
      </ConfirmDialog>
    </SidebarLayout>
  );
}
