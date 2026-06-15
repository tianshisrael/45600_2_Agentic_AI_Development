import { ChatOpenRouter } from "@langchain/openrouter";

const OPENROUTER_PREFIX = "openrouter:";

export const DEFAULT_MODEL = "openrouter:gpt-5.4";

/** Story agent model — configured via OPENROUTER_MODEL in .env */
export function getStoryModel() {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
}

/**
 * Resolves LangChain model strings like "openrouter:openai/gpt-5.4" to a ChatOpenRouter
 * instance. Plain provider strings are passed through to createAgent unchanged.
 */
export function resolveModel(modelRef, apiKey) {
  if (typeof modelRef !== "string" || !modelRef.startsWith(OPENROUTER_PREFIX)) {
    return modelRef;
  }

  const modelId = modelRef.slice(OPENROUTER_PREFIX.length);
  const openRouterModelId = modelId.includes("/") ? modelId : `openai/${modelId}`;

  return new ChatOpenRouter({
    model: openRouterModelId,
    temperature: 0.8,
    maxTokens: 400,
  });
}
