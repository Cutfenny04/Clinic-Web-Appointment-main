import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, (err) => {
  // Express 5 meneruskan error listen (mis. port sudah dipakai) ke callback ini
  if (err) {
    if (err.code === "EADDRINUSE") {
      console.error(`\n✖ Port ${PORT} sudah dipakai proses lain (kemungkinan JanjiCare API lama masih berjalan).`);
      console.error(`  Tutup terminal lama, atau jalankan di PowerShell:`);
      console.error(`  Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force\n`);
    } else {
      console.error("✖ Server gagal dijalankan:", err.message);
    }
    process.exit(1);
  }
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
