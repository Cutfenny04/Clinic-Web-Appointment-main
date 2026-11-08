import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { Card, ErrorState, EmptyState, LoadingState, cx } from "@/components/ui";
import DoctorPhoto from "@/components/shared/DoctorPhoto";
import { AvailabilityBadge } from "@/components/shared/DoctorCard";
import { formatCurrency, formatDateLong, formatTimeRange, todayJakarta } from "@/utils/format";

const nowHHMM = () => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());

export default function PatientDoctorDetail() {
  const { id } = useParams();
  const doc = useApi(() => apiService.doctors.get(id), [id]);
  const sched = useApi(() => apiService.doctors.schedules(id), [id]);
  const d = doc.data;
  const today = todayJakarta();

  // Kelompokkan jadwal per tanggal; sesi hari ini yang sudah selesai disembunyikan
  const days = useMemo(() => {
    const now = nowHHMM();
    const open = (sched.data || []).filter((s) => !(s.schedule_date === today && s.end_time.slice(0, 5) <= now));
    const map = new Map();
    for (const s of open) map.set(s.schedule_date, [...(map.get(s.schedule_date) || []), s]);
    return [...map.entries()].slice(0, 10);
  }, [sched.data, today]);

  const canBook = d?.is_available && d?.next_available_date;
  useEffect(() => { document.title = `${d?.name || "Profil Dokter"} - JanjiCare`; }, [d?.name]);

  return (
    <SidebarLayout>
      <nav aria-label="Navigasi" className="mb-4 text-sm">
        <Link to="/patient/doctors" className="font-semibold text-mauve-600 dark:text-mauve-300 hover:underline">← Kembali ke Cari Dokter</Link>
      </nav>

      {doc.loading ? (
        <Card><LoadingState rows={4} label="Memuat profil dokter..." /></Card>
      ) : doc.error ? (
        <Card>
          {doc.error.status === 404 ? (
            <EmptyState title="Dokter tidak ditemukan" description="Dokter ini tidak tersedia atau sudah tidak aktif."
              action={<Link to="/patient/doctors" className="inline-flex px-4 py-2.5 rounded-md text-sm font-semibold bg-plum text-white">Lihat Semua Dokter</Link>} />
          ) : <ErrorState error={doc.error} onRetry={doc.reload} />}
        </Card>
      ) : d && (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
          <div className="lg:sticky lg:top-6">
            <DoctorPhoto doctor={d} size="lg" className="border border-gray-200 dark:border-slate-800" />
          </div>

          <div className="space-y-6 min-w-0">
            <Card>
              <h1 className="font-serif text-3xl font-semibold text-gray-900 dark:text-white">{d.name}</h1>
              <p className="mt-1 text-lg font-semibold text-mauve-600 dark:text-mauve-300">{d.specialty}</p>
              <AvailabilityBadge doctor={d} className="mt-2" />
              <dl className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-100 dark:border-slate-800 pt-5">
                <div><dt className="text-xs uppercase tracking-wider text-gray-500">Pengalaman</dt><dd className="mt-1 font-semibold">{d.experience_years} tahun</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-gray-500">Biaya konsultasi</dt><dd className="mt-1 font-semibold">{formatCurrency(d.consultation_fee)}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-gray-500">Janji temu</dt>
                  <dd className="mt-1 font-semibold">{d.is_available ? "Menerima janji temu" : "Tidak menerima janji temu"}</dd></div>
              </dl>
              <div className="mt-6 flex flex-wrap gap-3">
                {canBook ? (
                  <Link to={`/patient/book?doctor=${d.id}`} className="inline-flex items-center px-5 py-2.5 rounded-md text-sm font-semibold bg-plum text-white hover:bg-ink dark:bg-heather dark:text-ink">
                    Buat Janji Temu
                  </Link>
                ) : (
                  <span className="inline-flex items-center px-5 py-2.5 rounded-md text-sm font-semibold bg-gray-100 text-gray-400 dark:bg-slate-800 cursor-not-allowed" aria-disabled="true">
                    Belum ada jadwal yang bisa dipesan
                  </span>
                )}
              </div>
            </Card>

            <Card title="Profil Singkat">
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200 whitespace-pre-line">{d.bio || "Belum ada profil singkat."}</p>
            </Card>

            <Card title="Jadwal Praktik & Slot Tersedia">
              {sched.loading ? <LoadingState rows={3} label="Memuat jadwal..." /> : sched.error ? <ErrorState error={sched.error} onRetry={sched.reload} /> : !days.length ? (
                <EmptyState title="Belum ada jadwal praktik" description="Dokter ini belum membuka jadwal. Silakan cek kembali nanti." />
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                  {days.map(([date, list]) => (
                    <li key={date} className="py-3 first:pt-0 last:pb-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatDateLong(date)}{date === today && <span className="ml-2 text-xs text-emerald-700">Hari ini</span>}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {list.map((s) => (
                          <span key={s.id} className={cx("inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold",
                            s.is_full ? "border-gray-200 text-gray-400 dark:border-slate-700" : "border-mauve-200 text-gray-800 dark:border-slate-600 dark:text-slate-100")}>
                            {formatTimeRange(s.start_time, s.end_time)}
                            <span className={s.is_full ? "text-rose-500" : "text-emerald-700 dark:text-emerald-300"}>
                              {s.is_full ? "Penuh" : `Sisa ${s.remaining} dari ${s.capacity}`}
                            </span>
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Sisa slot dihitung server saat ini dan diperiksa ulang ketika janji temu dibuat.</p>
            </Card>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
