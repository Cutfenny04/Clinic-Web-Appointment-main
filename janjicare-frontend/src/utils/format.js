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
export function formatDate(dateInput) {
  if (!dateInput) return "";
  try {
    const d = typeof dateInput === "string" && !dateInput.includes("T") 
      ? new Date(dateInput + "T00:00:00")
      : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
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
    const d = typeof dateInput === "string" && !dateInput.includes("T")
      ? new Date(dateInput + "T00:00:00")
      : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Format jam Indonesia HH.mm WIB (Contoh: "19.30 WIB" atau "08.00 WIB")
 */
export function formatTime(timeInput) {
  if (!timeInput) return "";
  if (typeof timeInput === "string" && timeInput.includes(":")) {
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
