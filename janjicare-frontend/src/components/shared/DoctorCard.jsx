import { Link } from "react-router-dom";
import DoctorPhoto from "@/components/shared/DoctorPhoto";
import { cx } from "@/components/ui";
import { formatCurrency, formatDate, todayJakarta, addDays } from "@/utils/format";

/** Label ketersediaan dari data server (next_available_date dihitung backend). */
export function availability(doctor, today = todayJakarta()) {
  const d = doctor?.next_available_date;
  if (!doctor?.is_available || doctor?.is_active === false) return { tone: "off", label: "Tidak menerima janji temu" };
  if (!d) return { tone: "off", label: "Belum ada jadwal" };
  if (d === today) return { tone: "on", label: "Tersedia hari ini" };
  if (d === addDays(today, 1)) return { tone: "on", label: "Tersedia besok" };
  return { tone: "soon", label: `Jadwal terdekat ${formatDate(d, { weekday: "short", day: "numeric", month: "short", year: undefined })}` };
}

export function AvailabilityBadge({ doctor, className }) {
  const a = availability(doctor);
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-xs font-semibold", className,
      a.tone === "on" ? "text-emerald-700 dark:text-emerald-300" : a.tone === "soon" ? "text-mauve-600 dark:text-mauve-300" : "text-gray-500 dark:text-gray-400")}>
      <span aria-hidden="true" className={cx("w-2 h-2 rounded-full",
        a.tone === "on" ? "bg-emerald-500" : a.tone === "soon" ? "bg-mauve-400" : "bg-gray-300 dark:bg-slate-600")} />
      {a.label}
    </span>
  );
}

const linkBase = "inline-flex items-center justify-center rounded-md text-sm font-semibold px-3 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mauve-400";

/**
 * Kartu dokter (direktori & beranda). compact = tanpa biaya/tombol ganda (untuk "Dokter Pilihan Kami").
 */
export default function DoctorCard({ doctor, compact = false }) {
  const profile = `/patient/doctors/${doctor.id}`;
  const canBook = doctor.is_available && doctor.next_available_date;
  return (
    <article className="group flex flex-col bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden transition-shadow hover:shadow-md">
      <Link to={profile} className="block overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-mauve-400" tabIndex={-1} aria-hidden="true">
        <DoctorPhoto doctor={doctor} rounded="rounded-none" className="transition-transform duration-300 group-hover:scale-[1.02]" />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold leading-snug text-gray-900 dark:text-white">
          <Link to={profile} className="hover:underline focus:outline-none focus-visible:underline">{doctor.name}</Link>
        </h3>
        <p className="mt-0.5 text-sm font-semibold text-mauve-600 dark:text-mauve-300">{doctor.specialty}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{doctor.experience_years} tahun pengalaman</p>
        {!compact && (
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
            <span className="text-gray-500 dark:text-gray-400">Biaya konsultasi </span>
            <span className="font-semibold">{formatCurrency(doctor.consultation_fee)}</span>
          </p>
        )}
        <AvailabilityBadge doctor={doctor} className="mt-2" />
        <div className={cx("mt-4 pt-1 flex gap-2", compact ? "" : "mt-auto")}>
          <Link to={profile} className={cx(linkBase, "flex-1 border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800")}>
            Lihat Profil
          </Link>
          {!compact && (
            canBook ? (
              <Link to={`/patient/book?doctor=${doctor.id}`} className={cx(linkBase, "flex-1 bg-plum text-white hover:bg-ink dark:bg-heather dark:text-ink")}>
                Buat Janji Temu
              </Link>
            ) : (
              <span className={cx(linkBase, "flex-1 bg-gray-100 text-gray-400 dark:bg-slate-800 cursor-not-allowed")} aria-disabled="true"
                title="Dokter belum membuka jadwal">Buat Janji Temu</span>
            )
          )}
        </div>
      </div>
    </article>
  );
}
