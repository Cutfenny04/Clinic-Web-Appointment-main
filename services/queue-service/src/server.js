import "dotenv/config";
import app from "./app.js";

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
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});
