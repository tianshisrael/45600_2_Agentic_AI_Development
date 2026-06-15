import "dotenv/config";
import {
  MAX_SUBJECT_LENGTH,
  MAX_TITLE_LENGTH,
  DEFAULT_STORY_LINES,
  MAX_STORY_LINES,
  MOODS,
  DEFAULT_MOOD,
  DEFAULT_USER_PROMPT_TEMPLATE,
} from "./prompts.js";
import { getStoryModel } from "./model.js";
import { runStoryTeller, validateSubject, validateTitle } from "./storyTeller.js";

function usage() {
  console.log(`Usage: npm run agent -- [options] "<subject>"

Write a short kids story about the subject.

Options:
  --title "<text>"    Story title (included on the first line)
  --mood happy|scary  Story tone (default: happy)
  --lines <n>         Max story lines, 1-${MAX_STORY_LINES} (default: ${DEFAULT_STORY_LINES})
  --system "<text>"   Override the system prompt for this run
  --user "<text>"     Override the user prompt template ({subject} is replaced)
  --help              Show this help

Environment (.env):
  OPENROUTER_API_KEY   Required
  OPENROUTER_MODEL     Default: openrouter:gpt-5.4
  SYSTEM_PROMPT        Optional default system prompt (skips auto mood/length/title rules)
  USER_PROMPT          Optional default user prompt template

Subject must be at most ${MAX_SUBJECT_LENGTH} characters.
Title must be at most ${MAX_TITLE_LENGTH} characters.

Examples:
  npm run agent -- "a bunny who loves carrots"
  npm run agent -- --title "Midnight Paws" --mood scary --lines 8 "a cat in an old attic"
`);
}

function parseArgs(argv) {
  const args = {
    subject: "",
    title: "",
    mood: DEFAULT_MOOD,
    lines: DEFAULT_STORY_LINES,
    systemPrompt: process.env.SYSTEM_PROMPT?.trim() || "",
    userPromptTemplate: process.env.USER_PROMPT?.trim() || "",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      return { help: true };
    }
    if (arg === "--system") {
      const value = argv[++i];
      if (!value) throw new Error("--system requires a value");
      args.systemPrompt = value;
      continue;
    }
    if (arg === "--user") {
      const value = argv[++i];
      if (!value) throw new Error("--user requires a value");
      args.userPromptTemplate = value;
      continue;
    }
    if (arg === "--title") {
      const value = argv[++i];
      if (!value) throw new Error("--title requires a value");
      args.title = value;
      continue;
    }
    if (arg === "--mood") {
      const value = argv[++i];
      if (!value) throw new Error(`--mood requires one of: ${MOODS.join(", ")}`);
      args.mood = value;
      continue;
    }
    if (arg === "--lines") {
      const value = argv[++i];
      if (!value) throw new Error("--lines requires a number");
      args.lines = value;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    args.subject = args.subject ? `${args.subject} ${arg}` : arg;
  }

  return args;
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    usage();
    return;
  }

  const subject = validateSubject(parsed.subject);
  const title = validateTitle(parsed.title);
  console.log(`Model: ${getStoryModel()}`);
  console.log(`Subject: ${subject}`);
  if (title) console.log(`Title: ${title}`);
  console.log(`Mood: ${parsed.mood}`);
  console.log(`Max lines: ${parsed.lines}\n`);

  const { story } = await runStoryTeller({
    subject,
    title,
    mood: parsed.mood,
    lines: parsed.lines,
    systemPrompt: parsed.systemPrompt,
    userPromptTemplate: parsed.userPromptTemplate,
  });

  console.log(story);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
