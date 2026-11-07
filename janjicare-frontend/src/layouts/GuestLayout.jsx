import { Link } from "react-router-dom";
import Brand from "@/components/Brand";
import { useState, useEffect } from "react";

export default function GuestLayout({ children, title, description }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return JSON.parse(localStorage.getItem("darkMode") || "false");
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    document.documentElement.classList.remove("lenis", "lenis-smooth", "lenis-scrolling", "lenis-stopped");
  }, [isDarkMode]);

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-heather/40 dark:bg-slate-950 font-sans">
      {/* Latar polos dengan garis halus — tanpa efek blur/animasi */}
      <div className="absolute inset-x-0 top-0 h-1 bg-plum dark:bg-heather pointer-events-none" />
      <div className="relative z-10 w-full max-w-lg px-4 sm:px-6 py-12 flex flex-col items-center">
        {/* Dark Mode Toggle */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-md bg-white dark:bg-slate-900 text-gray-600 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-800 transition-all focus:outline-none"
            aria-label="Ganti Mode Gelap"
            title={isDarkMode ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
          >
            {isDarkMode ? (
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>

        {/* Logo & Header */}
        <div className="text-center mb-8 flex flex-col items-center w-full">
          <Link to="/" className="mb-8" aria-label="JanjiCare — beranda">
            <Brand size={40} textClass="text-3xl" />
          </Link>
          {title && <h1 className="text-3xl sm:text-4xl font-semibold text-ink dark:text-white">{title}</h1>}
          {description && <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400 mt-3 max-w-sm">{description}</p>}
        </div>

        {/* Premium Glassmorphic Card */}
        <div className="w-full bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6 sm:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
