import route from '@/utils/route';
import InputError from "@/components/InputError";
import InputLabel from "@/components/InputLabel";
import PrimaryButton from "@/components/PrimaryButton";
import TextInput from "@/components/TextInput";
import GuestLayout from "@/layouts/GuestLayout";
import { Head, useForm } from "@inertiajs/react";

export default function ConfirmPassword() {
  const { data, setData, post, processing, errors, reset } = useForm({
    password: ""
  });

  const submit = (e) => {
    e.preventDefault();
    post(route("password.confirm"), {
      onFinish: () => reset("password")
    });
  };

  return (
    <GuestLayout
      title="Konfirmasi Kata Sandi"
      description="Ini adalah area aman aplikasi JanjiCare. Harap konfirmasikan kata sandi Anda sebelum melanjutkan."
    >
      <Head title="Konfirmasi Kata Sandi" />

      <form onSubmit={submit} className="space-y-4">
        <div>
          <InputLabel htmlFor="password" value="Kata Sandi" className="font-semibold text-gray-700 dark:text-gray-200" />
          <TextInput
            id="password"
            type="password"
            name="password"
            value={data.password}
            placeholder="Masukkan kata sandi Anda"
            className="mt-1 block w-full border-gray-200/80 dark:border-slate-700/80 rounded-xl shadow-sm py-3 bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-white backdrop-blur-sm"
            isFocused={true}
            onChange={(e) => setData("password", e.target.value)}
          />
          <InputError message={errors.password} className="mt-2" />
        </div>

        <div className="mt-6 flex items-center justify-end">
          <PrimaryButton className="w-full justify-center py-3.5" disabled={processing}>
            Konfirmasi
          </PrimaryButton>
        </div>
      </form>
    </GuestLayout>
  );
}
