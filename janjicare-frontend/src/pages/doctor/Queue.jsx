import SidebarLayout from "@/layouts/SidebarLayout";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, AsyncBlock } from "@/components/ui";
import { DoctorQueueCard } from "@/components/shared/QueueBoard";
import { formatDateLong, todayJakarta } from "@/utils/format";

export default function DoctorQueue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const q = useApi(() => apiService.queue.today(), [], { interval: 5000 });

  // Mulai pemeriksaan = status janji temu → in_progress (tiket otomatis "serving" di database)
  const start = async (ticket) => {
    const r = await apiService.appointments.setStatus(ticket.appointment_id, "in_progress");
    navigate("/doctor/consultation");
    return r;
  };

  return (
    <SidebarLayout>
      <PageHeader title="Antrean Hari Ini" description={`${formatDateLong(todayJakarta())} · hanya pasien yang sudah check-in · diperbarui otomatis`} />
      <AsyncBlock loading={q.loading} error={q.error} onRetry={q.reload}>
        <div className="max-w-2xl">
          <DoctorQueueCard doctorId={user?.id} doctorName="Antrean Saya" tickets={q.data?.tickets || []}
            onChanged={() => q.reload({ silent: true })} onStart={start} />
        </div>
      </AsyncBlock>
    </SidebarLayout>
  );
}
