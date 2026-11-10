import express from 'express';
import authRoutes from './routes/auth.routes.js';
import messageRoutes from './routes/message.routes.js';
import { closeDb, connectDb, pool } from './lib/db.js';
import cookieParser from 'cookie-parser';
import cors from "cors";
import { app, server } from './lib/socket.js';
import path from "path";
import { fileURLToPath } from 'url';
import { appConfig, assertCoreConfig } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || appConfig.allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed"));
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (!origin || appConfig.allowedOrigins.includes(origin)) return next();
  return res.status(403).json({ message: "Origin is not allowed" });
});

app.get("/api/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.get("/api/ready", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.status(200).json({ database: "ok", status: "ready" });
  } catch {
    return res.status(503).json({ database: "unavailable", status: "not ready" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api", (_req, res) => res.status(404).json({ message: "API route not found" }));

if (appConfig.isProduction) {
  app.use(express.static(path.join(__dirname, "../../frontend/dist")));
  app.use((req, res, next) => {
    if (req.method !== "GET" || !req.accepts("html")) return next();
    return res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
  });
}

app.use((error, _req, res, _next) => {
  console.error(error.message);
  const status = error.statusCode || 500;
  return res.status(status).json({ message: status === 500 ? "Something went wrong" : error.message });
});

export const startServer = async (port = appConfig.port) => {
  assertCoreConfig();
  await connectDb();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      server.off("error", reject);
      console.log(`Server is running on port ${server.address().port}`);
      resolve(server);
    });
  });
};

export const stopServer = async () => {
  if (server.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await closeDb();
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer().catch((error) => {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  });

  const shutdown = async () => {
    await stopServer();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
