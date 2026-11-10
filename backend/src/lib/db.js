import pg from "pg";
import { appConfig } from "../config.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: appConfig.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (error) => {
  console.error("Unexpected Postgres pool error:", error.message);
});

export const connectDb = async () => {
  await pool.query("SELECT 1");
  console.log("Connected to Neon Postgres");
};

export const closeDb = () => pool.end();
