/** Tanggal hari ini (YYYY-MM-DD) menurut Asia/Jakarta */
export function todayJakarta(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}
