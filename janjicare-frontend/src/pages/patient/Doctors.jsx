import { useEffect, useMemo, useState } from "react";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, Card, SearchInput, Button, Field, Select, EmptyState, ErrorState } from "@/components/ui";
import DoctorCard from "@/components/shared/DoctorCard";
import { todayJakarta, addDays } from "@/utils/format";

const PAGE = 8;
const AVAIL = [
  ["", "Semua jadwal"],
  ["today", "Tersedia hari ini"],
  ["week", "Tersedia 7 hari ke depan"],
  ["any", "Ada jadwal (30 hari)"],
];

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900" aria-hidden="true">
      <div className="aspect-[4/5] bg-gray-100 dark:bg-slate-800 animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-3/4 rounded bg-gray-100 dark:bg-slate-800 animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-slate-800 animate-pulse" />
        <div className="h-8 w-full rounded bg-gray-100 dark:bg-slate-800 animate-pulse mt-4" />
      </div>
    </div>
  );
}

export const GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5";

export default function PatientDoctors() {
  // Backend hanya mengembalikan dokter aktif yang menerima janji temu (untuk non-admin)
  const { data, loading, error, reload } = useApi(() => apiService.doctors.list(), []);
  const [q, setQ] = useState("");
  const [spec, setSpec] = useState("");
  const [avail, setAvail] = useState("");
  const [shown, setShown] = useState(PAGE);
  const today = todayJakarta();

  const specialties = useMemo(() => [...new Set((data || []).map((d) => d.specialty))].sort((a, b) => a.localeCompare(b, "id")), [data]);
  const rows = useMemo(() => (data || []).filter((d) => {
    if (spec && d.specialty !== spec) return false;
    if (q && !d.name.toLowerCase().includes(q.trim().toLowerCase())) return false;
    const next = d.next_available_date;
    if (avail === "today" && next !== today) return false;
    if (avail === "week" && !(next && next <= addDays(today, 7))) return false;
    if (avail === "any" && !next) return false;
    return true;
  }), [data, q, spec, avail, today]);

  useEffect(() => setShown(PAGE), [q, spec, avail]);
  const filtered = q || spec || avail;
  const reset = () => { setQ(""); setSpec(""); setAvail(""); };

  return (
    <SidebarLayout>
      <PageHeader title="Cari Dokter" description="Temukan dokter, lihat profil dan jadwal praktiknya, lalu buat janji temu." />
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_220px] gap-3 items-end">
          <Field label="Nama dokter" htmlFor="f-q">
            <SearchInput id="f-q" className="mt-1" value={q} onChange={setQ} placeholder="Cari nama dokter" />
          </Field>
          <Field label="Spesialisasi" htmlFor="f-spec">
            <Select id="f-spec" value={spec} onChange={(e) => setSpec(e.target.value)}>
              <option value="">Semua spesialisasi</option>
              {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Ketersediaan jadwal" htmlFor="f-avail">
            <Select id="f-avail" value={avail} onChange={(e) => setAvail(e.target.value)}>
              {AVAIL.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {loading ? (
        <div className={GRID} role="status" aria-live="polite">
          <span className="sr-only">Memuat daftar dokter...</span>
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <Card><ErrorState error={error} onRetry={reload} /></Card>
      ) : !rows.length ? (
        <Card>
          <EmptyState
            title={filtered ? "Dokter tidak ditemukan" : "Belum ada dokter yang menerima janji temu"}
            description={filtered ? "Coba ubah kata kunci atau filter." : "Silakan kembali lagi nanti."}
            action={filtered && <Button variant="secondary" onClick={reset}>Hapus Filter</Button>} />
        </Card>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
            Menampilkan {Math.min(shown, rows.length)} dari {rows.length} dokter
          </p>
          <div className={GRID}>
            {rows.slice(0, shown).map((d) => <DoctorCard key={d.id} doctor={d} />)}
          </div>
          {shown < rows.length && (
            <div className="mt-6 text-center">
              <Button variant="secondary" onClick={() => setShown((n) => n + PAGE)}>Tampilkan Lebih Banyak</Button>
            </div>
          )}
        </>
      )}
    </SidebarLayout>
  );
}
