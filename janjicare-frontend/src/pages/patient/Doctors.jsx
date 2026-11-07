import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SidebarLayout from "@/layouts/SidebarLayout";
import Modal from "@/components/Modal";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, Card, AsyncBlock, SearchInput, Button, cx, LoadingState } from "@/components/ui";
import { formatCurrency, formatDateLong, formatTimeRange, initials } from "@/utils/format";

function DoctorDetail({ doctor, onClose }) {
  const sched = useApi(() => apiService.doctors.schedules(doctor.id), [doctor?.id], { enabled: !!doctor });
  return (
    <Modal show={!!doctor} onClose={onClose} maxWidth="lg">
      {doctor && (
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400 text-white font-black text-xl flex items-center justify-center">{initials(doctor.name)}</div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{doctor.name}</h3>
              <p className="text-sm font-semibold text-teal-600">{doctor.specialty}</p>
              <p className="text-xs text-gray-500">{doctor.experience_years} tahun pengalaman · {formatCurrency(doctor.consultation_fee)}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line mb-5">{doctor.bio || "Belum ada profil singkat."}</p>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Jadwal Praktik Mendatang</h4>
          {sched.loading ? <LoadingState rows={2} /> : sched.error ? <p className="text-sm text-rose-600">{sched.error.message}</p> : (
            sched.data?.length ? (
              <ul className="space-y-2 max-h-56 overflow-y-auto">
                {sched.data.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-gray-50 dark:bg-slate-700/40">
                    <span>{formatDateLong(s.schedule_date)} · {formatTimeRange(s.start_time, s.end_time)}</span>
                    <span className={cx("text-xs font-bold", s.is_full ? "text-rose-600" : "text-teal-600")}>{s.is_full ? "Penuh" : `Sisa ${s.remaining}`}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-500">Belum ada jadwal praktik yang dibuka.</p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Tutup</Button>
            <Link to={`/patient/book?doctor=${doctor.id}`} className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-md">Buat Janji Temu</Link>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function PatientDoctors() {
  const { data, loading, error, reload } = useApi(() => apiService.doctors.list(), []);
  const [q, setQ] = useState("");
  const [spec, setSpec] = useState("");
  const [selected, setSelected] = useState(null);
  const specialties = useMemo(() => [...new Set((data || []).map((d) => d.specialty))].sort(), [data]);
  const rows = (data || []).filter((d) => (!spec || d.specialty === spec) && `${d.name} ${d.specialty}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <SidebarLayout>
      <PageHeader title="Cari Dokter" description="Pilih dokter dan lihat jadwal praktiknya." />
      <Card className="mb-6">
        <div className="flex flex-col gap-3">
          <SearchInput value={q} onChange={setQ} placeholder="Cari nama dokter atau spesialisasi" />
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter spesialisasi">
            {["", ...specialties].map((s) => (
              <button key={s || "all"} type="button" onClick={() => setSpec(s)} aria-pressed={spec === s}
                className={cx("px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all",
                  spec === s ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-blue-300")}>
                {s || "Semua Spesialisasi"}
              </button>
            ))}
          </div>
        </div>
      </Card>
      <AsyncBlock loading={loading} error={error} onRetry={reload} empty={!rows.length} emptyTitle="Dokter tidak ditemukan" rows={4}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((d) => (
            <article key={d.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 text-white font-black flex items-center justify-center">{initials(d.name)}</div>
                <div className="min-w-0"><h2 className="font-bold text-gray-900 dark:text-white truncate">{d.name}</h2><p className="text-sm font-semibold text-teal-600">{d.specialty}</p></div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">{d.bio || "Belum ada profil singkat."}</p>
              <p className="mt-3 text-xs text-gray-500">{d.experience_years} tahun pengalaman · {formatCurrency(d.consultation_fee)}</p>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setSelected(d)}>Detail & Jadwal</Button>
                <Link to={`/patient/book?doctor=${d.id}`} className="flex-1 inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-teal-500 text-white">Buat Janji</Link>
              </div>
            </article>
          ))}
        </div>
      </AsyncBlock>
      <DoctorDetail doctor={selected} onClose={() => setSelected(null)} />
    </SidebarLayout>
  );
}
