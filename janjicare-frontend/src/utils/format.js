/**
 * Utility Formatting Bahasa Indonesia untuk JanjiCare
 * Standar: Locale id-ID, Timezone Asia/Jakarta, Rupiah (IDR)
 */

export const STATUS_LABELS = {
  pending: "Menunggu Konfirmasi",
  confirmed: "Dikonfirmasi",
  checked_in: "Sudah Daftar Ulang",
  in_progress: "Sedang Diperiksa",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  waiting: "Menunggu",
  calling: "Sedang Dipanggil",
  serving: "Sedang Dilayani",
  done: "Selesai Dilayani",
  skipped: "Dilewati",
  active: "Aktif",
  inactive: "Tidak Aktif",
  male: "Laki-laki",
  female: "Perempuan",
  admin: "Admin",
  doctor: "Dokter",
  patient: "Pasien",
};

/**
 * Format status/enum internal ke label Bahasa Indonesia
 */
export function formatStatus(status) {
  if (!status) return "";
  const lower = String(status).toLowerCase();
  return STATUS_LABELS[lower] || status;
}

/**
 * Format tanggal Indonesia lengkap (Contoh: "6 November 2026")
 */
export function formatDate(dateInput, opts = {}) {
  if (!dateInput) return "";
  try {
    // Tanggal tanpa jam (YYYY-MM-DD) adalah tanggal kalender: jangan digeser zona waktu
    const dateOnly = typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput);
    const d = dateOnly ? new Date(dateInput + "T00:00:00Z") : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      ...opts,
      timeZone: dateOnly ? "UTC" : "Asia/Jakarta",
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

/**
 * Format tanggal Indonesia singkat DD/MM/YYYY (Contoh: "06/11/2026")
 */
export function formatDateShort(dateInput) {
  if (!dateInput) return "";
  try {
    if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, dd] = dateInput.split("-");
      return `${dd}/${m}/${y}`;
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jakarta" }).format(d);
  } catch {
    return String(dateInput);
  }
}

/**
 * Format jam Indonesia HH.mm WIB (Contoh: "19.30 WIB" atau "08.00 WIB")
 */
export function formatTime(timeInput) {
  if (!timeInput) return "";
  if (typeof timeInput === "string" && /^\d{1,2}:\d{2}/.test(timeInput)) {
    const parts = timeInput.split(":");
    const h = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    return `${h}.${m} WIB`;
  }
  try {
    const d = new Date(timeInput);
    if (isNaN(d.getTime())) return String(timeInput);
    const timeStr = new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).format(d);
    return `${timeStr.replace(":", ".")} WIB`;
  } catch {
    return String(timeInput);
  }
}

/**
 * Format jam 12 jam jika masih dibutuhkan (kompatibilitas) tapi tetap format WIB
 */
export function formatTime12Hour(timeString) {
  return formatTime(timeString);
}

/**
 * Format mata uang Rupiah (Contoh: "Rp150.000")
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return "Rp0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

/** "08:00:00" → "08.00" (tanpa akhiran WIB) */
export function formatClock(t) {
  if (!t) return "";
  const [h, m] = String(t).split(":");
  return `${h.padStart(2, "0")}.${(m || "00").padStart(2, "0")}`;
}

/** Rentang jam praktik: "08.00–12.00 WIB" */
export function formatTimeRange(start, end) {
  if (!start) return "";
  return `${formatClock(start)}–${formatClock(end)} WIB`;
}

/** Tanggal + jam dari timestamp ISO, zona Asia/Jakarta: "8 Nov 2026, 09.15 WIB" */
export function formatDateTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  const s = new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta",
  }).format(d);
  return `${s.replace(/(\d{2})[.:](\d{2})$/, "$1.$2")} WIB`;
}

/** Hari dalam seminggu: "Senin, 9 November 2026" */
export function formatDateLong(dateInput) {
  return formatDate(dateInput, { weekday: "long" });
}

/** Tanggal hari ini (YYYY-MM-DD) menurut Asia/Jakarta */
export function todayJakarta(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Menambah n hari pada tanggal YYYY-MM-DD */
export function addDays(ymd, n) {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Inisial nama: "Budi Santoso" → "BS" */
export function initials(name = "") {
  return String(name).replace(/^(dr\.?|drg\.?)\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}
