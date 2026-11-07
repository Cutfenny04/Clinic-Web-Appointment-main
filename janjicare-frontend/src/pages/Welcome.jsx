import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Head from "@/components/Head";
import Brand from "@/components/Brand";

/* Ikon garis sederhana */
const Icon = ({ d, className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);
const ArrowIcon = () => <Icon className="w-4 h-4" d="M7 17L17 7M17 7H8M17 7v9" />;

const SERVICES = [
  {
    title: "Cari dokter",
    text: "Lihat dokter yang berpraktik, spesialisasinya, dan jadwal yang dibuka klinik.",
    to: "/register",
    action: "Lihat dokter",
    icon: "M21 21l-5.2-5.2M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z",
  },
  {
    title: "Buat janji temu",
    text: "Pilih tanggal dan sesi yang masih memiliki kuota, lalu tulis keluhan Anda.",
    to: "/register",
    action: "Pesan jadwal",
    icon: "M8 7V3m8 4V3M4 11h16M5 21h14a1 1 0 001-1V7a1 1 0 00-1-1H5a1 1 0 00-1 1v13a1 1 0 001 1z",
  },
  {
    title: "Pantau antrean",
    text: "Setelah check-in, nomor antrean muncul di akun Anda dan di layar ruang tunggu.",
    to: "/queue/tv",
    action: "Buka layar antrean",
    icon: "M4 6h16M4 12h16M4 18h9",
  },
];

const STEPS = [
  { no: "01", title: "Daftar akun pasien", text: "Cukup nama, email, dan kata sandi." },
  { no: "02", title: "Pilih dokter & sesi", text: "Kuota setiap sesi terlihat sebelum Anda memesan." },
  { no: "03", title: "Konfirmasi dari klinik", text: "Petugas atau dokter mengonfirmasi janji temu Anda." },
  { no: "04", title: "Check-in & dipanggil", text: "Nomor antrean dibuat otomatis saat Anda check-in." },
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
  const primaryTo = loggedIn ? "/dashboard" : "/register";

  return (
    <div className="min-h-screen bg-cream dark:bg-slate-950 text-gray-700 dark:text-slate-300">
      <Head title="Janji Temu Klinik" />

      {/* Navigasi */}
      <header className="max-w-7xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
        <Link to="/" aria-label="JanjiCare — beranda"><Brand size={34} textClass="text-2xl" /></Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-600 dark:text-slate-400" aria-label="Navigasi utama">
          <a href="#layanan" className="hover:text-ink dark:hover:text-white">Layanan</a>
          <a href="#cara-kerja" className="hover:text-ink dark:hover:text-white">Cara Kerja</a>
          <Link to="/queue/tv" className="hover:text-ink dark:hover:text-white">Layar Antrean</Link>
        </nav>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setDark(!dark)} aria-label={dark ? "Gunakan mode terang" : "Gunakan mode gelap"}
            className="hidden sm:inline-flex p-2 rounded-full text-gray-500 hover:bg-white dark:hover:bg-slate-800">
            <Icon className="w-5 h-5" d={dark ? "M12 3v1m0 16v1m9-9h-1M4 12H3m15.4 6.4l-.7-.7M6.3 6.3l-.7-.7m12.8 0l-.7.7M6.3 17.7l-.7.7M16 12a4 4 0 11-8 0 4 4 0 018 0z" : "M20.4 15.4A9 9 0 018.6 3.6 9 9 0 1020.4 15.4z"} />
          </button>
          {!loggedIn && <Link to="/login" className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-ink dark:text-slate-300 dark:hover:text-white">Masuk</Link>}
          <Link to={primaryTo} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold border border-ink/80 text-ink hover:bg-ink hover:text-cream dark:border-heather dark:text-heather dark:hover:bg-heather dark:hover:text-ink transition-colors">
            {loggedIn ? "Buka Dasbor" : "Daftar"} <ArrowIcon />
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 pt-8 pb-20 lg:pt-14 lg:pb-28 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6">
            <span className="inline-block px-3 py-1 rounded-full border border-decant text-[11px] font-semibold uppercase tracking-[0.18em] text-moon dark:text-decant">
              Janji temu klinik
            </span>
            <h1 className="mt-6 text-5xl sm:text-6xl xl:text-7xl font-medium leading-[1.04] text-ink dark:text-white">
              Datang ke klinik <em className="italic text-plum dark:text-heather">sesuai jadwal</em>, bukan menunggu giliran.
            </h1>
            <p className="mt-7 text-lg leading-relaxed text-gray-600 dark:text-slate-400 max-w-lg">
              Pesan sesi praktik dokter, lakukan check-in saat tiba, dan lihat nomor antrean Anda langsung dari ponsel.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to={primaryTo} className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold bg-ink text-cream hover:bg-plum dark:bg-heather dark:text-ink dark:hover:bg-white transition-colors">
                {loggedIn ? "Buka Dasbor" : "Buat Janji Temu"} <ArrowIcon />
              </Link>
              <a href="#cara-kerja" className="font-semibold text-ink dark:text-white underline underline-offset-[6px] decoration-decant hover:decoration-plum">
                Lihat cara kerjanya
              </a>
            </div>
          </div>
          <div className="lg:col-span-6 relative">
            <div className="overflow-hidden rounded-[2rem] bg-heather aspect-[4/3.4]">
              <img src="/image/perawat1.jpg" alt="Perawat mendampingi pasien di lorong klinik"
                className="w-full h-full object-cover" width="500" height="500" fetchpriority="high" />
            </div>
            <div className="hidden sm:block absolute -bottom-6 -left-6 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 px-6 py-5 max-w-[15rem]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-moon">Setelah check-in</p>
              <p className="mt-1 font-serif text-lg leading-snug text-ink dark:text-white">Nomor antrean langsung tampil di akun Anda.</p>
            </div>
          </div>
        </section>

        {/* Tentang */}
        <section className="bg-white dark:bg-slate-900 border-y border-gray-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-28 grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 order-2 lg:order-1">
              <div className="overflow-hidden rounded-[1.5rem] aspect-square max-w-md">
                <img src="/image/hospital.jpg" alt="Gedung fasilitas kesehatan" loading="lazy"
                  className="w-full h-full object-cover" width="736" height="736" />
              </div>
            </div>
            <div className="lg:col-span-7 order-1 lg:order-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-moon dark:text-decant">• Tentang JanjiCare</span>
              <p className="mt-6 font-serif text-3xl sm:text-4xl leading-snug text-ink dark:text-white">
                JanjiCare dibuat agar setiap kunjungan terasa terencana — dari memilih dokter sampai dipanggil ke ruang periksa.
              </p>
              <p className="mt-6 text-lg leading-relaxed text-gray-600 dark:text-slate-400 max-w-2xl">
                Pasien, dokter, dan petugas klinik melihat jadwal dan antrean yang sama. Pasien tahu kapan harus datang,
                dokter tahu siapa pasien berikutnya, dan petugas tidak perlu mencatat antrean secara manual.
              </p>
              <Link to={primaryTo} className="mt-9 inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold border border-gray-300 dark:border-slate-700 text-ink dark:text-white hover:border-ink dark:hover:border-heather transition-colors">
                Mulai sekarang <ArrowIcon />
              </Link>
            </div>
          </div>
        </section>

        {/* Layanan */}
        <section id="layanan" className="max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-28">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-block px-3 py-1 rounded-full border border-decant text-[11px] font-semibold uppercase tracking-[0.18em] text-moon dark:text-decant">Layanan</span>
            <h2 className="mt-5 text-4xl sm:text-5xl font-medium text-ink dark:text-white">Semua dalam satu alur</h2>
          </div>
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {SERVICES.map((s) => (
              <article key={s.title} className="flex flex-col bg-heather/40 dark:bg-slate-900 rounded-[1.5rem] p-8 border border-heather dark:border-slate-800">
                <span className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 text-plum dark:text-heather flex items-center justify-center">
                  <Icon d={s.icon} />
                </span>
                <h3 className="mt-8 text-2xl font-medium text-ink dark:text-white">{s.title}</h3>
                <p className="mt-3 leading-relaxed text-gray-600 dark:text-slate-400 flex-1">{s.text}</p>
                <Link to={s.to} className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-ink dark:text-white hover:text-plum">
                  {s.action} <ArrowIcon />
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* Cara kerja */}
        <section id="cara-kerja" className="bg-ink text-gray-300">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-28 grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-decant">• Cara kerja</span>
              <h2 className="mt-5 text-4xl sm:text-5xl font-medium text-white leading-tight">Empat langkah sampai diperiksa.</h2>
              <Link to={primaryTo} className="mt-10 inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold bg-heather text-ink hover:bg-white transition-colors">
                {loggedIn ? "Buka Dasbor" : "Daftar sebagai pasien"} <ArrowIcon />
              </Link>
            </div>
            <ol className="lg:col-span-8 grid sm:grid-cols-2 gap-x-10">
              {STEPS.map((s) => (
                <li key={s.no} className="border-t border-white/15 py-8">
                  <span className="font-serif text-decant text-xl">{s.no}</span>
                  <h3 className="mt-3 text-2xl font-medium text-white">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-gray-400">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Ajakan */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-28">
          <div className="rounded-[2rem] bg-heather dark:bg-mauve-800 px-8 py-14 sm:px-14 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <h2 className="text-3xl sm:text-4xl font-medium text-ink dark:text-white max-w-xl leading-snug">
              Siap membuat janji temu pertama Anda?
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link to={primaryTo} className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold bg-ink text-cream hover:bg-plum transition-colors">
                {loggedIn ? "Buka Dasbor" : "Daftar gratis"} <ArrowIcon />
              </Link>
              {!loggedIn && (
                <Link to="/login" className="inline-flex items-center px-7 py-3.5 rounded-full font-semibold border border-ink/30 text-ink dark:text-white dark:border-white/30 hover:border-ink">
                  Saya sudah punya akun
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 grid sm:grid-cols-4 gap-8 text-sm">
          <div className="sm:col-span-2">
            <Brand size={30} textClass="text-xl" />
            <p className="mt-4 text-gray-500 max-w-sm leading-relaxed">Sistem janji temu dan antrean klinik.</p>
          </div>
          <div>
            <p className="font-semibold text-ink dark:text-white mb-3">Akun</p>
            <ul className="space-y-2 text-gray-500">
              <li><Link to="/login" className="hover:text-ink dark:hover:text-white">Masuk</Link></li>
              <li><Link to="/register" className="hover:text-ink dark:hover:text-white">Daftar pasien</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-ink dark:text-white mb-3">Klinik</p>
            <ul className="space-y-2 text-gray-500">
              <li><Link to="/queue/tv" className="hover:text-ink dark:hover:text-white">Layar antrean</Link></li>
              <li><a href="mailto:support@janjicare.com" className="hover:text-ink dark:hover:text-white">support@janjicare.com</a></li>
            </ul>
          </div>
        </div>
        <p className="border-t border-gray-200 dark:border-slate-800 py-5 text-center text-xs text-gray-400">© {new Date().getFullYear()} JanjiCare</p>
      </footer>
    </div>
  );
}
