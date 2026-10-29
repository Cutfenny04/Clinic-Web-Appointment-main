import route from '@/utils/route';
import Checkbox from "@/components/Checkbox";
import InputError from "@/components/InputError";
import InputLabel from "@/components/InputLabel";
import TextInput from "@/components/TextInput";
import GuestLayout from "@/layouts/GuestLayout";
import { Head, Link, useForm } from "@inertiajs/react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Shield, Stethoscope, User, ArrowRight } from "lucide-react";

export default function Login({ status, canResetPassword = true }) {
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const { data, setData, post, processing, errors, reset } = useForm({
    email: "",
    password: "",
    remember: false
  });

  const submit = (e) => {
    e.preventDefault();
    post(route("login"), {
      onFinish: () => reset("password")
    });
  };

  const handleQuickLogin = (role) => {
    const user = login(role);
    if (user.role === 'admin') navigate('/admin/dashboard');
    else if (user.role === 'doctor') navigate('/doctor/dashboard');
    else navigate('/patient/dashboard');
  };

  return (
    <GuestLayout title="Welcome Back" description="Log in to access your appointments and records.">
      <Head title="Log in" />
      {status && (
        <div className="mb-4 text-sm font-medium text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
          {status}
        </div>
      )}

      {/* Quick Demo Switcher */}
      <div className="mb-6 p-4 rounded-2xl bg-teal-50/70 dark:bg-slate-800/60 border border-teal-200/50 dark:border-slate-700">
        <p className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <span>⚡ Demo Quick Login:</span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin('admin')}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-white dark:bg-slate-700/80 hover:bg-teal-500 hover:text-white dark:hover:bg-teal-600 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition-all group"
          >
            <Shield className="w-4 h-4 mb-1 text-teal-600 dark:text-teal-400 group-hover:text-white" />
            <span>Admin</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('doctor')}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-white dark:bg-slate-700/80 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition-all group"
          >
            <Stethoscope className="w-4 h-4 mb-1 text-blue-600 dark:text-blue-400 group-hover:text-white" />
            <span>Dokter</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('patient')}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-white dark:bg-slate-700/80 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition-all group"
          >
            <User className="w-4 h-4 mb-1 text-emerald-600 dark:text-emerald-400 group-hover:text-white" />
            <span>Pasien</span>
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <InputLabel htmlFor="email" value="Email Address" className="font-semibold text-gray-700 dark:text-gray-200" />
          <TextInput
            id="email"
            type="email"
            name="email"
            value={data.email}
            className="mt-1 block w-full border-gray-200/80 dark:border-slate-700/80 rounded-xl shadow-sm py-3 bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-white backdrop-blur-sm"
            autoComplete="username"
            isFocused={true}
            onChange={(e) => setData("email", e.target.value)}
          />
          <InputError message={errors.email} className="mt-2" />
        </div>

        <div>
          <InputLabel htmlFor="password" value="Password" className="font-semibold text-gray-700 dark:text-gray-200" />
          <div className="relative">
            <TextInput
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={data.password}
              className="mt-1 block w-full border-gray-200/80 dark:border-slate-700/80 rounded-xl shadow-sm py-3 pr-10 bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-white backdrop-blur-sm"
              autoComplete="current-password"
              onChange={(e) => setData("password", e.target.value)}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 outline-none transition-all"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <InputError message={errors.password} className="mt-2" />
        </div>

        <div className="block">
          <label className="flex items-center">
            <Checkbox
              name="remember"
              checked={data.remember}
              onChange={(e) => setData("remember", e.target.checked)}
              className="text-teal-600 focus:ring-teal-500 rounded"
            />
            <span className="ms-2 text-sm text-gray-600 dark:text-gray-300 font-medium">
              Remember me
            </span>
          </label>
        </div>

        <div className="flex flex-col space-y-4 pt-2">
          <button
            disabled={processing}
            className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-full shadow-[0_4px_14px_0_rgb(20,184,166,0.39)] text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-blue-600 hover:shadow-[0_6px_20px_rgba(20,184,166,0.23)] hover:scale-[1.02] outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-all"
          >
            <span>Log in</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-between mt-2">
            {canResetPassword && (
              <Link
                href={route("password.request")}
                className="text-sm text-teal-600 font-semibold hover:text-teal-500 transition-all"
              >
                Forgot your password?
              </Link>
            )}
            <Link
              href={route("register")}
              className="text-sm text-gray-500 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-white transition-all"
            >
              Don't have an account?
            </Link>
          </div>
        </div>
      </form>
    </GuestLayout>
  );
}
