import { useMemo, useState } from "react";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import {
  PageHeader, Card, AsyncBlock, DataTable, StatusBadge, Button, ConfirmDialog, FormModal, Field, Input, Textarea, SearchInput,
} from "@/components/ui";
import { formatCurrency } from "@/utils/format";
import toast from "@/lib/toast";
import DoctorPhoto from "@/components/shared/DoctorPhoto";
import DoctorPhotoInput from "@/components/shared/DoctorPhotoInput";
import { uploadDoctorPhoto, deleteDoctorPhoto } from "@/services/doctorPhotos";

const EMPTY = { full_name: "", email: "", password: "", phone: "", specialty: "", bio: "", experience_years: 0, consultation_fee: 0, is_available: true };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminDoctors() {
  const { data, loading, error, reload } = useApi(() => apiService.doctors.list(), []);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [toggle, setToggle] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => (data || []).filter((d) =>
    [d.name, d.email, d.specialty].join(" ").toLowerCase().includes(q.toLowerCase())), [data, q]);

  const setV = (k, v) => setForm((f) => ({ ...f, values: { ...f.values, [k]: v } }));
  const NO_PHOTO = { file: null, remove: false };
  const resetMsgs = () => { setErrors({}); setFormError(null); setPhotoError(null); };
  const openCreate = () => { resetMsgs(); setForm({ mode: "create", values: { ...EMPTY }, photo: NO_PHOTO, currentUrl: null }); };
  const openEdit = (d) => {
    resetMsgs();
    setForm({ mode: "edit", id: d.id, values: { ...EMPTY, ...d, full_name: d.name, phone: d.phone || "" }, photo: NO_PHOTO, currentUrl: d.photo_url || null });
  };

  /** Terapkan perubahan foto setelah data dokter tersimpan. Foto lama baru dihapus server setelah foto baru berhasil. */
  const applyPhoto = async (doctorId, photo) => {
    if (!photo.file && !photo.remove) return null;
    setPhotoBusy(true);
    try {
      return photo.file ? await uploadDoctorPhoto(doctorId, photo.file) : await deleteDoctorPhoto(doctorId);
    } finally { setPhotoBusy(false); }
  };

  const save = async () => {
    const v = form.values;
    const e = {};
    if (v.full_name.trim().length < 3) e.full_name = "Nama minimal 3 karakter.";
    if (form.mode === "create") {
      if (!EMAIL_RE.test(v.email)) e.email = "Format email tidak valid.";
      if (v.password.length < 8) e.password = "Kata sandi awal minimal 8 karakter.";
    }
    if (v.specialty.trim().length < 2) e.specialty = "Spesialisasi wajib diisi.";
    if (Number(v.experience_years) < 0) e.experience_years = "Tidak boleh negatif.";
    if (Number(v.consultation_fee) < 0) e.consultation_fee = "Tidak boleh negatif.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const payload = {
      full_name: v.full_name.trim(), phone: v.phone.replace(/[\s-]/g, ""), specialty: v.specialty.trim(), bio: v.bio,
      experience_years: Number(v.experience_years), consultation_fee: Number(v.consultation_fee), is_available: !!v.is_available,
    };
    setSaving(true); setFormError(null); setPhotoError(null);
    let saved = null;
    try {
      if (form.mode === "create") {
        saved = (await apiService.doctors.create({ ...payload, email: v.email.trim().toLowerCase(), password: v.password })).data;
      } else {
        saved = (await apiService.doctors.update(form.id, payload)).data;
      }
    } catch (err) {
      setFormError(err.message);
      setErrors(Object.fromEntries((err.errors || []).map((x) => [x.field, x.message])));
      setSaving(false);
      return;
    }
    try {
      const withPhoto = await applyPhoto(saved.id, form.photo);
      toast.success(form.mode === "create"
        ? "Akun dokter berhasil dibuat. Berikan email & kata sandi awal kepada dokter."
        : "Data dokter diperbarui.");
      if (withPhoto?.photo_url && form.mode === "create") toast.success("Foto profil tersimpan.");
      setForm(null); reload();
    } catch (err) {
      // Data dokter sudah tersimpan; foto gagal → tetap di formulir (mode ubah) agar admin bisa mencoba lagi.
      setPhotoError(`Data dokter tersimpan, tetapi foto gagal diunggah: ${err.message}`);
      setForm((f) => ({ ...f, mode: "edit", id: saved.id, currentUrl: saved.photo_url || f.currentUrl }));
      reload({ silent: true });
    } finally { setSaving(false); }
  };

  const doToggle = async () => {
    setBusy(true);
    try {
      if (toggle.is_active) {
        const r = await apiService.doctors.remove(toggle.id);
        toast.success(r.message);
      } else {
        await apiService.doctors.update(toggle.id, { is_active: true, is_available: true });
        toast.success("Dokter diaktifkan kembali.");
      }
      setToggle(null); reload({ silent: true });
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <SidebarLayout>
      <PageHeader title="Data Dokter" description="Akun dokter dibuat oleh admin — tidak melalui pendaftaran publik."
        actions={<Button onClick={openCreate}>+ Tambah Dokter</Button>} />
      <Card>
        <div className="mb-4"><SearchInput value={q} onChange={setQ} placeholder="Cari nama, email, spesialisasi" /></div>
        <AsyncBlock loading={loading} error={error} onRetry={reload} empty={!rows.length}
          emptyTitle={q ? "Tidak ada dokter yang cocok" : "Belum ada dokter"}
          emptyAction={!q && <Button onClick={openCreate}>+ Tambah Dokter</Button>}>
          <DataTable rows={rows} columns={[
            { key: "name", label: "Dokter", render: (d) => (
              <div className="flex items-center gap-3">
                <DoctorPhoto doctor={d} size="avatar" />
                <div><p className="font-semibold">{d.name}</p><p className="text-xs text-gray-500">{d.email}</p></div>
              </div>) },
            { key: "specialty", label: "Spesialisasi" },
            { key: "exp", label: "Pengalaman", render: (d) => `${d.experience_years} tahun` },
            { key: "fee", label: "Biaya", render: (d) => formatCurrency(d.consultation_fee) },
            { key: "status", label: "Status", render: (d) => !d.is_active ? <StatusBadge status="inactive" label="Nonaktif" />
              : d.is_available ? <StatusBadge status="active" label="Menerima pasien" /> : <StatusBadge status="pending" label="Cuti" /> },
            { key: "act", label: <span className="sr-only">Aksi</span>, className: "text-right", render: (d) => (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(d)}>Ubah</Button>
                <Button size="sm" variant="ghost" className={d.is_active ? "text-rose-600" : "text-emerald-600"} onClick={() => setToggle(d)}>
                  {d.is_active ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </div>) },
          ]} />
        </AsyncBlock>
      </Card>

      <FormModal open={!!form} title={form?.mode === "edit" ? "Ubah Data Dokter" : "Tambah Dokter"} onClose={() => setForm(null)}
        onSubmit={save} processing={saving} error={formError} maxWidth="2xl"
        submitLabel={photoBusy ? "Mengunggah foto..." : form?.mode === "edit" ? "Simpan" : "Buat Akun Dokter"}>
        {form && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 pb-4 border-b border-gray-100 dark:border-slate-800">
              <DoctorPhotoInput doctor={{ name: form.values.full_name }} currentUrl={form.currentUrl} value={form.photo}
                onChange={(photo) => { setPhotoError(null); setForm((f) => ({ ...f, photo })); }} busy={photoBusy} error={photoError} />
            </div>
            <Field label="Nama Lengkap & Gelar" error={errors.full_name} htmlFor="d-name">
              <Input id="d-name" placeholder="dr. Nama, Sp.X" value={form.values.full_name} onChange={(e) => setV("full_name", e.target.value)} />
            </Field>
            <Field label="Spesialisasi" error={errors.specialty} htmlFor="d-spec">
              <Input id="d-spec" placeholder="Dokter Umum, Anak, Penyakit Dalam..." value={form.values.specialty} onChange={(e) => setV("specialty", e.target.value)} />
            </Field>
            {form.mode === "create" && (
              <>
                <Field label="Email Login" error={errors.email} htmlFor="d-email">
                  <Input id="d-email" type="email" value={form.values.email} onChange={(e) => setV("email", e.target.value)} />
                </Field>
                <Field label="Kata Sandi Awal" error={errors.password} hint="Minta dokter menggantinya setelah masuk." htmlFor="d-pw">
                  <Input id="d-pw" type="text" autoComplete="off" value={form.values.password} onChange={(e) => setV("password", e.target.value)} />
                </Field>
              </>
            )}
            <Field label="Nomor Telepon" error={errors.phone} htmlFor="d-phone">
              <Input id="d-phone" type="tel" value={form.values.phone} onChange={(e) => setV("phone", e.target.value)} />
            </Field>
            <Field label="Pengalaman (tahun)" error={errors.experience_years} htmlFor="d-exp">
              <Input id="d-exp" type="number" min={0} value={form.values.experience_years} onChange={(e) => setV("experience_years", e.target.value)} />
            </Field>
            <Field label="Biaya Konsultasi (Rp)" error={errors.consultation_fee} htmlFor="d-fee">
              <Input id="d-fee" type="number" min={0} step={5000} value={form.values.consultation_fee} onChange={(e) => setV("consultation_fee", e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 sm:mt-7">
              <input type="checkbox" className="rounded text-teal-600" checked={!!form.values.is_available} onChange={(e) => setV("is_available", e.target.checked)} />
              Menerima janji temu
            </label>
            <div className="sm:col-span-2">
              <Field label="Profil Singkat" htmlFor="d-bio"><Textarea id="d-bio" value={form.values.bio} onChange={(e) => setV("bio", e.target.value)} /></Field>
            </div>
          </div>
        )}
      </FormModal>

      <ConfirmDialog open={!!toggle} onClose={() => setToggle(null)} onConfirm={doToggle} processing={busy}
        variant={toggle?.is_active ? "danger" : "success"}
        title={toggle?.is_active ? "Nonaktifkan dokter?" : "Aktifkan dokter?"}
        confirmLabel={toggle?.is_active ? "Nonaktifkan" : "Aktifkan"}
        message={toggle?.is_active
          ? `${toggle?.name} tidak akan bisa masuk dan tidak tampil untuk pasien. Riwayat konsultasi tetap tersimpan. Ditolak bila masih ada janji temu aktif.`
          : `${toggle?.name} dapat masuk kembali dan menerima janji temu.`} />
    </SidebarLayout>
  );
}
