import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/api";
import { supabase } from "@/lib/supabase";
import { Card, Field, Input, Button } from "@/components/ui";
import toast from "@/lib/toast";

const PHONE_RE = /^(\+62|62|0)[0-9]{8,13}$/;

export function ProfileForm() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ full_name: user?.full_name || "", phone: user?.phone || "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (form.full_name.trim().length < 3) v.full_name = "Nama minimal 3 karakter.";
    if (form.phone && !PHONE_RE.test(form.phone.replace(/[\s-]/g, ""))) v.phone = "Format nomor telepon tidak valid.";
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    try {
      await apiService.auth.updateProfile({ full_name: form.full_name.trim(), phone: form.phone.replace(/[\s-]/g, "") });
      await refreshUser();
      toast.success("Profil berhasil diperbarui.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Informasi Akun">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" hint="Email digunakan untuk masuk dan tidak dapat diubah di sini.">
          <Input value={user?.email || ""} disabled readOnly />
        </Field>
        <Field label="Nama Lengkap" error={errors.full_name} htmlFor="pf-name">
          <Input id="pf-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label="Nomor Telepon" error={errors.phone} htmlFor="pf-phone">
          <Input id="pf-phone" type="tel" value={form.phone} placeholder="08xxxxxxxxxx" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <div className="flex justify-end"><Button type="submit" loading={saving}>Simpan Profil</Button></div>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (form.password.length < 8) v.password = "Kata sandi minimal 8 karakter.";
    if (form.password !== form.confirm) v.confirm = "Konfirmasi kata sandi tidak sama.";
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: form.password });
    setSaving(false);
    if (error) return toast.error("Gagal mengubah kata sandi. Coba masuk ulang lalu ulangi.");
    setForm({ password: "", confirm: "" });
    toast.success("Kata sandi berhasil diubah.");
  };
  return (
    <Card title="Ubah Kata Sandi">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Kata Sandi Baru" error={errors.password} htmlFor="pw-new">
          <Input id="pw-new" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Field label="Ulangi Kata Sandi Baru" error={errors.confirm} htmlFor="pw-confirm">
          <Input id="pw-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </Field>
        <div className="flex justify-end"><Button type="submit" loading={saving}>Ubah Kata Sandi</Button></div>
      </form>
    </Card>
  );
}
