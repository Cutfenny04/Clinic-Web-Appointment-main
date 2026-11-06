import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import queueRoutes from "./routes/queue.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use("/api/v1/queue", queueRoutes);

// Root health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "janjicare-queue-service",
    port: 3002,
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint tidak ditemukan pada Queue Service: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorHandler);

export default app;
