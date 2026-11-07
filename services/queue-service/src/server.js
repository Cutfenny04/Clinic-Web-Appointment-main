import "dotenv/config";
import app from "./app.js";
import { config } from "./config/index.js";
import { closePool } from "./db/pool.js";

if (!config.databaseUrl) console.warn("⚠️  DATABASE_URL belum diset — endpoint antrean akan mengembalikan 503.");
if (!config.internalToken) console.warn("⚠️  QUEUE_INTERNAL_TOKEN belum diset — endpoint antrean akan mengembalikan 503.");
if (config.nodeEnv === "production" && (!config.databaseUrl || !config.internalToken)) {
  console.error("DATABASE_URL dan QUEUE_INTERNAL_TOKEN wajib di production.");
  process.exit(1);
}

const PORT = process.env.PORT || 3002;

const server = app.listen(PORT, () => {
  console.log("─────────────────────────────────────────");
  console.log("  🎫 JanjiCare Queue Microservice");
  console.log("─────────────────────────────────────────");
  console.log(`  URL      : http://localhost:${PORT}`);
  console.log(`  Health   : http://localhost:${PORT}/api/v1/queue/health`);
  console.log(`  Env      : ${process.env.NODE_ENV || "development"}`);
  console.log("─────────────────────────────────────────");
});

process.on("SIGTERM", () => {
  server.close(() => closePool().finally(() => process.exit(0)));
});

process.on("SIGINT", () => {
  server.close(() => closePool().finally(() => process.exit(0)));
});
