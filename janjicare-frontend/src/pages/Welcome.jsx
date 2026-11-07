import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Head from "@/components/Head";
import Brand from "@/components/Brand";

const STEPS = [
  { no: "01", title: "Pilih dokter", text: "Lihat profil, spesialisasi, dan jadwal praktik dokter yang tersedia di klinik." },
  { no: "02", title: "Pesan sesi", text: "Pilih tanggal dan sesi yang masih memiliki kuota. Booking tersimpan sebagai nomor urut Anda." },
  { no: "03", title: "Check-in di klinik", text: "Pada hari praktik, lakukan check-in. Nomor antrean dibuat otomatis dan bisa dipantau dari ponsel." },
];

const FEATURES = [
  { title: "Jadwal yang jelas", text: "Setiap sesi praktik menampilkan sisa kuota, sehingga Anda tahu sebelum datang apakah masih ada tempat." },
  { title: "Antrean dari ponsel", text: "Pantau nomor yang sedang dilayani dan berapa pasien di depan Anda tanpa harus menunggu di ruang tunggu." },
  { title: "Riwayat konsultasi", text: "Diagnosis dan catatan dokter tersimpan di akun Anda dan dapat dibuka kembali kapan saja." },
];

export default function Welcome({ auth }) {
  const [dark, setDark] = useState(() => {
    try { return JSON.parse(localStorage.getItem("darkMode") || "false"); } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("darkMode", JSON.stringify(dark)); } catch { /* abaikan */ }
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const loggedIn = !!auth?.user;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-slate-200">
      <Head title="Janji Temu Klinik" />

      <header className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" aria-label="JanjiCare — beranda"><Brand size={32} textClass="text-xl" /></Link>
          <nav className="flex items-center gap-2 sm:gap-4 text-sm font-semibold">
            <button type="button" onClick={() => setDark(!dark)} aria-label={dark ? "Mode terang" : "Mode gelap"}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800">
              {dark ? "Terang" : "Gelap"}
            </button>
            {loggedIn ? (
              <Link to="/dashboard" className="px-4 py-2 rounded-md bg-plum text-white hover:bg-ink dark:bg-heather dark:text-ink">Buka Dasbor</Link>
            ) : (
              <>
                <Link to="/login" className="px-3 py-2 text-gray-700 hover:text-ink dark:text-slate-300 dark:hover:text-white">Masuk</Link>
                <Link to="/register" className="px-4 py-2 rounded-md bg-plum text-white hover:bg-ink dark:bg-heather dark:text-ink">Daftar Pasien</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="bg-heather/50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28 grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moon dark:text-decant mb-5">Sistem janji temu klinik</p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.1] text-ink dark:text-white">
                Janji temu dokter,<br />tanpa antre panjang.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-gray-600 dark:text-slate-400 max-w-xl">
                Pesan jadwal praktik, lakukan check-in, dan pantau nomor antrean Anda dari satu tempat.
                Dokter dan petugas klinik bekerja dari data yang sama.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link to={loggedIn ? "/dashboard" : "/register"} className="px-6 py-3 rounded-md font-semibold bg-plum text-white hover:bg-ink dark:bg-heather dark:text-ink">
                  {loggedIn ? "Buka Dasbor" : "Buat Janji Temu"}
                </Link>
                <a href="#cara-kerja" className="px-6 py-3 rounded-md font-semibold border border-plum/30 text-plum hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  Cara Kerja
                </a>
              </div>
            </div>
            <aside className="lg:col-span-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Layar ruang tunggu</p>
              <div className="flex items-baseline justify-between border-b border-gray-200 dark:border-slate-800 pb-4">
                <span className="text-sm text-gray-500">Sedang dilayani</span>
                <span className="font-serif text-4xl font-semibold text-ink dark:text-white">A-012</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {["A-013", "A-014", "A-015"].map((n, i) => (
                  <li key={n} className="flex justify-between text-gray-600 dark:text-slate-400">
                    <span>{n}</span><span>{i === 0 ? "Berikutnya" : "Menunggu"}</span>
                  </li>
                ))}
              </ul>
              <Link to="/queue/tv" className="mt-5 inline-block text-sm font-semibold text-plum underline underline-offset-4 decoration-decant hover:decoration-plum dark:text-heather">
                Buka layar antrean
              </Link>
            </aside>
          </div>
        </section>

        <section id="cara-kerja" className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
          <h2 className="text-3xl font-semibold text-ink dark:text-white">Cara kerja</h2>
          <p className="mt-3 text-gray-600 dark:text-slate-400 max-w-2xl">Tiga langkah dari memilih dokter sampai diperiksa.</p>
          <ol className="mt-12 grid md:grid-cols-3 gap-px bg-gray-200 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden">
            {STEPS.map((s) => (
              <li key={s.no} className="bg-white dark:bg-slate-900 p-8">
                <span className="font-serif text-3xl text-decant">{s.no}</span>
                <h3 className="mt-4 text-xl font-semibold text-ink dark:text-white">{s.title}</h3>
                <p className="mt-2 text-gray-600 dark:text-slate-400 leading-relaxed">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 grid md:grid-cols-3 gap-10">
            {FEATURES.map((f) => (
              <div key={f.title} className="border-t-2 border-plum dark:border-heather pt-5">
                <h3 className="text-xl font-semibold text-ink dark:text-white">{f.title}</h3>
                <p className="mt-2 text-gray-600 dark:text-slate-400 leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-ink text-gray-400">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 grid sm:grid-cols-3 gap-8 text-sm">
          <div>
            <span className="font-serif text-xl font-semibold text-white">JanjiCare</span>
            <p className="mt-3 leading-relaxed">Sistem janji temu dan antrean klinik.</p>
          </div>
          <div>
            <p className="font-semibold text-white mb-3">Tautan</p>
            <ul className="space-y-2">
              <li><Link to="/login" className="hover:text-heather">Masuk</Link></li>
              <li><Link to="/register" className="hover:text-heather">Daftar Pasien</Link></li>
              <li><Link to="/queue/tv" className="hover:text-heather">Layar Antrean</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white mb-3">Kontak</p>
            <a href="mailto:support@janjicare.com" className="hover:text-heather">support@janjicare.com</a>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs">© {new Date().getFullYear()} JanjiCare</div>
      </footer>
    </div>
  );
}
