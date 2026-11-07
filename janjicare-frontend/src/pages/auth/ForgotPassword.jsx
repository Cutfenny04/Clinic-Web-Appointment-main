import { useState } from "react";
import InputError from "@/components/InputError";
import InputLabel from "@/components/InputLabel";
import TextInput from "@/components/TextInput";
import GuestLayout from "@/layouts/GuestLayout";
import { Link } from "react-router-dom";
import Head from "@/components/Head";
import { supabase } from "@/lib/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [processing, setProcessing] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setError("Format email tidak valid.");
    setError(null); setProcessing(true);
    // Pesan sama untuk email terdaftar maupun tidak (mencegah enumerasi akun)
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/reset-password` }).catch(() => {});
    setProcessing(false);
    setStatus("Jika email tersebut terdaftar, tautan untuk membuat kata sandi baru telah dikirim. Periksa kotak masuk atau folder spam.");
  };

  return (
    <GuestLayout title="Atur Ulang Kata Sandi" description="Masukkan alamat email Anda untuk menerima tautan pemulihan kata sandi.">
      <Head title="Lupa Kata Sandi" />
      {status && (
        <div role="status" className="mb-6 text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 p-3 rounded-xl border border-green-100 dark:border-green-800/50">{status}</div>
      )}
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div>
          <InputLabel htmlFor="email" value="Alamat Email" className="font-semibold text-gray-700 dark:text-gray-200" />
          <TextInput id="email" type="email" name="email" value={email} isFocused autoComplete="email"
            className="mt-1 block w-full rounded-xl py-3" placeholder="Masukkan alamat email" onChange={(e) => setEmail(e.target.value)} />
          <InputError message={error} className="mt-2" />
        </div>
        <button disabled={processing} className="w-full py-3.5 rounded-md text-sm font-bold text-white bg-blue-700 disabled:opacity-50">
          {processing ? "Mengirim..." : "Kirim Tautan Pemulihan"}
        </button>
        <p className="text-center text-sm"><Link to="/login" className="text-teal-600 font-bold hover:underline">Kembali ke halaman masuk</Link></p>
      </form>
    </GuestLayout>
  );
}
