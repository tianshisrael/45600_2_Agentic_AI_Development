/**
 * PostgreSQL client for sso_db (application tables + read-only query execution).
 */
import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  host: process.env.PG_HOST || "127.0.0.1",
  port: Number(process.env.PG_PORT || "5433"),
  user: process.env.PG_USER || "sso_user",
  password: process.env.PG_PASSWORD || "sso_pass",
  database: process.env.PG_DATABASE || "sso_db",
  max: 10,
});

/**
 * Execute a read-only query (SELECT). Rejects INSERT/UPDATE/DELETE for safety.
 */
export async function executeQuery(sql, params = []) {
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith("SELECT")) {
    throw new Error("Only SELECT queries are allowed");
  }
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return { rows: result.rows, rowCount: result.rowCount };
  } finally {
    client.release();
  }
}

export { pool };
