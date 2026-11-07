import { useState } from "react";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, Card, AsyncBlock, Button } from "@/components/ui";
import AppointmentDetailModal from "@/components/shared/AppointmentDetailModal";
import { formatDateLong } from "@/utils/format";

export default function PatientHistory() {
  const { data, loading, error, reload } = useApi(() => apiService.appointments.mine(), []);
  const [detail, setDetail] = useState(null);
  const rows = (data || []).filter((a) => a.status === "completed").sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || ""));
  return (
    <SidebarLayout>
      <PageHeader title="Riwayat Konsultasi" description="Hasil pemeriksaan dari dokter." />
      <AsyncBlock loading={loading} error={error} onRetry={reload} empty={!rows.length} emptyTitle="Belum ada konsultasi yang selesai">
        <div className="space-y-4">
          {rows.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-gray-500">{formatDateLong(a.schedule_date)}</p>
                  <p className="font-bold text-gray-900 dark:text-white">{a.doctor_name} <span className="font-semibold text-teal-600">· {a.doctor_specialty}</span></p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setDetail(a.id)}>Detail</Button>
              </div>
              <dl className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div><dt className="text-gray-500">Keluhan</dt><dd className="text-gray-800 dark:text-slate-200">{a.complaint || "–"}</dd></div>
                <div><dt className="text-gray-500">Diagnosis</dt><dd className="font-semibold text-gray-900 dark:text-white">{a.diagnosis || "–"}</dd></div>
                <div><dt className="text-gray-500">Catatan dokter</dt><dd className="text-gray-800 dark:text-slate-200 whitespace-pre-line">{a.consultation_notes || "–"}</dd></div>
              </dl>
            </Card>
          ))}
        </div>
      </AsyncBlock>
      <AppointmentDetailModal appointmentId={detail} onClose={() => setDetail(null)} />
    </SidebarLayout>
  );
}
