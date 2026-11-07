import { useState } from "react";
import InputError from "@/components/InputError";
import InputLabel from "@/components/InputLabel";
import TextInput from "@/components/TextInput";
import GuestLayout from "@/layouts/GuestLayout";
import { Link } from "react-router-dom";
import Head from "@/components/Head";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth, DASHBOARD_BY_ROLE } from "@/contexts/AuthContext";

/**
 * Registrasi publik — SELALU membuat akun pasien.
 * Tidak ada pilihan role; database memaksa role 'patient' (trigger handle_new_user).
 * Akun dokter/admin dibuat oleh admin klinik.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+62|62|0)[0-9]{8,13}$/;
const inputClass =
  "mt-1 block w-full border-gray-200/80 dark:border-slate-700/80 rounded-xl shadow-sm py-3 bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-white backdrop-blur-sm";

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [data, setForm] = useState({ full_name: "", email: "", phone: "", password: "", password_confirmation: "" });
  const setData = (k, v) => setForm((d) => ({ ...d, [k]: v }));

  const validate = () => {
    const e = {};
    if (data.full_name.trim().length < 3) e.full_name = "Nama lengkap minimal 3 karakter.";
    if (!EMAIL_RE.test(data.email.trim())) e.email = "Format email tidak valid.";
    if (data.phone && !PHONE_RE.test(data.phone.replace(/[\s-]/g, ""))) e.phone = "Nomor telepon diawali 08, 62, atau +62 (10–15 digit).";
    if (data.password.length < 8) e.password = "Kata sandi minimal 8 karakter.";
    if (data.password !== data.password_confirmation) e.password_confirmation = "Konfirmasi kata sandi tidak sama.";
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;
    setProcessing(true);
    try {
      const { needsConfirmation } = await register({
        full_name: data.full_name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        phone: data.phone.replace(/[\s-]/g, "") || undefined,
      });
      if (needsConfirmation) return navigate("/login?confirm=1", { replace: true });
      const user = await login(data.email, data.password);
      navigate(DASHBOARD_BY_ROLE[user.role], { replace: true });
    } catch (err) {
      const fieldErrors = Object.fromEntries((err.errors || []).map((x) => [x.field, x.message]));
      setErrors({ ...fieldErrors, general: err.message });
    } finally {
      setProcessing(false);
    }
  };

  const field = (name, label, props = {}) => (
    <div>
      <InputLabel htmlFor={name} value={label} className="font-semibold text-gray-700 dark:text-gray-200" />
      <TextInput id={name} name={name} value={data[name]} className={inputClass} onChange={(e) => setData(name, e.target.value)} {...props} />
      <InputError message={errors[name]} className="mt-2" />
    </div>
  );

  return (
    <GuestLayout
      title="Buat Akun Pasien"
      description="Daftar untuk mencari dokter, membuat janji temu, dan memantau nomor antrean Anda."
    >
      <Head title="Daftar" />
      {errors.general && (
        <div role="alert" className="mb-4 text-sm font-medium text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300 p-3 rounded-lg border border-rose-100 dark:border-rose-800/40">
          {errors.general}
        </div>
      )}
      <form onSubmit={submit} className="space-y-5" noValidate>
        {field("full_name", "Nama Lengkap", { placeholder: "Sesuai kartu identitas", autoComplete: "name", isFocused: true })}
        {field("email", "Alamat Email", { type: "email", placeholder: "Masukkan alamat email aktif", autoComplete: "email" })}
        {field("phone", "Nomor Telepon (opsional)", { type: "tel", placeholder: "08xxxxxxxxxx", autoComplete: "tel" })}
        <div>
          <InputLabel htmlFor="password" value="Kata Sandi" className="font-semibold text-gray-700 dark:text-gray-200" />
          <div className="relative">
            <TextInput
              id="password" name="password" type={showPassword ? "text" : "password"} value={data.password}
              placeholder="Minimal 8 karakter" autoComplete="new-password" className={`${inputClass} pr-16`}
              onChange={(e) => setData("password", e.target.value)}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-gray-400 hover:text-teal-600"
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>
              {showPassword ? "Sembunyikan" : "Tampilkan"}
            </button>
          </div>
          <InputError message={errors.password} className="mt-2" />
        </div>
        {field("password_confirmation", "Konfirmasi Kata Sandi", {
          type: showPassword ? "text" : "password", placeholder: "Ulangi kata sandi", autoComplete: "new-password",
        })}

        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Akun yang dibuat melalui halaman ini adalah akun <strong>pasien</strong>. Akun dokter dan admin dibuat oleh pengelola klinik.
        </p>

        <button
          disabled={processing}
          className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-full shadow-[0_4px_14px_0_rgb(20,184,166,0.39)] text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-blue-600 hover:scale-[1.02] outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-all cursor-pointer"
        >
          <span>{processing ? "Mendaftarkan..." : "Daftar"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Sudah punya akun? <Link to="/login" className="text-teal-600 font-bold hover:underline">Masuk</Link>
        </p>
      </form>
    </GuestLayout>
  );
}
