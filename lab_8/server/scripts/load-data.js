/**
 * Load data.sql into the database.
 * Run: npm run load-data  (from server folder)
 * Requires: DB running (docker compose up), schema already applied (schema.sql).
 */
import "dotenv/config";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "..", "..", "data.sql");

const pool = new pg.Pool({
  host: process.env.PG_HOST || "127.0.0.1",
  port: Number(process.env.PG_PORT || "5433"),
  user: process.env.PG_USER || "sso_user",
  password: process.env.PG_PASSWORD || "sso_pass",
  database: process.env.PG_DATABASE || "sso_db",
});

async function main() {
  if (!fs.existsSync(dataPath)) {
    throw new Error("data.sql not found at " + dataPath);
  }
  const sql = fs.readFileSync(dataPath, "utf-8");
  console.log("Loading data from data.sql...");
  await pool.query(sql);
  console.log("Data loaded successfully.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
