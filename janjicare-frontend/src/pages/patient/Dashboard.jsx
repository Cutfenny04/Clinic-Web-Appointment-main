import { Link } from "react-router-dom";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, Card, AsyncBlock, StatusBadge, StatCard } from "@/components/ui";
import { formatDateLong, formatTimeRange, todayJakarta } from "@/utils/format";

export default function PatientDashboard() {
  const { user } = useAuth();
  const today = todayJakarta();
  const appts = useApi(() => apiService.appointments.mine(), [], { interval: 30000 });
  const queue = useApi(() => apiService.queue.mine(), [], { interval: 15000 });
  const all = appts.data || [];
  const upcoming = all.filter((a) => ["pending", "confirmed", "checked_in", "in_progress"].includes(a.status) && a.schedule_date >= today)
    .sort((a, b) => (a.schedule_date + a.start_time).localeCompare(b.schedule_date + b.start_time));
  const next = upcoming[0];
  const ticket = (queue.data || []).find((t) => t.date === today && ["waiting", "calling", "serving"].includes(t.status));

  return (
    <SidebarLayout>
      <PageHeader title={`Halo, ${user?.name?.split(" ")[0] || "Pasien"}`} description={formatDateLong(today)} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard loading={appts.loading} label="Janji temu mendatang" value={upcoming.length} tone="blue" />
        <StatCard loading={appts.loading} label="Konsultasi selesai" value={all.filter((a) => a.status === "completed").length} tone="teal" />
        <StatCard loading={queue.loading} label="Antrean hari ini" value={ticket?.queue_code || "–"} hint={ticket ? `${ticket.ahead ?? 0} orang di depan Anda` : "Belum check-in"} tone="amber" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Janji Temu Berikutnya" actions={<Link to="/patient/appointments" className="text-sm font-bold text-blue-600 hover:underline">Semua</Link>}>
          <AsyncBlock loading={appts.loading} error={appts.error} onRetry={appts.reload} empty={!next}
            emptyTitle="Belum ada janji temu" emptyAction={<Link to="/patient/book" className="inline-flex px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-teal-500 text-white">Buat Janji Temu</Link>}>
            {next && (
              <div>
                <div className="flex justify-between items-start gap-3">
                  <div><p className="text-lg font-bold text-gray-900 dark:text-white">{next.doctor_name}</p><p className="text-sm font-semibold text-teal-600">{next.doctor_specialty}</p></div>
                  <StatusBadge status={next.status} />
                </div>
                <p className="mt-3 text-sm">{formatDateLong(next.schedule_date)} · {formatTimeRange(next.start_time, next.end_time)}</p>
                <p className="text-xs text-gray-500 mt-1">Nomor urut booking #{next.queue_number}</p>
              </div>
            )}
          </AsyncBlock>
        </Card>
        <Card title="Akses Cepat">
          <div className="grid grid-cols-2 gap-3">
            {[["/patient/doctors", "Cari Dokter"], ["/patient/book", "Buat Janji Temu"], ["/patient/queue", "Nomor Antrean"], ["/patient/history", "Riwayat Konsultasi"]].map(([to, label]) => (
              <Link key={to} to={to} className="p-4 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-slate-700/40 text-sm font-bold text-gray-800 dark:text-slate-100 transition-all">{label}</Link>
            ))}
          </div>
        </Card>
      </div>
    </SidebarLayout>
  );
}
