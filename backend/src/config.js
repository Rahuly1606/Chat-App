import { config as loadEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(currentDirectory, "../..");

loadEnv({
  path: [
    path.join(rootDirectory, ".env.local"),
    path.join(rootDirectory, ".env"),
    path.join(rootDirectory, "backend/.env"),
  ],
});

const localOrigins = ["http://localhost:5173", "http://localhost:5174"];
const deploymentOrigins = ["https://chat-app-rho-vert-i30k6wcp7s.vercel.app"];
const configuredOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const isProduction = process.env.NODE_ENV === "production";
const developmentJwtSecret = randomBytes(32).toString("hex");

export const appConfig = {
  allowedOrigins: [...new Set([...localOrigins, ...deploymentOrigins, ...configuredOrigins])],
  cloudinary: {
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  },
  databaseUrl: process.env.DATABASE_URL,
  databaseUrlUnpooled: process.env.DATABASE_URL_UNPOOLED,
  isProduction,
  jwtAudience: "chat-app",
  jwtIssuer: "chat-app-api",
  jwtSecret: process.env.JWT_SECRET || (isProduction ? undefined : developmentJwtSecret),
  port: Number(process.env.PORT) || 5001,
  rootDirectory,
};

export const assertCoreConfig = () => {
  const missing = [];
  if (!appConfig.databaseUrl) missing.push("DATABASE_URL");
  if (!appConfig.jwtSecret) missing.push("JWT_SECRET");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};
