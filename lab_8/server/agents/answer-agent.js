/**
 * Answer Agent
 * Inputs: question + rows + (optional) SQL
 * Output: natural-language answer, with optional citations to query/results
 */
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

function createModel() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openRouterKey) {
    return new ChatOpenAI({
      model: "openai/gpt-4o-mini",
      temperature: 0.2,
      configuration: { baseURL: "https://openrouter.ai/api/v1", apiKey: openRouterKey },
    });
  }
  if (openaiKey) {
    return new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.2 });
  }
  throw new Error("Set OPENAI_API_KEY or OPENROUTER_API_KEY in .env");
}

/**
 * @param {string} question
 * @param {object} execution - { rows, rowCount } or { error }
 * @param {string} [sql]
 * @returns {Promise<string>}
 */
export async function answer(question, execution, sql) {
  const model = createModel();
  const hasError = "error" in execution;
  const dataSummary = hasError
    ? `Query failed: ${execution.error}`
    : `Query returned ${execution.rowCount} row(s). Sample:\n${JSON.stringify((execution.rows || []).slice(0, 15), null, 2)}`;

  const systemContent =
    "You are a helpful data assistant. Answer the user's question in natural language based on the query results. Be concise. If they asked for counts or lists, summarize clearly. If there was an error, explain it in plain language and suggest what might be wrong (e.g. column name).";
  const userContent = `User question: ${question}\n\n${dataSummary}${sql ? `\n\nSQL used:\n${sql}` : ""}`;

  const messages = [
    new SystemMessage({ content: systemContent }),
    new HumanMessage({ content: userContent }),
  ];
  const response = await model.invoke(messages);
  return typeof response.content === "string"
    ? response.content
    : response.content?.map((c) => (c.type === "text" ? c.text : "")).join("") || "";
}
