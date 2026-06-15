/**
 * SQL Agent pipeline: create query from context and run it.
 * 1. Schema Retriever (RAG) -> schema context
 * 2. SQL Generator -> SQL
 * 3. DB Executor -> rows or error
 * 4. Answer Agent -> natural language
 */
import { retrieveSchemaContext } from "./schema-retriever.js";
import { generateSQL } from "./sql-generator.js";
import { runQuery } from "./db-executor.js";
import { answer } from "./answer-agent.js";

/**
 * Run the full SQL agent: retrieve schema, generate SQL, execute, answer.
 * @param {string} question
 * @returns {Promise<{ answer: string, sql: string | null, rows: any[] | null, rowCount: number | null, error: string | null }>}
 */
export async function runSqlAgent(question) {
  const { schemaContext } = await retrieveSchemaContext(question);
  const { sql } = await generateSQL(question, schemaContext);

  if (!sql) {
    return {
      answer: "I couldn't generate a SQL query for that question.",
      sql: null,
      rows: null,
      rowCount: null,
      error: null,
    };
  }

  const execution = await runQuery(sql, []);
  const naturalAnswer = await answer(question, execution, sql);

  return {
    answer: naturalAnswer,
    sql,
    rows: "rows" in execution ? execution.rows : null,
    rowCount: "rowCount" in execution ? execution.rowCount : null,
    error: "error" in execution ? execution.error : null,
  };
}
