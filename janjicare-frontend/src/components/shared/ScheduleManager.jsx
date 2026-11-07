import { useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import {
  Card, Button, AsyncBlock, DataTable, StatusBadge, ConfirmDialog, FormModal, Field, Input, Select, Tabs,
} from "@/components/ui";
import { formatDateLong, formatTimeRange, todayJakarta, addDays } from "@/utils/format";
import toast from "@/lib/toast";

const EMPTY = { doctor_id: "", schedule_date: "", start_time: "08:00", end_time: "12:00", capacity: 10, is_active: true };

/**
 * Kelola jadwal praktik.
 * mode="admin": semua dokter, pilih dokter saat membuat.
 * mode="doctor": hanya jadwal milik dokter yang login (backend juga memaksa ini).
 */
export default function ScheduleManager({ mode = "admin" }) {
  const isAdmin = mode === "admin";
  const today = todayJakarta();
  const [range, setRange] = useState("upcoming");
  const [doctorFilter, setDoctorFilter] = useState("");
  const params = useMemo(() => {
    const p = isAdmin ? {} : { mine: "true" };
    if (doctorFilter) p.doctor_id = doctorFilter;
    if (range === "upcoming") p.from = today;
    if (range === "past") { p.to = addDays(today, -1); p.from = addDays(today, -60); }
    return p;
  }, [isAdmin, doctorFilter, range, today]);

  const { data: schedules, loading, error, reload } = useApi(() => apiService.schedules.list(params), [JSON.stringify(params)]);
  const { data: doctors } = useApi(() => apiService.doctors.list(), [], { enabled: isAdmin });

  const [form, setForm] = useState(null); // {mode:'create'|'edit', values, id}
  const [formError, setFormError] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => { setErrors({}); setFormError(null); setForm({ mode: "create", values: { ...EMPTY, schedule_date: today } }); };
  const openEdit = (s) => {
    setErrors({}); setFormError(null);
    setForm({ mode: "edit", id: s.id, values: { ...s, start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5) } });
  };
  const setV = (k, v) => setForm((f) => ({ ...f, values: { ...f.values, [k]: v } }));

  const save = async () => {
    const v = form.values;
    const e = {};
    if (isAdmin && form.mode === "create" && !v.doctor_id) e.doctor_id = "Pilih dokter.";
    if (!v.schedule_date) e.schedule_date = "Tanggal wajib diisi.";
    else if (form.mode === "create" && v.schedule_date < today) e.schedule_date = "Tanggal tidak boleh di masa lalu.";
    if (!v.start_time || !v.end_time) e.start_time = "Jam wajib diisi.";
    else if (v.start_time >= v.end_time) e.end_time = "Jam selesai harus setelah jam mulai.";
    if (!(Number(v.capacity) >= 1)) e.capacity = "Kapasitas minimal 1.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true); setFormError(null);
    try {
      const payload = {
        schedule_date: v.schedule_date, start_time: v.start_time, end_time: v.end_time,
        capacity: Number(v.capacity), is_active: !!v.is_active,
      };
      if (form.mode === "create") {
        await apiService.schedules.create(isAdmin ? { ...payload, doctor_id: v.doctor_id } : payload);
        toast.success("Jadwal praktik berhasil dibuat.");
      } else {
        await apiService.schedules.update(form.id, payload);
        toast.success("Jadwal praktik berhasil diperbarui.");
      }
      setForm(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s) => {
    try {
      await apiService.schedules.update(s.id, { is_active: !s.is_active });
      toast.success(s.is_active ? "Jadwal dinonaktifkan. Pasien tidak dapat memesan jadwal ini." : "Jadwal diaktifkan kembali.");
      reload({ silent: true });
    } catch (err) { toast.error(err.message); }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      const r = await apiService.schedules.remove(toDelete.id);
      toast.success(r.message || "Jadwal dihapus.");
      setToDelete(null);
      reload();
    } catch (err) { toast.error(err.message); } finally { setDeleting(false); }
  };

  const columns = [
    ...(isAdmin ? [{ key: "doctor", label: "Dokter", render: (s) => (
      <div><p className="font-semibold">{s.doctor_name}</p><p className="text-xs text-gray-500">{s.doctor_specialty}</p></div>) }] : []),
    { key: "date", label: "Tanggal", render: (s) => <span className="whitespace-nowrap">{formatDateLong(s.schedule_date)}</span> },
    { key: "time", label: "Jam", render: (s) => <span className="whitespace-nowrap">{formatTimeRange(s.start_time, s.end_time)}</span> },
    { key: "quota", label: "Kuota", render: (s) => (
      <div className="min-w-[110px]">
        <p className="text-xs font-semibold">{s.booked_count}/{s.capacity} terisi</p>
        <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
          <div className={`h-full ${s.is_full ? "bg-rose-500" : "bg-teal-500"}`} style={{ width: `${Math.min(100, (s.booked_count / s.capacity) * 100)}%` }} />
        </div>
      </div>) },
    { key: "status", label: "Status", render: (s) => <StatusBadge status={s.is_active ? "active" : "inactive"} /> },
    { key: "actions", label: <span className="sr-only">Aksi</span>, className: "text-right", render: (s) => (
      s.schedule_date < today ? <span className="text-xs text-gray-400">Sudah lewat</span> : (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>Ubah</Button>
          <Button size="sm" variant="ghost" onClick={() => toggleActive(s)}>{s.is_active ? "Nonaktifkan" : "Aktifkan"}</Button>
          <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setToDelete(s)}>Hapus</Button>
        </div>)) },
  ];

  return (
    <>
      <Card padded>
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between mb-4">
          <Tabs value={range} onChange={setRange} tabs={[
            { value: "upcoming", label: "Mendatang" }, { value: "past", label: "60 hari terakhir" }, { value: "all", label: "Semua" },
          ]} />
          <div className="flex flex-col sm:flex-row gap-2">
            {isAdmin && (
              <Select aria-label="Filter dokter" value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)} className="sm:w-56 mt-0">
                <option value="">Semua dokter</option>
                {(doctors || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            )}
            <Button onClick={openCreate}>+ Tambah Jadwal</Button>
          </div>
        </div>
        <AsyncBlock loading={loading} error={error} onRetry={reload} empty={!schedules?.length}
          emptyTitle="Belum ada jadwal praktik" emptyDescription="Tambahkan jadwal agar pasien dapat membuat janji temu."
          emptyAction={<Button onClick={openCreate}>+ Tambah Jadwal</Button>}>
          <DataTable columns={columns} rows={schedules || []} />
        </AsyncBlock>
      </Card>

      <FormModal open={!!form} title={form?.mode === "edit" ? "Ubah Jadwal Praktik" : "Tambah Jadwal Praktik"}
        onClose={() => setForm(null)} onSubmit={save} processing={saving} error={formError}>
        {form && (
          <>
            {isAdmin && form.mode === "create" && (
              <Field label="Dokter" error={errors.doctor_id} htmlFor="s-doc">
                <Select id="s-doc" value={form.values.doctor_id} onChange={(e) => setV("doctor_id", e.target.value)}>
                  <option value="">Pilih dokter</option>
                  {(doctors || []).map((d) => <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Tanggal Praktik" error={errors.schedule_date} htmlFor="s-date">
              <Input id="s-date" type="date" min={today} value={form.values.schedule_date} onChange={(e) => setV("schedule_date", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Jam Mulai" error={errors.start_time} htmlFor="s-start">
                <Input id="s-start" type="time" value={form.values.start_time} onChange={(e) => setV("start_time", e.target.value)} />
              </Field>
              <Field label="Jam Selesai" error={errors.end_time} htmlFor="s-end">
                <Input id="s-end" type="time" value={form.values.end_time} onChange={(e) => setV("end_time", e.target.value)} />
              </Field>
            </div>
            <Field label="Kapasitas Pasien" error={errors.capacity} hint="Jumlah maksimal booking untuk sesi ini." htmlFor="s-cap">
              <Input id="s-cap" type="number" min={1} max={200} value={form.values.capacity} onChange={(e) => setV("capacity", e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <input type="checkbox" className="rounded text-teal-600" checked={!!form.values.is_active} onChange={(e) => setV("is_active", e.target.checked)} />
              Jadwal aktif (dapat dipesan pasien)
            </label>
          </>
        )}
      </FormModal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={doDelete} processing={deleting}
        title="Hapus jadwal praktik?" confirmLabel="Hapus Jadwal"
        message={toDelete && `${formatDateLong(toDelete.schedule_date)}, ${formatTimeRange(toDelete.start_time, toDelete.end_time)}. Jadwal yang masih memiliki janji temu aktif tidak dapat dihapus; jadwal yang memiliki riwayat akan dinonaktifkan.`} />
    </>
  );
}
