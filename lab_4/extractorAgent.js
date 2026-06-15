import { createAgent } from "langchain";
import { AIMessage } from "@langchain/core/messages";
import { z } from "zod";
import { getStoryModel, resolveModel } from "./model.js";
import {
  EXTRACTOR_SYSTEM_PROMPT,
  MAX_SUBJECT_LENGTH,
  MAX_TITLE_LENGTH,
  DEFAULT_CREATIVITY,
  normalizeCreativity,
  normalizeMood,
  normalizeStoryLines,
} from "./prompts.js";
import { validateSubject, validateTitle } from "./storyTeller.js";

const NO_SUBJECT_ERROR = "no subject from your text";

const rawExtractSchema = z.object({
  subject: z.union([z.string(), z.null()]).optional(),
  creativity: z.union([z.number(), z.null()]).optional(),
  mood: z.union([z.enum(["happy", "scary"]), z.null()]).optional(),
  lines: z.union([z.number(), z.null()]).optional(),
  title: z.union([z.string(), z.null()]).optional(),
});

export class ExtractorError extends Error {
  constructor(message, { status = 400 } = {}) {
    super(message);
    this.name = "ExtractorError";
    this.status = status;
  }
}

function getAgentText(result) {
  const messages = result?.messages ?? [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg instanceof AIMessage || msg?.type === "ai" || msg?.role === "assistant") {
      const content =
        typeof msg.content === "string" ? msg.content : String(msg.content ?? "");
      if (content.trim()) return content.trim();
    }
  }
  throw new ExtractorError("Extractor agent returned no text.", { status: 500 });
}

function parseJsonFromText(text) {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new ExtractorError("Extractor agent returned invalid JSON.", { status: 500 });
  }
}

function resolveMockResponse(mockResponse) {
  if (!mockResponse) return null;
  if (typeof mockResponse === "string") {
    try {
      return rawExtractSchema.parse(JSON.parse(mockResponse));
    } catch {
      throw new ExtractorError("Invalid mockExtractor JSON.", { status: 400 });
    }
  }
  return rawExtractSchema.parse(mockResponse);
}

function normalizeExtracted(raw) {
  const parsed = rawExtractSchema.parse(raw);
  const subjectRaw = parsed.subject?.trim?.() ?? String(parsed.subject ?? "").trim();

  if (!subjectRaw) {
    throw new ExtractorError(NO_SUBJECT_ERROR);
  }

  const subject = validateSubject(subjectRaw);
  const title = validateTitle(parsed.title ?? "");
  const mood = normalizeMood(parsed.mood);
  const lines = normalizeStoryLines(parsed.lines);
  const creativity = normalizeCreativity(parsed.creativity);

  return { subject, title, mood, lines, creativity };
}

/**
 * Runs the extractor agent on free-form user text.
 * @param {string} text
 * @param {{ mockResponse?: string | object }} [options]
 */
export async function runExtractorAgent(text, { mockResponse } = {}) {
  const trimmedText = String(text ?? "").trim();
  if (!trimmedText) {
    throw new ExtractorError("Please provide text describing your story.");
  }

  const envMock = process.env.EXTRACTOR_MOCK_RESPONSE?.trim();
  const mock = resolveMockResponse(mockResponse ?? (envMock ? envMock : null));
  if (mock) {
    return normalizeExtracted(mock);
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new ExtractorError("Missing API KEY - OPENROUTER_API_KEY", { status: 500 });
  }

  const resolvedModel = getStoryModel();
  const agent = createAgent({
    model: resolveModel(resolvedModel, { temperature: 0.2 }),
    tools: [],
    systemPrompt: EXTRACTOR_SYSTEM_PROMPT,
  });

  const result = await agent.invoke({
    messages: [{ role: "user", content: trimmedText }],
  });

  const rawJson = parseJsonFromText(getAgentText(result));
  console.log("rawJson", rawJson);
   return normalizeExtracted(rawJson);
}

export { NO_SUBJECT_ERROR };


