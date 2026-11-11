import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

// Middleware
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Routes
import authRoutes from "./modules/auth/auth.routes.js";
import doctorsRoutes from "./modules/doctors/doctors.routes.js";
import schedulesRoutes from "./modules/schedules/schedules.routes.js";
import appointmentsRoutes from "./modules/appointments/appointments.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import queueRoutes from "./modules/queue/queue.routes.js";

const app = express();

// ── Security headers ──────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────
app.use(
  cors({
    // Bisa lebih dari satu origin, pisahkan dengan koma (mis. domain CloudFront/S3 saat di AWS)
    origin: (process.env.FRONTEND_URL || "http://localhost:5173").split(",").map((o) => o.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Body parser ───────────────────────────────────────────────────
// Jumlah proxy di depan backend: 1 = Nginx saja; 2 = CloudFront → Nginx (deploy AWS)
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Request logging (hanya di non-production) ─────────────────────
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ── Global rate limiter ───────────────────────────────────────────
// 100 request per 15 menit per IP untuk seluruh API
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 600),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak permintaan. Coba lagi dalam beberapa menit.",
  },
});

// Rate limiter ketat untuk auth endpoints (cegah brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak percobaan autentikasi. Coba lagi dalam 15 menit.",
  },
});

app.use("/api/", globalLimiter);

// ── Halaman akar: info singkat (bukan 404) ──────────────────────
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "JanjiCare API berjalan. Ini adalah server API, bukan tampilan website.",
    website: process.env.FRONTEND_URL?.split(",")[0] || "http://localhost:5173",
    health: "/api/health",
    api: "/api/v1",
  });
});

// ── Health check ──────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "JanjiCare API berjalan!",
    service: "janjicare-api",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ── API v1 Routes ─────────────────────────────────────────────────
const API_PREFIX = "/api/v1";

// Limiter ketat hanya untuk login & registrasi (bukan /auth/me yang dipanggil tiap halaman dimuat)
app.use([`${API_PREFIX}/auth/login`, `${API_PREFIX}/auth/register`], authLimiter);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/doctors`, doctorsRoutes);
app.use(`${API_PREFIX}/schedules`, schedulesRoutes);
app.use(`${API_PREFIX}/appointments`, appointmentsRoutes);
app.use(`${API_PREFIX}/users`, usersRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/queue`, queueRoutes);

// ── 404 & Error handler (harus paling akhir) ──────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
