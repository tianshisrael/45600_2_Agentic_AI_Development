/**
 * Construction pricing agent: image + RAG.
 * Loads a construction image (e.g. floor plan with markings for walls to remove,
 * bathroom to demo) and returns a pricing breakdown using the in-memory pricing RAG.
 *
 * Designed so you can later add:
 * - An extraction agent (extracts items from image only)
 * - A pricing-check agent (validates or checks pricing only)
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { buildPricingRAG, getRelevantPricing } from "../../lib/rag-pipeline.js";
import { imageToBase64DataUrl } from "../../lib/vision.js";

const VISION_SYSTEM_PROMPT = `You are a construction cost estimator. You receive:
1. A construction/renovation image (floor plan, photo, or markup) where the client has marked what they want done (e.g. walls to remove, bathroom to demolish, areas to rebuild).
2. A pricing reference document (constructor pricing) that lists costs per item.

Your task:
- Describe what you see in the image that relates to construction work: walls to remove (load-bearing or not if visible), bathroom removal, kitchen demolition, any other marked areas.
- For each identified scope item, look up the relevant line items in the pricing reference and state the applicable price or range.
- Output a clear breakdown: item description, quantity/unit if you can infer it, and price (or range). If quantity is unknown, state "estimate per unit" and give the unit price.
- End with a short summary and total range if possible.

Be concise. Use only prices from the provided pricing reference. If something in the image has no matching line in the reference, say so and do not invent a number.`;

/**
 * Create vision-capable LLM (supports image + text).
 * Uses OpenAI API or OpenRouter; set OPENAI_API_KEY or OPENROUTER_API_KEY in .env.
 */
function createVisionModel() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (openRouterKey) {
    return new ChatOpenAI({
      model: "openai/gpt-4o",
      temperature: 0.2,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openRouterKey,
      },
    });
  }

  if (openaiKey) {
    return new ChatOpenAI({
      model: "gpt-4o",
      temperature: 0.2,
    });
  }

  throw new Error(
    "Set OPENAI_API_KEY or OPENROUTER_API_KEY in .env for the vision model."
  );
}

/**
 * Run the construction pricing agent: load image, retrieve pricing from RAG, call vision model.
 * @param {object} options
 * @param {string} options.imagePath - Path to construction image
 * @param {string} [options.pricingFilePath] - Path to pricing .txt (default: data/pricing.txt)
 * @param {string} [options.userPrompt] - Optional extra instruction
 * @returns {Promise<string>} Model response with pricing breakdown
 */
export async function runConstructionPricingAgent({
  imagePath,
  pricingFilePath,
  userPrompt,
}) {
  const model = createVisionModel();

  // Build RAG and get relevant pricing for common renovation queries
  const { retriever } = await buildPricingRAG(pricingFilePath);
  const queries = [
    "remove wall demolition load-bearing",
    "bathroom demolition remove",
    "rebuild wall drywall",
    "kitchen demolition",
  ];
  const docSets = await Promise.all(
    queries.map((q) => getRelevantPricing(retriever, q, 4))
  );
  const uniqueDocs = new Map();
  for (const docs of docSets) {
    for (const d of docs) {
      uniqueDocs.set(d.pageContent, d);
    }
  }
  const pricingContext = [...uniqueDocs.values()]
    .map((d) => d.pageContent)
    .join("\n\n---\n\n");

  const { dataUrl } = imageToBase64DataUrl(imagePath);

  const content = [
    {
      type: "text",
      text:
        (userPrompt
          ? userPrompt + "\n\n"
          : "") +
        "Use the following constructor pricing reference to price the work marked in the image:\n\n" +
        pricingContext,
    },
    {
      type: "image_url",
      image_url: { url: dataUrl },
    },
  ];

  const messages = [
    new SystemMessage({ content: VISION_SYSTEM_PROMPT }),
    new HumanMessage({ content }),
  ];
  const response = await model.invoke(messages);
  return typeof response.content === "string"
    ? response.content
    : response.content.map((c) => (c.type === "text" ? c.text : "")).join("");
}
