import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { appConfig } from "../config.js";

const { Client } = pg;
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.resolve(currentDirectory, "../../migrations");

export const runMigrations = async () => {
  const connectionString = appConfig.databaseUrlUnpooled || appConfig.databaseUrl;
  if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required");

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const files = (await fs.readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();

    for (const file of files) {
      const existing = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [file]);
      if (existing.rowCount > 0) continue;

      const sql = await fs.readFile(path.join(migrationsDirectory, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`Applied migration ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations().catch((error) => {
    console.error("Migration failed:", error.message);
    process.exit(1);
  });
}
