export const MAX_SUBJECT_LENGTH = 50;
export const MAX_TITLE_LENGTH = 80;

export const DEFAULT_STORY_LINES = 5;
export const MIN_STORY_LINES = 1;
export const MAX_STORY_LINES = 10;

export const MOODS = ["happy", "scary"];
export const DEFAULT_MOOD = "happy";

export const DEFAULT_USER_PROMPT_TEMPLATE =
  "Write a short story for kids about: {subject}";

const MOOD_INSTRUCTIONS = {
  happy: `You write short, happy stories for young children (ages 4-8).
- Use simple words and a warm, cheerful tone.
- End on a positive note.`,
  scary: `You write short, spooky-but-safe stories for young children (ages 7-10).
- Use simple words and a mildly creepy, suspenseful tone—no gore, violence, or nightmares.
- Keep it fun-scary, not traumatizing; end with relief or a light twist.`,
};

export function normalizeMood(mood) {
  const value = (mood ?? DEFAULT_MOOD).trim().toLowerCase();
  if (!MOODS.includes(value)) {
    throw new Error(`Mood must be one of: ${MOODS.join(", ")}. Got: "${mood}"`);
  }
  return value;
}

export function normalizeStoryLines(lines) {
  if (lines === undefined || lines === null || lines === "") {
    return DEFAULT_STORY_LINES;
  }
  const n = Number(lines);
  if (!Number.isInteger(n) || n < MIN_STORY_LINES || n > MAX_STORY_LINES) {
    throw new Error(
      `Story length must be an integer from ${MIN_STORY_LINES} to ${MAX_STORY_LINES} lines.`,
    );
  }
  return n;
}

export function buildSystemPrompt({ mood, lines, title }) {
  const normalizedMood = normalizeMood(mood);
  const lineCount = normalizeStoryLines(lines);
  const trimmedTitle = (title ?? "").trim();

  const titleRule = trimmedTitle
    ? `- Start with the title on its own line: "${trimmedTitle}"`
    : "- Do not add a separate title line unless the user asks for one.";

  return `${MOOD_INSTRUCTIONS[normalizedMood]}
Rules:
- Write at most ${lineCount} lines of story text (one sentence per line).
- Do not exceed ${lineCount} lines.
${titleRule}
- Do not include labels, metadata, or extra commentary—only the title (if any) and story lines.`;
}

export function buildUserPrompt(
  subject,
  { template = DEFAULT_USER_PROMPT_TEMPLATE, title = "", mood = DEFAULT_MOOD, lines = DEFAULT_STORY_LINES } = {},
) {
  const normalizedMood = normalizeMood(mood);
  const lineCount = normalizeStoryLines(lines);
  const trimmedTitle = title.trim();

  let prompt = template.includes("{subject}")
    ? template.replaceAll("{subject}", subject)
    : `${template.trim()} ${subject}`.trim();

  const details = [
    `Mood: ${normalizedMood}`,
    `Length: at most ${lineCount} lines (one sentence per line)`,
  ];
  if (trimmedTitle) {
    details.push(`Title: ${trimmedTitle}`);
  }

  return `${prompt}\n\n${details.join("\n")}`;
}

export const DEFAULT_SYSTEM_PROMPT = buildSystemPrompt({
  mood: DEFAULT_MOOD,
  lines: DEFAULT_STORY_LINES,
  title: "",
});
