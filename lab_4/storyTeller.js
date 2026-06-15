import { createAgent } from "langchain";
import { AIMessage } from "@langchain/core/messages";
import { z } from "zod";
import { getStoryModel, resolveModel } from "./model.js";
import {
  MAX_SUBJECT_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_STORY_LINES,
  MAX_STORY_LINES,
  MOODS,
  DEFAULT_STORY_LINES,
  DEFAULT_USER_PROMPT_TEMPLATE,
  buildSystemPrompt,
  buildUserPrompt,
  normalizeMood,
  normalizeStoryLines,
  normalizeCreativity,
} from "./prompts.js";

export { MAX_SUBJECT_LENGTH, MAX_TITLE_LENGTH };

export function validateSubject(subject) {
  const trimmed = String(subject ?? "").trim();
  if (!trimmed) {
    throw new Error(
      `Please provide a story subject (max ${MAX_SUBJECT_LENGTH} characters).`,
    );
  }
  if (trimmed.length > MAX_SUBJECT_LENGTH) {
    throw new Error(
      `Subject is too long (${trimmed.length} chars). Keep it to ${MAX_SUBJECT_LENGTH} characters or fewer.`,
    );
  }
  return trimmed;
}

export function validateTitle(title) {
  const trimmed = String(title ?? "").trim();
  if (!trimmed) return "";
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new Error(
      `Title is too long (${trimmed.length} chars). Keep it to ${MAX_TITLE_LENGTH} characters or fewer.`,
    );
  }
  return trimmed;
}

const optionalStringField = (fieldName) =>
  z
    .union([z.string(), z.literal(""), z.null(), z.undefined()])
    .optional()
    .transform((value) =>
      value === undefined || value === null || value === "" ? "" : value,
    )
    .pipe(z.string().max(10_000, `${fieldName} is too long.`))
    .transform((value) => value.trim());

const storyRequestSchema = z
  .object({
    subject: z
      .unknown()
      .superRefine((value, ctx) => {
        if (value === undefined || value === null) {
          ctx.addIssue({ code: "custom", message: "subject is required." });
          return;
        }
        if (typeof value !== "string") {
          ctx.addIssue({ code: "custom", message: "subject must be a string." });
          return;
        }
        const trimmed = value.trim();
        if (!trimmed) {
          ctx.addIssue({
            code: "custom",
            message: `Please provide a story subject (max ${MAX_SUBJECT_LENGTH} characters).`,
          });
          return;
        }
        if (trimmed.length > MAX_SUBJECT_LENGTH) {
          ctx.addIssue({
            code: "custom",
            message: `Subject is too long (${trimmed.length} chars). Keep it to ${MAX_SUBJECT_LENGTH} characters or fewer.`,
          });
        }
      })
      .transform((value) => String(value).trim()),
    title: z
      .union([z.string(), z.literal(""), z.null(), z.undefined()])
      .optional()
      .transform((value) => String(value ?? "").trim())
      .refine((value) => value.length <= MAX_TITLE_LENGTH, (value) => ({
        message: `Title is too long (${value.length} chars). Keep it to ${MAX_TITLE_LENGTH} characters or fewer.`,
      })),
    mood: z
      .union([z.string(), z.null(), z.undefined()])
      .optional()
      .superRefine((value, ctx) => {
        try {
          normalizeMood(value);
        } catch (err) {
          ctx.addIssue({
            code: "custom",
            message: err?.message ?? `Mood must be one of: ${MOODS.join(", ")}.`,
          });
        }
      })
      .transform((value) => normalizeMood(value)),
    lines: z
      .union([z.number(), z.string(), z.null(), z.undefined()])
      .optional()
      .superRefine((value, ctx) => {
        try {
          normalizeStoryLines(value);
        } catch (err) {
          ctx.addIssue({
            code: "custom",
            message:
              err?.message ??
              `Story length must be an integer from ${MIN_STORY_LINES} to ${MAX_STORY_LINES} lines.`,
          });
        }
      })
      .transform((value) => normalizeStoryLines(value)),
    systemPrompt: optionalStringField("systemPrompt"),
    userPromptTemplate: optionalStringField("userPromptTemplate"),
  });

/**
 * Maps Zod issues to a stable, client-friendly shape.
 */
export function formatZodIssues(issues) {
  return issues.map((issue) => ({
    path: issue.path.length ? issue.path.map(String).join(".") : "(root)",
    code: issue.code,
    message: issue.message,
    ...(issue.expected !== undefined && { expected: issue.expected }),
    ...(issue.received !== undefined && { received: issue.received }),
  }));
}

export class StoryRequestValidationError extends Error {
  constructor(zodError) {
    const details = formatZodIssues(zodError.issues);
    const summary =
      details.map((d) => `${d.path}: ${d.message}`).join("; ") ||
      "Request validation failed.";
    super(summary);
    this.name = "StoryRequestValidationError";
    this.details = details;
    this.issues = zodError.issues;
  }
}

/**
 * Validates JSON body for the story-teller chat entrypoint.
 */
export function validateStoryRequest(body) {
  const result = storyRequestSchema.safeParse(body);
  if (!result.success) {
    throw new StoryRequestValidationError(result.error);
  }
  return result.data;
}

export function getStoryText(result) {
  const messages = result?.messages ?? [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg instanceof AIMessage || msg?.type === "ai" || msg?.role === "assistant") {
      const content =
        typeof msg.content === "string" ? msg.content : String(msg.content ?? "");
      if (content.trim()) return content.trim();
    }
  }
  throw new Error("Agent returned no story text.");
}

export async function runStoryTeller({
  subject,
  title = "",
  mood,
  lines,
  creativity,
  systemPrompt = "",
  userPromptTemplate = "",
}) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing API KEY - OPENROUTER_API_KEY");
  }

  const validatedSubject = validateSubject(subject);
  const validatedTitle = validateTitle(title);
  const normalizedMood = normalizeMood(mood);
  const lineCount = normalizeStoryLines(lines);
  const temperature = normalizeCreativity(creativity);
  const resolvedModel = getStoryModel();

  const useCustomSystem = Boolean(systemPrompt?.trim());
  const resolvedSystemPrompt = useCustomSystem
    ? systemPrompt.trim()
    : buildSystemPrompt({
        mood: normalizedMood,
        lines: lineCount,
        title: validatedTitle,
      });
  const template = userPromptTemplate || DEFAULT_USER_PROMPT_TEMPLATE;
  const userPrompt = buildUserPrompt(validatedSubject, {
    template,
    title: validatedTitle,
    mood: normalizedMood,
    lines: lineCount,
  });

  const agent = createAgent({
    model: resolveModel(resolvedModel, { temperature }),
    tools: [],
    systemPrompt: resolvedSystemPrompt,
  });

  const result = await agent.invoke({
    messages: [{ role: "user", content: userPrompt }],
  });

  return {
    story: getStoryText(result),
    subject: validatedSubject,
    title: validatedTitle,
    mood: normalizedMood,
    lines: lineCount,
    creativity: temperature,
    model: resolvedModel,
  };
}
