/**
 * DB Executor Agent
 * Inputs: SQL + parameters
 * Output: result set (rows) or error
 */
import { executeQuery } from "../lib/db.js";

/**
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<{ rows: any[], rowCount: number } | { error: string }>}
 */
export async function runQuery(sql, params = []) {
  try {
    const result = await executeQuery(sql, params);
    return { rows: result.rows, rowCount: result.rowCount };
  } catch (err) {
    return { error: err.message || String(err) };
  }
}
