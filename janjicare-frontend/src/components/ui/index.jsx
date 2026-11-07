/**
 * Komponen UI bersama JanjiCare — memakai gaya visual yang sama dengan halaman lama
 * (rounded-2xl, border-gray-100, gradien teal→blue, mode gelap slate).
 */
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { formatStatus } from "@/utils/format";

export const cx = (...c) => c.filter(Boolean).join(" ");

export function PageHeader({ title, description, actions }) {
  useEffect(() => { document.title = `${title} - JanjiCare`; }, [title]);
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children, title, actions, padded = true }) {
  return (
    <section className={cx("bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-slate-800">
          {title && <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

const TONES = {
  blue: "bg-mauve-100 text-mauve-700 dark:bg-mauve-800 dark:text-mauve-200",
  teal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  violet: "bg-mauve-200 text-mauve-800 dark:bg-mauve-700 dark:text-mauve-100",
  slate: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300",
};

export function StatCard({ label, value, hint, tone = "blue", icon, loading }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-gray-200 dark:border-slate-800 flex items-center gap-4">
      <div className={cx("w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0", TONES[tone])}>
        {icon || (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
        {loading ? (
          <div className="mt-1 h-7 w-16 rounded bg-gray-100 dark:bg-slate-700 animate-pulse" />
        ) : (
          <p className="font-serif text-2xl font-semibold text-gray-900 dark:text-white">{value ?? "–"}</p>
        )}
        {hint && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{hint}</p>}
      </div>
    </div>
  );
}

const BADGE = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/40",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/40",
  checked_in: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800/40",
  in_progress: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800/40",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600",
  waiting: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/40",
  calling: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/40",
  serving: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800/40",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40",
  skipped: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/40",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40",
  inactive: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600",
};

export function StatusBadge({ status, label }) {
  return (
    <span className={cx("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border whitespace-nowrap", BADGE[status] || BADGE.inactive)}>
      {label || formatStatus(status)}
    </span>
  );
}

const BTN = {
  primary: "bg-plum text-white hover:bg-ink dark:bg-heather dark:text-ink dark:hover:bg-white",
  secondary: "bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800",
  danger: "bg-rose-700 text-white hover:bg-rose-800",
  success: "bg-emerald-700 text-white hover:bg-emerald-800",
  ghost: "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800",
};

export function Button({ variant = "primary", size = "md", className, loading, disabled, children, ...props }) {
  const sz = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm";
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cx("inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-mauve-400", sz, BTN[variant], className)}
      {...props}
    >
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function LoadingState({ label = "Memuat data...", rows = 3 }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3 py-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-slate-700/60 animate-pulse" />
      ))}
    </div>
  );
}

export function EmptyState({ title = "Belum ada data", description, action }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gray-50 dark:bg-slate-700/50 flex items-center justify-center text-gray-300 dark:text-slate-500">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="font-bold text-gray-700 dark:text-slate-200">{title}</p>
      {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div role="alert" className="text-center py-10 px-4">
      <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <p className="font-bold text-gray-700 dark:text-slate-200">Data gagal dimuat</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error?.message || "Terjadi kesalahan."}</p>
      {onRetry && <Button variant="secondary" className="mt-4" onClick={() => onRetry()}>Coba Lagi</Button>}
    </div>
  );
}

/** Pembungkus: tampilkan loading / error / kosong / isi */
export function AsyncBlock({ loading, error, onRetry, empty, emptyTitle, emptyDescription, emptyAction, children, rows }) {
  if (loading) return <LoadingState rows={rows} />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (empty) return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  return children;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Ya, Lanjutkan", cancelLabel = "Batal", variant = "danger", onConfirm, onClose, processing, children }) {
  return (
    <Modal show={open} onClose={processing ? () => {} : onClose} maxWidth="md">
      <div className="p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        {message && <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{message}</p>}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={processing}>{cancelLabel}</Button>
          <Button variant={variant} onClick={onConfirm} loading={processing}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}

export function FormModal({ open, title, onClose, onSubmit, processing, submitLabel = "Simpan", children, maxWidth = "lg", error }) {
  return (
    <Modal show={open} onClose={processing ? () => {} : onClose} maxWidth={maxWidth}>
      <form
        noValidate
        onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}
        className="p-6"
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
        {error && (
          <div role="alert" className="mb-4 text-sm font-medium text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300 p-3 rounded-xl border border-rose-100 dark:border-rose-800/40">
            {error}
          </div>
        )}
        <div className="space-y-4">{children}</div>
        <div className="mt-6 flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={processing}>Batal</Button>
          <Button type="submit" loading={processing}>{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}

const inputBase = "mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-mauve-500 focus:ring-mauve-500/20 placeholder-gray-400";

export function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div>
      {label && <label htmlFor={htmlFor} className="block text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

export const Input = (props) => <input {...props} className={cx(inputBase, props.className)} />;
export const Textarea = (props) => <textarea rows={3} {...props} className={cx(inputBase, props.className)} />;
export const Select = ({ children, ...props }) => <select {...props} className={cx(inputBase, props.className)}>{children}</select>;

export function SearchInput({ value, onChange, placeholder = "Cari..." }) {
  return (
    <div className="relative w-full sm:w-72">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className="pl-9 w-full rounded-md border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm dark:text-slate-100 focus:border-mauve-500 focus:ring-mauve-500/20"
      />
    </div>
  );
}

/** Tabel responsif: kolom {key, label, render?, className?} */
export function DataTable({ columns, rows, rowKey = "id", onRowClick }) {
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800">
            {columns.map((c) => <th key={c.key} scope="col" className={cx("px-5 py-3 whitespace-nowrap", c.className)}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {rows.map((r) => (
            <tr key={r[rowKey]} onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cx("hover:bg-mauve-50 dark:hover:bg-slate-800/60", onRowClick && "cursor-pointer")}>
              {columns.map((c) => (
                <td key={c.key} className={cx("px-5 py-3 align-middle text-gray-700 dark:text-slate-200", c.className)}>
                  {c.render ? c.render(r) : r[c.key] ?? "–"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="flex gap-6 border-b border-gray-200 dark:border-slate-800 overflow-x-auto">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} type="button" onClick={() => onChange(t.value)}
          className={cx("-mb-px py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors",
            value === t.value ? "border-plum text-ink dark:border-heather dark:text-white" : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-200")}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 text-xs font-normal text-gray-400">({t.count})</span>}
        </button>
      ))}
    </div>
  );
}

/** Jam sekarang (Asia/Jakarta) yang diperbarui tiap menit */
export function useNow(ms = 60000) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}
