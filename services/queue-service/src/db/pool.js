import pg from "pg";
import { config } from "../config/index.js";

let pool = null;

/** Pool dibuat saat pertama dipakai agar health check & tes tanpa DB tetap jalan. */
export function getPool() {
  if (!config.databaseUrl) {
    const err = new Error("DATABASE_URL belum dikonfigurasi pada Queue Service.");
    err.statusCode = 503;
    throw err;
  }
  if (!pool) {
    pool = new pg.Pool({
      connectionString: config.databaseUrl,
      max: 10,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
    });
    pool.on("error", (e) => console.error("[Queue DB] koneksi idle error:", e.message));
  }
  return pool;
}

/** Jalankan fn di dalam transaksi; actorId dicatat ke riwayat status appointment. */
export async function withTransaction(fn, actorId = null) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    if (actorId) await client.query("SELECT set_config('app.actor_id', $1, true)", [actorId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
