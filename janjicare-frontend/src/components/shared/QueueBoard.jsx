import { useMemo, useState } from "react";
import { apiService } from "@/services/api";
import { Card, StatusBadge, Button, EmptyState, cx } from "@/components/ui";
import { formatDateTime } from "@/utils/format";
import toast from "@/lib/toast";

/**
 * Papan antrean satu dokter: tiket berjalan + daftar tunggu + aksi.
 * onStart(ticket) opsional (khusus dokter: memulai pemeriksaan).
 */
export function DoctorQueueCard({ doctorId, doctorName, tickets, onChanged, onStart, canCall = true }) {
  const [busy, setBusy] = useState(null);
  const current = tickets.find((t) => t.status === "serving") || tickets.find((t) => t.status === "calling");
  const waiting = tickets.filter((t) => t.status === "waiting");
  const skipped = tickets.filter((t) => t.status === "skipped");
  const done = tickets.filter((t) => t.status === "done").length;

  const act = async (key, fn, okMsg) => {
    setBusy(key);
    try {
      const r = await fn();
      toast.success(okMsg || r.message);
      onChanged?.();
    } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  };

  return (
    <Card title={doctorName} actions={<span className="text-xs text-gray-500">{waiting.length} menunggu · {done} selesai</span>}>
      <div className={cx("rounded-2xl p-5 mb-4 text-center", current ? "bg-blue-700 text-white" : "bg-gray-50 dark:bg-slate-700/40")}>
        <p className={cx("text-xs font-bold uppercase tracking-wider", current ? "text-white/80" : "text-gray-500")}>
          {current ? (current.status === "serving" ? "Sedang diperiksa" : "Sedang dipanggil") : "Belum ada pasien dipanggil"}
        </p>
        <p className="text-4xl font-black my-1">{current?.queue_code || "—"}</p>
        {current && <p className="text-sm font-semibold">{current.patient_name}</p>}
        {current?.called_at && <p className="text-xs text-white/70 mt-1">Dipanggil {formatDateTime(current.called_at)}</p>}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {canCall && (
          <Button loading={busy === "call"} disabled={current?.status === "serving" || !waiting.length}
            onClick={() => act("call", () => apiService.queue.callNext({ doctor_id: doctorId }))}>
            {current?.status === "calling" ? "Lewati & Panggil Berikutnya" : "Panggil Pasien Berikutnya"}
          </Button>
        )}
        {current?.status === "calling" && onStart && (
          <Button variant="success" loading={busy === "start"} onClick={() => act("start", () => onStart(current), "Pemeriksaan dimulai.")}>
            Mulai Pemeriksaan
          </Button>
        )}
        {current?.status === "calling" && (
          <Button variant="secondary" loading={busy === "recall"} onClick={() => act("recall", () => apiService.queue.setStatus(current.id, "skipped"), `${current.queue_code} dilewati.`)}>
            Pasien Tidak Hadir
          </Button>
        )}
      </div>
      {current?.status === "serving" && (
        <p className="mb-4 text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 rounded-xl p-3">
          Selesaikan konsultasi {current.queue_code} sebelum memanggil pasien berikutnya.
        </p>
      )}
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Daftar Tunggu</h3>
      {waiting.length ? (
        <ul className="divide-y divide-gray-50 dark:divide-slate-700/60">
          {waiting.map((t) => (
            <li key={t.id} className="py-2 flex items-center justify-between gap-3 text-sm">
              <span><strong className="mr-2">{t.queue_code}</strong>{t.patient_name}</span>
              <StatusBadge status={t.status} />
            </li>
          ))}
        </ul>
      ) : <EmptyState title="Tidak ada pasien menunggu" />}
      {!!skipped.length && (
        <>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-4 mb-2">Dilewati</h3>
          <ul className="divide-y divide-gray-50 dark:divide-slate-700/60">
            {skipped.map((t) => (
              <li key={t.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                <span><strong className="mr-2">{t.queue_code}</strong>{t.patient_name}</span>
                <Button size="sm" variant="ghost" loading={busy === t.id}
                  onClick={() => act(t.id, () => apiService.queue.setStatus(t.id, "waiting"), `${t.queue_code} dikembalikan ke antrean.`)}>
                  Kembalikan ke Antrean
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export function groupByDoctor(tickets = []) {
  const map = new Map();
  for (const t of tickets) {
    if (!map.has(t.doctor_id)) map.set(t.doctor_id, { doctor_id: t.doctor_id, doctor_name: t.doctor_name, tickets: [] });
    map.get(t.doctor_id).tickets.push(t);
  }
  return [...map.values()];
}

export function useGrouped(tickets) {
  return useMemo(() => groupByDoctor(tickets), [tickets]);
}
