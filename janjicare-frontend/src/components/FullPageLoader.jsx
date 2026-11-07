export default function FullPageLoader({ label = "Memuat JanjiCare..." }) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
      </div>
    </div>
  );
}
