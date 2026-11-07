import { useMemo, useState } from "react";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, Card, AsyncBlock, DataTable, SearchInput } from "@/components/ui";
import AppointmentDetailModal from "@/components/shared/AppointmentDetailModal";
import { formatDateLong } from "@/utils/format";

export default function DoctorHistory() {
  const { data, loading, error, reload } = useApi(() => apiService.appointments.list({ status: "completed" }), []);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState(null);
  const rows = useMemo(() => (data || [])
    .filter((a) => [a.patient_name, a.diagnosis].join(" ").toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || "")), [data, q]);
  return (
    <SidebarLayout>
      <PageHeader title="Riwayat Pemeriksaan" description="Konsultasi yang telah Anda selesaikan." />
      <Card>
        <div className="mb-4"><SearchInput value={q} onChange={setQ} placeholder="Cari pasien atau diagnosis" /></div>
        <AsyncBlock loading={loading} error={error} onRetry={reload} empty={!rows.length} emptyTitle={q ? "Tidak ada hasil" : "Belum ada konsultasi selesai"}>
          <DataTable rows={rows} onRowClick={(a) => setDetail(a.id)} columns={[
            { key: "d", label: "Tanggal", render: (a) => <span className="whitespace-nowrap">{formatDateLong(a.schedule_date)}</span> },
            { key: "p", label: "Pasien", render: (a) => <span className="font-semibold">{a.patient_name}</span> },
            { key: "c", label: "Keluhan", render: (a) => <span className="line-clamp-1 max-w-xs">{a.complaint || "–"}</span> },
            { key: "g", label: "Diagnosis", render: (a) => a.diagnosis || "–" },
          ]} />
        </AsyncBlock>
      </Card>
      <AppointmentDetailModal appointmentId={detail} onClose={() => setDetail(null)} />
    </SidebarLayout>
  );
}
