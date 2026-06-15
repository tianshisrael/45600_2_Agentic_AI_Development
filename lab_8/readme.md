# Lab 9.2: Multi-Agent — Router with Agents as Tools

Refactor of Lab 9: the **router uses each agent as a tool**. The LLM chooses which tool to call (HTML RAG or SQL agent) instead of returning a route string that the server dispatches with `if/else`.

1. **Router agent** – Chat model with two tools:
   - **answer_with_html_rag**: Answers simple/documentation questions using retrieved HTML content.
   - **run_sql_agent**: Handles database questions (schema RAG → generate SQL → execute → natural-language answer).

2. **HTML RAG agent** – Same as Lab 9: answers from `html_vectors` content.

3. **SQL agent** – Same pipeline: schema RAG → generate SQL → execute → answer agent.

The router invokes the model with these tools; the model returns a tool call; we execute that tool and return the result. No imperative routing in application code.

## Setup

1. Run `docker compose up` (same as Lab 9).
2. From `server/`: `npm install`, then:
   - `npm run init-db` – load schema + data
   - `npm run index-schema` – index schema for SQL RAG
   - `npm run index-html` – index HTML in `server/content/` for HTML RAG
3. Set `OPENAI_API_KEY` or `OPENROUTER_API_KEY` in `server/.env`.

## Run

- `npm run start` (default port 3002).
- `POST /query` with body `{ "question": "..." }`. Response includes `route` (`html_rag` or `sql_agent`), `answer`, and for SQL route also `sql`, `rows`, `rowCount`, `error`.

## Adding HTML for RAG

Put `.html` files in `server/content/`. Run `npm run index-html` after adding or changing them.
