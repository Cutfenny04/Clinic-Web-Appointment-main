import { Link } from "react-router-dom";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, Card, AsyncBlock, StatusBadge, cx } from "@/components/ui";
import { formatDateLong, formatDateTime, todayJakarta } from "@/utils/format";

export default function PatientQueue() {
  const { data, loading, error, reload } = useApi(() => apiService.queue.mine(), [], { interval: 10000 });
  const today = todayJakarta();
  const active = (data || []).filter((t) => t.date === today && ["waiting", "calling", "serving"].includes(t.status));
  const past = (data || []).filter((t) => !active.includes(t));

  return (
    <SidebarLayout>
      <PageHeader title="Nomor Antrean" description="Diperbarui otomatis setiap 10 detik." />
      <AsyncBlock loading={loading} error={error} onRetry={reload} empty={!data?.length}
        emptyTitle="Anda belum memiliki nomor antrean"
        emptyDescription="Nomor antrean dibuat saat Anda check-in di klinik pada hari praktik."
        emptyAction={<Link to="/patient/appointments" className="text-sm font-bold text-blue-600">Lihat janji temu saya</Link>}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {active.map((t) => (
            <div key={t.id} className={cx("rounded-3xl p-6 text-white shadow-lg", t.status === "calling" ? "bg-gradient-to-br from-amber-500 to-orange-600 animate-pulse" : "bg-gradient-to-br from-blue-600 to-teal-500")}>
              <p className="text-sm font-bold text-white/80">{t.doctor_name}</p>
              <p className="text-xs text-white/70">{formatDateLong(t.date)}</p>
              <p className="text-6xl font-black my-4 tracking-tight" aria-live="polite">{t.queue_code}</p>
              {t.status === "calling" && <p className="text-lg font-extrabold">Giliran Anda! Silakan menuju ruang periksa.</p>}
              {t.status === "serving" && <p className="text-lg font-extrabold">Sedang diperiksa.</p>}
              {t.status === "waiting" && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="rounded-xl bg-white/15 p-3"><p className="text-xs text-white/80">Antrean di depan Anda</p><p className="text-2xl font-black">{t.ahead ?? "–"}</p></div>
                  <div className="rounded-xl bg-white/15 p-3"><p className="text-xs text-white/80">Sedang dilayani</p><p className="text-2xl font-black">{t.current_code || "–"}</p></div>
                </div>
              )}
            </div>
          ))}
        </div>
        {!!past.length && (
          <Card title="Riwayat Nomor Antrean">
            <ul className="divide-y divide-gray-50 dark:divide-slate-700/60">
              {past.map((t) => (
                <li key={t.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                  <div><p className="font-bold">{t.queue_code} · {t.doctor_name}</p><p className="text-xs text-gray-500">{formatDateLong(t.date)}{t.finished_at ? ` · selesai ${formatDateTime(t.finished_at)}` : ""}</p></div>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </AsyncBlock>
    </SidebarLayout>
  );
}
