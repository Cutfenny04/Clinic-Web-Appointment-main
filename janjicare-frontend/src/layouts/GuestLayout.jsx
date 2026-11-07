import { Link } from "react-router-dom";
import Brand from "@/components/Brand";
import { useState, useEffect } from "react";

/**
 * Tata letak halaman tamu (masuk, daftar, lupa kata sandi):
 * form di kiri, foto klinik di kanan (layar lebar). Di ponsel hanya form.
 */
export default function GuestLayout({ children, title, description, image = "/image/hospital.jpg" }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem("darkMode") || "false"); } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("darkMode", JSON.stringify(isDarkMode)); } catch { /* abaikan */ }
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  return (
    <div className="min-h-screen bg-cream dark:bg-slate-950 font-sans lg:grid lg:grid-cols-2">
      {/* Kolom form */}
      <div className="flex flex-col min-h-screen px-5 sm:px-10 xl:px-20">
        <div className="flex items-center justify-between h-20">
          <Link to="/" aria-label="JanjiCare — beranda"><Brand size={32} textClass="text-2xl" /></Link>
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full text-gray-500 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label={isDarkMode ? "Gunakan mode terang" : "Gunakan mode gelap"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d={isDarkMode
                ? "M12 3v1m0 16v1m9-9h-1M4 12H3m15.4 6.4l-.7-.7M6.3 6.3l-.7-.7m12.8 0l-.7.7M6.3 17.7l-.7.7M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                : "M20.4 15.4A9 9 0 018.6 3.6 9 9 0 1020.4 15.4z"} />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex items-center py-10">
          <div className="w-full max-w-md mx-auto">
            {title && <h1 className="text-4xl sm:text-5xl font-medium leading-tight text-ink dark:text-white">{title}</h1>}
            {description && <p className="mt-3 text-gray-600 dark:text-slate-400">{description}</p>}
            <div className="mt-10">{children}</div>
          </div>
        </div>

        <p className="py-6 text-xs text-gray-400">© {new Date().getFullYear()} JanjiCare</p>
      </div>

      {/* Kolom foto (hanya layar lebar) */}
      <div className="hidden lg:block p-4">
        <div className="relative h-full min-h-[calc(100vh-2rem)] overflow-hidden rounded-[2rem] bg-plum">
          <img src={image} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-12">
            <p className="font-serif text-3xl xl:text-4xl leading-snug text-white max-w-md">
              Janji temu, check-in, dan antrean klinik dalam satu tempat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
