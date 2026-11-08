import { Link, useNavigate } from "react-router-dom";
import Head from "@/components/Head";
import Brand from "@/components/Brand";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-cream dark:bg-slate-950 flex flex-col">
      <Head title="Halaman Tidak Ditemukan" />
      <header className="max-w-7xl w-full mx-auto px-5 sm:px-8 h-20 flex items-center">
        <Link to="/" aria-label="JanjiCare — beranda"><Brand size={32} textClass="text-2xl" /></Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-5">
        <div className="text-center max-w-md">
          <p className="font-serif text-7xl text-decant">404</p>
          <h1 className="mt-4 text-3xl sm:text-4xl font-medium text-ink dark:text-white">Halaman tidak ditemukan</h1>
          <p className="mt-4 text-gray-600 dark:text-slate-400 leading-relaxed">
            Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" className="inline-flex items-center justify-center px-6 py-3 rounded-full font-semibold bg-ink text-cream hover:bg-plum dark:bg-heather dark:text-ink">
              Ke Beranda
            </Link>
            <button type="button" onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full font-semibold border border-gray-300 dark:border-slate-700 text-ink dark:text-white hover:border-ink">
              Kembali
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
