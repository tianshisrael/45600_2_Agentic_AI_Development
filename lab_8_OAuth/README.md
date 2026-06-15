# Lab 8 – OAuth RAG Q&A

Project structure per course **Ex_1** (11/6/2026):

```
lab_8_OAuth/
├── agent/
│   └── agent.js          # OAuth Q&A (uses retriever only per request)
├── scripts/
│   ├── rag-process.js    # PDF → vector memory (runs once, decoupled)
│   └── run-qa.js         # CLI wrapper
├── data/
│   └── the-modern-guide-to-oauth.pdf
├── package.json
└── .env
```

## Setup

```powershell
cd lab_8_OAuth
npm install
copy .env.example .env
# Add OPENROUTER_API_KEY or OPENAI_API_KEY
```

## Run

Test RAG retrieval only:

```powershell
node scripts/rag-process.js "What is an authorization code?"
```

OAuth Q&A agent:

```powershell
node agent/agent.js "What is PKCE?"
node scripts/run-qa.js "What is PKCE?"
node scripts/run-qa.js
```

## Design

- **Ingestion** (`scripts/rag-process.js`): loads `data/the-modern-guide-to-oauth.pdf`, chunks, embeds, stores in memory. Cached on first call.
- **Q&A** (`agent/agent.js`): on each question only **retrieves** relevant chunks and calls the LLM — does **not** re-index the PDF.

Source PDF copied from `hw_data/the-modern-guide-to-oauth.pdf` (course materials).
