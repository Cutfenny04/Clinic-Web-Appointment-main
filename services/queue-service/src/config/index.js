import "dotenv/config";

export const config = {
  port: process.env.PORT || 3002,
  nodeEnv: process.env.NODE_ENV || "development",
  // Koneksi PostgreSQL (Supabase sekarang, Amazon RDS nanti) — HANYA di server
  databaseUrl: process.env.DATABASE_URL || "",
  databaseSsl: (process.env.DATABASE_SSL || "true").toLowerCase() !== "false",
  // Token rahasia untuk komunikasi backend utama → queue service
  internalToken: process.env.QUEUE_INTERNAL_TOKEN || "",
  timezone: "Asia/Jakarta",
};

/** Tanggal hari ini menurut Asia/Jakarta, format YYYY-MM-DD */
export function todayJakarta(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: config.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
