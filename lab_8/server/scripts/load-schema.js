/**
 * Load schema.sql into the database (creates tables, indexes, vector extension).
 * Run: npm run load-schema  (from server folder)
 * Requires: DB running (docker compose up).
 */
import "dotenv/config";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "..", "..", "schema.sql");

const pool = new pg.Pool({
  host: process.env.PG_HOST || "127.0.0.1",
  port: Number(process.env.PG_PORT || "5433"),
  user: process.env.PG_USER || "sso_user",
  password: process.env.PG_PASSWORD || "sso_pass",
  database: process.env.PG_DATABASE || "sso_db",
});

async function main() {
  if (!fs.existsSync(schemaPath)) {
    throw new Error("schema.sql not found at " + schemaPath);
  }
  const sql = fs.readFileSync(schemaPath, "utf-8");
  console.log("Loading schema from schema.sql...");
  await pool.query(sql);
  console.log("Schema loaded successfully.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
