import { Link, useLocation } from "react-router-dom";
import { useAuth, DASHBOARD_BY_ROLE } from "../../contexts/AuthContext";
import { useEffect } from "react";

export default function AccessDenied() {
  const { user } = useAuth();
  const location = useLocation();
  useEffect(() => { document.title = "Akses Ditolak - JanjiCare"; }, []);
  const home = user ? DASHBOARD_BY_ROLE[user.role] : "/login";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-900/20">
          <svg className="h-8 w-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-1">Kode 403</p>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-3">Akses Ditolak</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          Akun Anda{user ? ` (${{ admin: "Admin", doctor: "Dokter", patient: "Pasien" }[user.role]})` : ""} tidak memiliki izin untuk membuka
          {location.state?.from ? <> halaman <code className="px-1 rounded bg-gray-100 dark:bg-slate-800">{location.state.from}</code></> : " halaman ini"}.
        </p>
        <Link to={home} className="inline-flex items-center justify-center w-full px-4 py-3 bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all">
          Kembali ke Dasbor
        </Link>
      </div>
    </div>
  );
}
