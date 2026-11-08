import { useState } from "react";
import SidebarLayout from "@/layouts/SidebarLayout";
import Modal from "@/components/Modal";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, Card, AsyncBlock, DataTable, StatusBadge, Button, ConfirmDialog, SearchInput } from "@/components/ui";
import { AppointmentDetailContent } from "@/components/shared/AppointmentDetailModal";
import { formatDate, formatDateLong, formatTimeRange, initials } from "@/utils/format";
import toast from "@/lib/toast";

function PatientDetail({ patient, onClose }) {
  const { data, loading, error, reload } = useApi(
    () => apiService.appointments.list({ patient_id: patient.id }), [patient?.id], { enabled: !!patient }
  );
  const [detail, setDetail] = useState(null);
  // Detail janji temu ditampilkan di DALAM modal yang sama (tanpa dialog bertumpuk)
  return (
    <Modal show={!!patient} onClose={onClose} maxWidth="3xl">
      {detail ? (
        <AppointmentDetailContent appointmentId={detail} onClose={() => setDetail(null)} closeLabel="← Kembali ke riwayat" />
      ) : (
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{patient?.name}</h3>
          <p className="text-sm text-gray-500 mb-4">{patient?.email} · {patient?.phone || "Tanpa nomor telepon"} · Terdaftar {formatDate(patient?.created_at)}</p>
          <AsyncBlock loading={loading} error={error} onRetry={reload} empty={!data?.length} emptyTitle="Belum ada janji temu">
            <DataTable rows={data || []} onRowClick={(a) => setDetail(a.id)} columns={[
              { key: "date", label: "Tanggal", render: (a) => formatDateLong(a.schedule_date) },
              { key: "time", label: "Jam", render: (a) => formatTimeRange(a.start_time, a.end_time) },
              { key: "doctor", label: "Dokter", render: (a) => a.doctor_name },
              { key: "status", label: "Status", render: (a) => <StatusBadge status={a.status} /> },
            ]} />
          </AsyncBlock>
          <div className="mt-6 flex justify-end"><Button variant="secondary" onClick={onClose}>Tutup</Button></div>
        </div>
      )}
    </Modal>
  );
}

export default function AdminPatients() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, loading, error, reload } = useApi(() => apiService.users.list({ role: "patient", search: search || undefined }), [search]);
  const [view, setView] = useState(null);
  const [toggle, setToggle] = useState(null);
  const [busy, setBusy] = useState(false);

  const doToggle = async () => {
    setBusy(true);
    try {
      const r = await apiService.users.setActive(toggle.id, !toggle.is_active);
      toast.success(r.message); setToggle(null); reload({ silent: true });
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <SidebarLayout>
      <PageHeader title="Data Pasien" description="Pasien mendaftar sendiri melalui halaman pendaftaran publik." />
      <Card>
        <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }}>
          <SearchInput value={q} onChange={setQ} placeholder="Cari nama atau email pasien" />
          <Button type="submit" variant="secondary">Cari</Button>
        </form>
        <AsyncBlock loading={loading} error={error} onRetry={reload} empty={!data?.length}
          emptyTitle={search ? "Pasien tidak ditemukan" : "Belum ada pasien terdaftar"}>
          <DataTable rows={data || []} onRowClick={setView} columns={[
            { key: "name", label: "Pasien", render: (p) => (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center">{initials(p.name)}</div>
                <div><p className="font-semibold">{p.name}</p><p className="text-xs text-gray-500">{p.email}</p></div>
              </div>) },
            { key: "phone", label: "Telepon", render: (p) => p.phone || "–" },
            { key: "visits", label: "Janji temu", render: (p) => `${p.appointments.total} (selesai ${p.appointments.completed})` },
            { key: "created", label: "Terdaftar", render: (p) => formatDate(p.created_at) },
            { key: "status", label: "Status", render: (p) => <StatusBadge status={p.is_active ? "active" : "inactive"} /> },
            { key: "act", label: <span className="sr-only">Aksi</span>, className: "text-right", render: (p) => (
              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="ghost" onClick={() => setView(p)}>Riwayat</Button>
                <Button size="sm" variant="ghost" className={p.is_active ? "text-rose-600" : "text-emerald-600"} onClick={() => setToggle(p)}>
                  {p.is_active ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </div>) },
          ]} />
        </AsyncBlock>
      </Card>
      {view && <PatientDetail patient={view} onClose={() => setView(null)} />}
      <ConfirmDialog open={!!toggle} onClose={() => setToggle(null)} onConfirm={doToggle} processing={busy}
        variant={toggle?.is_active ? "danger" : "success"} title={toggle?.is_active ? "Nonaktifkan akun pasien?" : "Aktifkan akun pasien?"}
        confirmLabel={toggle?.is_active ? "Nonaktifkan" : "Aktifkan"}
        message={toggle?.is_active ? `${toggle?.name} tidak akan bisa masuk atau membuat janji temu. Data dan riwayat tetap tersimpan.` : `${toggle?.name} dapat masuk kembali.`} />
    </SidebarLayout>
  );
}
