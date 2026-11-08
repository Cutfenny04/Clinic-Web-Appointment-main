/** Tanggal hari ini (YYYY-MM-DD) menurut Asia/Jakarta */
export function todayJakarta(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

/** Jam sekarang (HH:MM) menurut Asia/Jakarta */
export function nowTimeJakarta(now = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(now);
}

/** Tambah n hari ke tanggal YYYY-MM-DD */
export function addDaysYmd(ymd, n) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
