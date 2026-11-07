import SidebarLayout from "@/layouts/SidebarLayout";
import { PageHeader } from "@/components/ui";
import ScheduleManager from "@/components/shared/ScheduleManager";

export default function AdminSchedules() {
  return (
    <SidebarLayout>
      <PageHeader title="Jadwal Praktik" description="Kelola sesi praktik seluruh dokter beserta kapasitasnya." />
      <ScheduleManager mode="admin" />
    </SidebarLayout>
  );
}
