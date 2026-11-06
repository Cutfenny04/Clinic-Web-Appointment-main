import route from '@/utils/route';
import InputError from "@/components/InputError";
import InputLabel from "@/components/InputLabel";
import PrimaryButton from "@/components/PrimaryButton";
import TextInput from "@/components/TextInput";
import GuestLayout from "@/layouts/GuestLayout";
import { Head, useForm } from "@inertiajs/react";

export default function ResetPassword({ token, email }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    token,
    email,
    password: "",
    password_confirmation: ""
  });

  const submit = (e) => {
    e.preventDefault();
    post(route("password.store"), {
      onFinish: () => reset("password", "password_confirmation")
    });
  };

  return (
    <GuestLayout
      title="Kata Sandi Baru"
      description="Silakan buat kata sandi baru untuk akun JanjiCare Anda."
    >
      <Head title="Atur Ulang Kata Sandi" />

      <form onSubmit={submit} className="space-y-4">
        <div>
          <InputLabel htmlFor="email" value="Alamat Email" className="font-semibold text-gray-700 dark:text-gray-200" />
          <TextInput
            id="email"
            type="email"
            name="email"
            value={data.email}
            placeholder="Alamat email Anda"
            className="mt-1 block w-full border-gray-200/80 dark:border-slate-700/80 rounded-xl shadow-sm py-3 bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-white backdrop-blur-sm"
            autoComplete="username"
            onChange={(e) => setData("email", e.target.value)}
          />
          <InputError message={errors.email} className="mt-2" />
        </div>

        <div className="mt-4">
          <InputLabel htmlFor="password" value="Kata Sandi Baru" className="font-semibold text-gray-700 dark:text-gray-200" />
          <TextInput
            id="password"
            type="password"
            name="password"
            value={data.password}
            placeholder="Minimal 8 karakter"
            className="mt-1 block w-full border-gray-200/80 dark:border-slate-700/80 rounded-xl shadow-sm py-3 bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-white backdrop-blur-sm"
            autoComplete="new-password"
            isFocused={true}
            onChange={(e) => setData("password", e.target.value)}
          />
          <InputError message={errors.password} className="mt-2" />
        </div>

        <div className="mt-4">
          <InputLabel
            htmlFor="password_confirmation"
            value="Konfirmasi Kata Sandi Baru"
            className="font-semibold text-gray-700 dark:text-gray-200"
          />
          <TextInput
            type="password"
            id="password_confirmation"
            name="password_confirmation"
            value={data.password_confirmation}
            placeholder="Ulangi kata sandi baru"
            className="mt-1 block w-full border-gray-200/80 dark:border-slate-700/80 rounded-xl shadow-sm py-3 bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-white backdrop-blur-sm"
            autoComplete="new-password"
            onChange={(e) => setData("password_confirmation", e.target.value)}
          />
          <InputError message={errors.password_confirmation} className="mt-2" />
        </div>

        <div className="mt-6 flex items-center justify-end">
          <PrimaryButton className="w-full justify-center py-3.5" disabled={processing}>
            Perbarui Kata Sandi
          </PrimaryButton>
        </div>
      </form>
    </GuestLayout>
  );
}
