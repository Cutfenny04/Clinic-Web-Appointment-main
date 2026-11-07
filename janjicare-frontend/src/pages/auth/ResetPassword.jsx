import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InputError from "@/components/InputError";
import InputLabel from "@/components/InputLabel";
import TextInput from "@/components/TextInput";
import GuestLayout from "@/layouts/GuestLayout";
import { Link } from "react-router-dom";
import Head from "@/components/Head";
import { supabase } from "@/lib/supabase";

/** Dibuka dari tautan email Supabase (sesi pemulihan otomatis terbentuk dari URL). */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (form.password.length < 8) v.password = "Kata sandi minimal 8 karakter.";
    if (form.password !== form.confirm) v.confirm = "Konfirmasi kata sandi tidak sama.";
    setErrors(v);
    if (Object.keys(v).length) return;
    setProcessing(true);
    const { error } = await supabase.auth.updateUser({ password: form.password });
    setProcessing(false);
    if (error) return setErrors({ general: "Tautan sudah kedaluwarsa atau tidak valid. Minta tautan baru." });
    await supabase.auth.signOut();
    navigate("/login?reset=1", { replace: true });
  };

  return (
    <GuestLayout title="Buat Kata Sandi Baru" description="Masukkan kata sandi baru untuk akun Anda.">
      <Head title="Atur Ulang Kata Sandi" />
      {!ready ? (
        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-3">
          <p>Buka halaman ini melalui tautan pemulihan yang dikirim ke email Anda.</p>
          <Link to="/forgot-password" className="text-teal-600 font-bold hover:underline">Minta tautan pemulihan</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          {errors.general && <div role="alert" className="text-sm text-rose-700 bg-rose-50 p-3 rounded-xl">{errors.general}</div>}
          <div>
            <InputLabel htmlFor="password" value="Kata Sandi Baru" />
            <TextInput id="password" type="password" autoComplete="new-password" className="mt-1 block w-full rounded-xl py-3" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <InputError message={errors.password} className="mt-2" />
          </div>
          <div>
            <InputLabel htmlFor="confirm" value="Ulangi Kata Sandi Baru" />
            <TextInput id="confirm" type="password" autoComplete="new-password" className="mt-1 block w-full rounded-xl py-3" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
            <InputError message={errors.confirm} className="mt-2" />
          </div>
          <button disabled={processing} className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-full text-sm font-semibold text-cream bg-ink hover:bg-plum dark:bg-heather dark:text-ink dark:hover:bg-white disabled:opacity-50 transition-colors cursor-pointer">
            {processing ? "Menyimpan..." : "Simpan Kata Sandi"}
          </button>
        </form>
      )}
    </GuestLayout>
  );
}
