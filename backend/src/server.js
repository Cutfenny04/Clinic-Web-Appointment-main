import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log("─────────────────────────────────────────");
  console.log("  🏥 JanjiCare API");
  console.log("─────────────────────────────────────────");
  console.log(`  URL      : http://localhost:${PORT}`);
  console.log(`  Health   : http://localhost:${PORT}/api/health`);
  console.log(`  API v1   : http://localhost:${PORT}/api/v1`);
  console.log(`  Env      : ${process.env.NODE_ENV || "development"}`);
  console.log("─────────────────────────────────────────");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM diterima. Menutup server...");
  server.close(() => {
    console.log("Server berhasil ditutup.");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\nSIGINT diterima. Menutup server...");
  server.close(() => {
    console.log("Server berhasil ditutup.");
    process.exit(0);
  });
});
