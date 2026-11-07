import { useMemo, useState } from "react";
import { addDays, todayJakarta } from "@/utils/format";
import { cx } from "@/components/ui";

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/**
 * Kalender bulanan sederhana (Senin pertama, zona Asia/Jakarta).
 * available: Set tanggal YYYY-MM-DD yang punya jadwal; tanggal lain & masa lalu tidak bisa dipilih.
 */
export default function MiniCalendar({ value, onChange, available = new Set(), maxDays = 60 }) {
  const today = todayJakarta();
  const [cursor, setCursor] = useState(() => (value || today).slice(0, 7));
  const last = addDays(today, maxDays);

  const cells = useMemo(() => {
    const first = `${cursor}-01`;
    const dow = (new Date(first + "T00:00:00Z").getUTCDay() + 6) % 7; // 0 = Senin
    const out = [];
    for (let i = 0; i < 42; i++) out.push(addDays(first, i - dow));
    return out;
  }, [cursor]);

  const [y, m] = cursor.split("-").map(Number);
  const shift = (n) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setCursor(d.toISOString().slice(0, 7));
  };
  const canPrev = cursor > today.slice(0, 7);
  const canNext = cursor < last.slice(0, 7);

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Bulan sebelumnya"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30">‹</button>
        <p className="font-bold text-gray-900 dark:text-white">{MONTHS[m - 1]} {y}</p>
        <button type="button" onClick={() => shift(1)} disabled={!canNext} aria-label="Bulan berikutnya"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-gray-400 mb-1">
        {DAYS.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const inMonth = d.slice(0, 7) === cursor;
          const selectable = d >= today && d <= last && available.has(d);
          const selected = value === d;
          return (
            <button
              key={d} type="button" disabled={!selectable} onClick={() => onChange(d)}
              aria-label={d} aria-pressed={selected}
              className={cx(
                "h-10 rounded-lg text-sm font-semibold relative transition-all",
                !inMonth && "opacity-30",
                selected ? "bg-gradient-to-br from-blue-600 to-teal-500 text-white shadow"
                  : selectable ? "bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-200 hover:bg-teal-100"
                    : "text-gray-300 dark:text-slate-600 cursor-not-allowed",
                d === today && !selected && "ring-1 ring-blue-400"
              )}
            >
              {Number(d.slice(8))}
              {selectable && !selected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-500" />}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Tanggal bertanda hijau memiliki jadwal praktik yang tersedia.</p>
    </div>
  );
}
