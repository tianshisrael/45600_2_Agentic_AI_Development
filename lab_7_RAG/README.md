# Lab 4 – RAG + Construction Pricing Agent

Node.js + LangChain pipeline that:

1. **Loads a constructor pricing file (TXT) into memory** via an in-memory RAG pipeline (vector store + embeddings).
2. **Accepts a construction image** (e.g. floor plan with markings for walls to remove, bathroom to demo) and returns a **pricing breakdown** using the RAG pricing data.

The structure is ready for future agents: one that **extracts** work items from the image, and another that **checks/validates** pricing.

## Setup

```bash
cd lab_4_RAG
npm install
cp .env.example .env
# Edit .env: set OPENAI_API_KEY or OPENROUTER_API_KEY
```

## Pricing file

- **Path:** `data/pricing.txt`
- Edit this TXT with your own constructor pricing (per unit: remove walls, rebuild walls, bathroom removal, etc.). The file is loaded into an in-memory vector store at runtime.

## Run

### Full agent (image → pricing)

```bash
node index.js <path-to-your-construction-image>
# Example:
node index.js ./samples/floorplan.jpg
```

The agent will:

1. Load `data/pricing.txt` into the RAG pipeline (in memory).
2. Load your image and send it to a vision model (e.g. gpt-4o) with the relevant pricing context.
3. Return a breakdown: what’s marked in the image (walls to remove, bathroom demo, etc.) and the corresponding prices from the pricing file.

### RAG only (no image)

To test that the pricing file is loaded and retrieval works:

```bash
node scripts/run-rag-only.js
```

## Environment

- **OPENAI_API_KEY** – used for Chat (vision) and embeddings. Or:
- **OPENROUTER_API_KEY** – used for vision model (e.g. `openai/gpt-4o`); embeddings still use OpenAI unless you change the embedding provider in `lib/rag-pipeline.js`.

## Project layout

```
lab_4_RAG/
├── data/
│   └── pricing.txt          # Constructor pricing (edit with your rates)
├── lib/
│   ├── rag-pipeline.js      # Load TXT → split → embed → MemoryVectorStore → retriever
│   └── vision.js            # Image → base64 for vision API
├── agents/
│   ├── construction-pricing-agent.js   # Image + RAG → pricing breakdown
│   ├── extraction-agent.js             # (Future) Image → list of work items
│   └── pricing-check-agent.js          # (Future) Items + RAG → validate pricing
├── scripts/
│   └── run-rag-only.js      # Test RAG retrieval without image
├── index.js                 # CLI: node index.js <image-path>
├── package.json
├── .env.example
└── README.md
```

## Future agents

- **Extraction agent** (`agents/extraction-agent.js`): input = image → output = structured list of work items (no pricing). You can then pass this list to the pricing agent or to a dedicated pricing-check agent.
- **Pricing-check agent** (`agents/pricing-check-agent.js`): input = list of items + RAG retriever → output = validation, missing items, or suggested alternatives. Same RAG pipeline (`lib/rag-pipeline.js`) and `data/pricing.txt` can be reused.

## Dependencies

- `@langchain/core` – documents, messages
- `@langchain/openai` – ChatOpenAI (vision), OpenAIEmbeddings
- `langchain` – MemoryVectorStore (in-memory RAG)
- `dotenv` – env vars
