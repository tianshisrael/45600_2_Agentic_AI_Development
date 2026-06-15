/**
 * Pricing Q&A agent: answers user questions about construction/renovation pricing
 * using the same RAG pipeline (data/pricing.txt). No image – text questions only.
 *
 * Use this agent separately from the construction-pricing (image) ecosystem:
 * build RAG once, then send questions to get pricing explanations and estimates.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { buildPricingRAG, getRelevantPricing } from "../lib/rag-pipeline.js";

const SYSTEM_PROMPT = `You are a construction pricing assistant. You have access to a pricing reference document (constructor pricing per unit or per job).

Your task:
- Answer the user's question about construction or renovation costs using ONLY the provided pricing reference.
- If the question matches a line item, give the price or range and the unit (e.g. per linear metre, per m²).
- If the question is vague (e.g. "how much for a bathroom?"), list the relevant items from the reference (demolition, rough-in, finish, fixtures) and their ranges.
- If something has no matching line in the reference, say so and do not invent a number.
- Be concise and direct. Quote ranges exactly as in the reference when possible.
- if no asnwwer or item in the pricing - answer with "I don't know - call Yakir and Shiran"`;
/**
 * Create chat LLM (OpenAI or OpenRouter).
 */
function createChatModel() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

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

  throw new Error(
    "Set OPENAI_API_KEY or OPENROUTER_API_KEY in .env for the pricing Q&A agent."
  );
}

/**
 * Answer a single pricing question using RAG.
 * @param {object} options
 * @param {string} options.question - User question about pricing
 * @param {Retriever} [options.retriever] - Retriever from buildPricingRAG(); if omitted, RAG is built internally (one-off)
 * @param {string} [options.pricingFilePath] - Path to pricing .txt when building RAG internally
 * @param {number} [options.k=6] - Number of chunks to retrieve
 * @returns {Promise<string>} Model answer
 */
export async function answerPricingQuestion({
  question,
  retriever,
  pricingFilePath,
  k = 6,
}) {
  let ownRetriever = retriever;
  if (!ownRetriever) {
    const built = await buildPricingRAG(pricingFilePath); // coupled ! 
    ownRetriever = built.retriever;
  }

  const docs = await getRelevantPricing(ownRetriever, question, k);
  const pricingContext = docs.map((d) => d.pageContent).join("\n\n---\n\n");
  console.log("==================____PRICING CONTEXT_____", pricingContext);
  // chat model = GPT
  // model embedding = openAI * 2 ( build * 2 ) , RAG pipline, retriever,
  const model = createChatModel();
  const messages = [
    new SystemMessage({
      content:
        SYSTEM_PROMPT +
        "\n\nPricing reference (excerpts):\n\n" +
        pricingContext,
    }),
    new HumanMessage({ content: question }),
  ];

  const response = await model.invoke(messages);
  return typeof response.content === "string"
    ? response.content
    : response.content.map((c) => (c.type === "text" ? c.text : "")).join("");
}

/**
 * Build RAG and return a function that answers questions using that retriever.
 * Use this when you want to run the agent separately: build once, then ask many questions.
 *
 * @param {string} [pricingFilePath] - Path to pricing .txt
 * @returns {Promise<{ answer: (question: string) => Promise<string>, retriever }>}
 */
export async function createPricingQAAgent(pricingFilePath) {
  const { retriever } = await buildPricingRAG(pricingFilePath);
  return {
    retriever,
    answer: (question, k = 1) =>
      answerPricingQuestion({ question, retriever, k }),
  };
}
