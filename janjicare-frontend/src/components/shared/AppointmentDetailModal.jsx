import Modal from "@/components/Modal";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { StatusBadge, LoadingState, ErrorState, Button } from "@/components/ui";
import { formatDateLong, formatTimeRange, formatDateTime, formatStatus } from "@/utils/format";

/** Detail janji temu + riwayat perubahan status (dari tabel appointment_status_history) */
export default function AppointmentDetailModal({ appointmentId, onClose, actions }) {
  const { data: a, loading, error, reload } = useApi(
    () => apiService.appointments.get(appointmentId), [appointmentId], { enabled: !!appointmentId }
  );
  const row = (label, value) => (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-50 dark:border-slate-700/60 text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-semibold text-gray-900 dark:text-slate-100 text-right">{value || "–"}</span>
    </div>
  );
  return (
    <Modal show={!!appointmentId} onClose={onClose} maxWidth="lg">
      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detail Janji Temu</h3>
          {a && <StatusBadge status={a.status} />}
        </div>
        {loading ? <LoadingState rows={4} /> : error ? <ErrorState error={error} onRetry={reload} /> : a && (
          <>
            {row("Pasien", a.patient_name)}
            {row("Dokter", `${a.doctor_name}${a.doctor_specialty ? ` · ${a.doctor_specialty}` : ""}`)}
            {row("Tanggal", formatDateLong(a.schedule_date))}
            {row("Jam praktik", formatTimeRange(a.start_time, a.end_time))}
            {row("Nomor urut booking", a.queue_number ? `#${a.queue_number}` : "–")}
            {row("Nomor antrean", a.queue_ticket ? `${a.queue_ticket.queue_code} (${formatStatus(a.queue_ticket.status)})` : "Belum check-in")}
            {row("Keluhan", a.complaint)}
            {a.status === "completed" && row("Diagnosis", a.diagnosis)}
            {a.status === "completed" && row("Catatan dokter", a.consultation_notes)}
            {a.status === "cancelled" && row("Alasan pembatalan", a.cancel_reason)}
            <h4 className="mt-5 mb-2 text-sm font-bold text-gray-900 dark:text-white">Riwayat Status</h4>
            <ol className="space-y-2">
              {(a.status_history || []).map((h) => (
                <li key={h.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-slate-200">
                      {h.old_status ? `${formatStatus(h.old_status)} → ${formatStatus(h.new_status)}` : formatStatus(h.new_status)}
                    </p>
                    <p className="text-xs text-gray-500">{formatDateTime(h.created_at)}{h.note ? ` · ${h.note}` : ""}</p>
                  </div>
                </li>
              ))}
              {!a.status_history?.length && <li className="text-sm text-gray-400">Belum ada riwayat.</li>}
            </ol>
          </>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {a && actions?.(a, reload)}
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </Modal>
  );
}
