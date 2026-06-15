/**
 * SQL Generator Agent
 * Inputs: question + retrieved schema context
 * Output: SQL query only (and optionally parameters)
 */
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

function createModel() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openRouterKey) {
    return new ChatOpenAI({
      model: "openai/gpt-4o-mini",
      temperature: 0,
      configuration: { baseURL: "https://openrouter.ai/api/v1", apiKey: openRouterKey },
    });
  }
  if (openaiKey) {
    return new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
  }
  throw new Error("Set OPENAI_API_KEY or OPENROUTER_API_KEY in .env");
}

const SYSTEM_PROMPT = `You are a PostgreSQL expert. Given a user question and the relevant database schema, output ONLY a valid PostgreSQL SELECT query. No explanation, no markdown, no code block wrapper.
Rules:
- Use only the tables/columns mentioned in the schema context.
- Prefer JOINs over subqueries when listing related data.
- Use table aliases if helpful (e.g. u for users, p for permissions).
- Return only one SQL statement.
- Do not use INSERT, UPDATE, DELETE, or DDL. Only SELECT.`;

/**
 * @param {string} question
 * @param {string} schemaContext
 * @returns {Promise<{ sql: string, parameters?: any[] }>}
 */
export async function generateSQL(question, schemaContext) {
  const model = createModel();
  const messages = [
    new SystemMessage({
      content: SYSTEM_PROMPT + "\n\nSchema context:\n" + schemaContext,
    }),
    new HumanMessage({ content: question }),
  ];
  const response = await model.invoke(messages);
  let sql = typeof response.content === "string" ? response.content : response.content?.map((c) => (c.type === "text" ? c.text : "")).join("") || "";
  sql = sql.replace(/^```\w*\n?/i, "").replace(/\n?```$/i, "").trim();
  return { sql, parameters: [] };
}
