/**
 * OAuth Q&A agent — uses pre-built RAG retriever (ingestion is NOT repeated per question).
 *
 * Usage:
 *   node agent/agent.js "What is the authorization code flow?"
 *   node agent/agent.js
 */

import readline from "readline";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";
import { getOAuthRetriever, retrieveOAuthContext } from "../scripts/rag-process.js";

const SYSTEM_PROMPT = `You are an OAuth 2.0 documentation assistant.
Answer the user's question using ONLY the provided excerpts from "The Modern Guide to OAuth".
If the answer is not in the excerpts, say you cannot find it in the guide and suggest what topic to look for.
Be clear, concise, and use correct OAuth terminology (client, authorization server, resource server, scopes, tokens).`;

function createChatModel() {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  if (openRouterKey) {
    return new ChatOpenAI({
      model: "openai/gpt-4o-mini",
      temperature: 0.1,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openRouterKey,
      },
    });
  }

  if (openaiKey) {
    return new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.1,
    });
  }

  throw new Error("Set OPENROUTER_API_KEY or OPENAI_API_KEY in lab_8_OAuth/.env");
}

/**
 * Build agent: RAG ingestion once, then answer() only retrieves + generates.
 */
export async function createOAuthAgent(pdfPath) {
  console.log("Loading OAuth RAG into memory (one-time indexing)...");
  const retriever = await getOAuthRetriever(pdfPath);
  const model = createChatModel();
  console.log("OAuth agent ready.\n");

  async function answer(question, k = 4) {
    const docs = await retrieveOAuthContext(retriever, question, k);
    const context = docs.map((d) => d.pageContent).join("\n\n---\n\n");

    const messages = [
      new SystemMessage({
        content: `${SYSTEM_PROMPT}\n\nGuide excerpts:\n\n${context}`,
      }),
      new HumanMessage({ content: question }),
    ];

    const response = await model.invoke(messages);
    return typeof response.content === "string"
      ? response.content
      : response.content.map((part) => (part.type === "text" ? part.text : "")).join("");
  }

  return { answer, retriever };
}

async function main() {
  const questionArg = process.argv.slice(2).join(" ").trim();
  const agent = await createOAuthAgent();

  if (questionArg) {
    const answer = await agent.answer(questionArg);
    console.log("--- Answer ---\n");
    console.log(answer);
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = () => {
    rl.question("OAuth question (Ctrl+C to exit): ", async (line) => {
      const q = line?.trim();
      if (!q) {
        ask();
        return;
      }
      try {
        const answer = await agent.answer(q);
        console.log("\n--- Answer ---\n");
        console.log(answer);
        console.log("");
      } catch (err) {
        console.error("Error:", err.message);
      }
      ask();
    });
  };

  console.log('Examples: "What is PKCE?" / "Explain refresh tokens"');
  ask();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
