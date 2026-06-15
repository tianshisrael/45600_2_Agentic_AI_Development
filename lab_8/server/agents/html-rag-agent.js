/**
 * HTML RAG Agent: answer simple questions using retrieved HTML content.
 * Input: user question
 * Output: natural-language answer based on retrieved chunks
 */
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { getHtmlRetriever } from "../lib/html-vector-store.js";

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
 * Answer a simple question using HTML RAG context.
 * @param {string} question
 * @param {number} [k] - number of chunks to retrieve
 * @returns {Promise<string>}
 */
export async function answerWithHtmlRag(question, k = 6) {
  const retriever = await getHtmlRetriever(k);
  const docs = await retriever.invoke(question);
  const context = docs.map((d) => d.pageContent).join("\n\n---\n\n") || "No relevant content found.";

  const model = createModel();
  const systemContent = `You are a helpful assistant. Answer the user's question in natural language using ONLY the following context from documentation or web content. Be concise. If the context does not contain the answer, say so. Do not make up information.`;
  const userContent = `Context:\n${context}\n\nQuestion: ${question}`;

  const messages = [
    new SystemMessage({ content: systemContent }),
    new HumanMessage({ content: userContent }),
  ];
  const response = await model.invoke(messages);
  return typeof response.content === "string"
    ? response.content
    : response.content?.map((c) => (c.type === "text" ? c.text : "")).join("") || "";
}
