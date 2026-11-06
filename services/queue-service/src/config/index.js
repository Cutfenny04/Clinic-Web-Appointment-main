import "dotenv/config";

export const config = {
  port: process.env.PORT || 3002,
  nodeEnv: process.env.NODE_ENV || "development",
  mainBackendUrl: process.env.MAIN_BACKEND_URL || "http://localhost:3000",
};
