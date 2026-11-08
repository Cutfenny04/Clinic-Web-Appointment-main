import { useMemo, useState } from "react";
import SidebarLayout from "@/layouts/SidebarLayout";
import Modal from "@/components/Modal";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, Card, AsyncBlock, DataTable, SearchInput, StatusBadge, Button } from "@/components/ui";
import { AppointmentDetailContent } from "@/components/shared/AppointmentDetailModal";
import { formatDateLong, initials } from "@/utils/format";

/** Daftar pasien = pasien yang pernah/akan berkonsultasi dengan dokter ini (dibatasi backend & RLS). */
export default function DoctorPatients() {
  const { data, loading, error, reload } = useApi(() => apiService.appointments.list(), []);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const patients = useMemo(() => {
    const map = new Map();
    for (const a of data || []) {
      if (!map.has(a.patient_id)) map.set(a.patient_id, { id: a.patient_id, name: a.patient_name, phone: a.patient_phone, email: a.patient_email, appts: [] });
      map.get(a.patient_id).appts.push(a);
    }
    return [...map.values()].map((p) => {
      const sorted = [...p.appts].sort((x, y) => (y.schedule_date || "").localeCompare(x.schedule_date || ""));
      return { ...p, appts: sorted, last: sorted[0], completed: p.appts.filter((a) => a.status === "completed").length };
    }).filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  }, [data, q]);

  return (
    <SidebarLayout>
      <PageHeader title="Daftar Pasien" description="Pasien yang memiliki janji temu dengan Anda." />
      <Card>
        <div className="mb-4"><SearchInput value={q} onChange={setQ} placeholder="Cari nama pasien" /></div>
        <AsyncBlock loading={loading} error={error} onRetry={reload} empty={!patients.length} emptyTitle={q ? "Pasien tidak ditemukan" : "Belum ada pasien"}>
          <DataTable rows={patients} onRowClick={setSelected} columns={[
            { key: "n", label: "Pasien", render: (p) => (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center">{initials(p.name)}</div>
                <div><p className="font-semibold">{p.name}</p><p className="text-xs text-gray-500">{p.phone || p.email || ""}</p></div>
              </div>) },
            { key: "v", label: "Kunjungan", render: (p) => `${p.appts.length} janji · ${p.completed} selesai` },
            { key: "l", label: "Jadwal terakhir", render: (p) => formatDateLong(p.last?.schedule_date) },
            { key: "s", label: "Status terakhir", render: (p) => <StatusBadge status={p.last?.status} /> },
          ]} />
        </AsyncBlock>
      </Card>
      <Modal show={!!selected} onClose={() => { setSelected(null); setDetail(null); }} maxWidth="2xl">
        {selected && detail && (
          <AppointmentDetailContent appointmentId={detail} onClose={() => setDetail(null)} closeLabel="← Kembali ke daftar kunjungan" />
        )}
        {selected && !detail && (
          <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selected.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{selected.phone || "–"} · {selected.email || "–"}</p>
            <DataTable rows={selected.appts} onRowClick={(a) => setDetail(a.id)} columns={[
              { key: "d", label: "Tanggal", render: (a) => formatDateLong(a.schedule_date) },
              { key: "s", label: "Status", render: (a) => <StatusBadge status={a.status} /> },
              { key: "g", label: "Diagnosis", render: (a) => a.diagnosis || "–" },
            ]} />
            <div className="mt-6 flex justify-end"><Button variant="secondary" onClick={() => setSelected(null)}>Tutup</Button></div>
          </div>
        )}
      </Modal>
    </SidebarLayout>
  );
}
