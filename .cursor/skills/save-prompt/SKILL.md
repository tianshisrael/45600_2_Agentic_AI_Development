---
name: save-prompt
description: Archives the user's agent prompt to prompts/prompt_{title}_{datetime}.md. Use only when the user tags or attaches save-prompt (manual invocation).
disable-model-invocation: true
---

# Save Prompt

Save the user's **current message prompt** (the text they sent with this skill) into the project `prompts/` folder. Do not run this workflow unless the user explicitly tagged or attached **save-prompt**.

## Output

| Item      | Rule                                                                        |
| --------- | --------------------------------------------------------------------------- |
| Directory | `prompts/` at the workspace root (create if missing)                        |
| Filename  | `prompt_{title}_{currentDateTime}.md`                                       |
| File body | The prompt text only, wrapped in a minimal markdown document (see template) |

## Title (`{title}`)

1. If the user gives a title in the message (e.g. `title: lab3-agent` or `Title: My Agent`), use that value.
2. Otherwise derive from the first line of the prompt: lowercase, spaces → hyphens, strip non-alphanumeric except hyphens, max 40 characters.
3. If the result is empty, use `untitled`.

## DateTime (`{currentDateTime}`)

Use local time at save moment, filesystem-safe:

`YYYY-MM-DD_HHmmss` (example: `2026-06-04_143052`)

## Workflow

1. Confirm **save-prompt** was explicitly requested (tag or attachment). If not, stop.
2. Extract the prompt body:
   - Prefer the user's message text **excluding** the skill tag/attachment line (e.g. remove `/save-prompt`, `@save-prompt`, or attachment-only lines).
   - Do not include prior assistant turns unless the user asked to archive those too.
3. Resolve `{title}` and `{currentDateTime}` per rules above.
4. Write `prompts/prompt_{title}_{currentDateTime}.md` using the template below.
5. Reply briefly with the saved path only (no long recap of the prompt).

## File template

```markdown
# {title}

Saved: {currentDateTime}

---

{prompt body verbatim}
```

## Examples

**User message:**

```
/save-prompt title: weather-agent

Build a LangGraph agent that calls OpenWeather and returns JSON.
```

**File:** `prompts/prompt_weather-agent_2026-06-04_143052.md`

**User message (no title):**

```
@save-prompt Summarize the last three commits in plain English.
```

**File:** `prompts/prompt_summarize-the-last-three-commits_2026-06-04_150011.md`

## Do not

- Auto-save on every message (this skill is manual-only).
- Overwrite an existing file; if a collision occurs, append `_2`, `_3`, etc. to the datetime segment.
- Commit or push unless the user separately asks.

## IMPORTANT

After saving the prompt and finishing this skill execute the prompt and do the task - complete the prompt.
