import SidebarLayout from "@/layouts/SidebarLayout";
import { PageHeader } from "@/components/ui";
import ScheduleManager from "@/components/shared/ScheduleManager";

export default function DoctorSchedules() {
  return (
    <SidebarLayout>
      <PageHeader title="Jadwal Praktik Saya" description="Hanya jadwal milik Anda yang ditampilkan dan dapat diubah." />
      <ScheduleManager mode="doctor" />
    </SidebarLayout>
  );
}
