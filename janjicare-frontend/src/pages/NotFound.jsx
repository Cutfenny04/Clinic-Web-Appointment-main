import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 selection:bg-teal-500 selection:text-white">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 mb-6 shadow-inner ring-1 ring-teal-500/20">
          <Stethoscope className="w-10 h-10 animate-pulse" />
        </div>
        <h1 className="text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">404</h1>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3">Halaman Tidak Ditemukan</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          Maaf, halaman JanjiCare yang Anda cari tidak tersedia atau tautan telah dipindahkan.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/20 transition-all duration-200"
          >
            <Home className="w-4 h-4" />
            Ke Beranda
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all duration-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
        </div>
      </div>
    </div>
  );
}
