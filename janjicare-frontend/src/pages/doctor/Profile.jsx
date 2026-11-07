import { useEffect, useState } from "react";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, Card, AsyncBlock, Field, Input, Textarea, Button } from "@/components/ui";
import { ProfileForm, PasswordForm } from "@/components/shared/ProfileSettings";
import toast from "@/lib/toast";

function PracticeForm({ doctor, onSaved }) {
  const [f, setF] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (doctor) setF({ specialty: doctor.specialty, bio: doctor.bio, experience_years: doctor.experience_years, consultation_fee: doctor.consultation_fee, is_available: doctor.is_available }); }, [doctor]);
  if (!f) return null;
  const save = async (e) => {
    e.preventDefault();
    const v = {};
    if (f.specialty.trim().length < 2) v.specialty = "Spesialisasi wajib diisi.";
    if (Number(f.experience_years) < 0) v.experience_years = "Tidak boleh negatif.";
    if (Number(f.consultation_fee) < 0) v.consultation_fee = "Tidak boleh negatif.";
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    try {
      await apiService.doctors.update(doctor.id, { ...f, specialty: f.specialty.trim(), experience_years: Number(f.experience_years), consultation_fee: Number(f.consultation_fee) });
      toast.success("Informasi praktik diperbarui."); onSaved();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };
  return (
    <Card title="Informasi Praktik">
      <form onSubmit={save} className="space-y-4" noValidate>
        <Field label="Spesialisasi" error={errors.specialty} htmlFor="dp-spec"><Input id="dp-spec" value={f.specialty} onChange={(e) => setF({ ...f, specialty: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pengalaman (tahun)" error={errors.experience_years} htmlFor="dp-exp"><Input id="dp-exp" type="number" min={0} value={f.experience_years} onChange={(e) => setF({ ...f, experience_years: e.target.value })} /></Field>
          <Field label="Biaya Konsultasi (Rp)" error={errors.consultation_fee} htmlFor="dp-fee"><Input id="dp-fee" type="number" min={0} step={5000} value={f.consultation_fee} onChange={(e) => setF({ ...f, consultation_fee: e.target.value })} /></Field>
        </div>
        <Field label="Profil Singkat" htmlFor="dp-bio"><Textarea id="dp-bio" rows={4} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <input type="checkbox" className="rounded text-teal-600" checked={!!f.is_available} onChange={(e) => setF({ ...f, is_available: e.target.checked })} />
          Menerima janji temu baru
        </label>
        <div className="flex justify-end"><Button type="submit" loading={saving}>Simpan Informasi Praktik</Button></div>
      </form>
    </Card>
  );
}

export default function DoctorProfile() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi(() => apiService.doctors.get(user.id), [user?.id], { enabled: !!user });
  return (
    <SidebarLayout>
      <PageHeader title="Profil Saya" description="Data ini tampil di halaman Cari Dokter untuk pasien." />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6"><ProfileForm /><PasswordForm /></div>
        <AsyncBlock loading={loading} error={error} onRetry={reload}><PracticeForm doctor={data} onSaved={() => reload({ silent: true })} /></AsyncBlock>
      </div>
    </SidebarLayout>
  );
}
