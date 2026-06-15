/**
 * RAG ingestion for the OAuth PDF — decoupled from Q&A.
 * Loads data/the-modern-guide-to-oauth.pdf once into in-memory vector store.
 *
 * Usage (test retrieval only):
 *   node scripts/rag-process.js "What is an authorization code?"
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import "dotenv/config";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PDF_PATH = path.join(__dirname, "..", "data", "the-modern-guide-to-oauth.pdf");

/** Cached RAG instance — ingestion runs once per process. */
let ragCache = null;

function resolvePdfPath(filePath = DEFAULT_PDF_PATH) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

function createEmbeddings() {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  if (openRouterKey) {
    return new OpenAIEmbeddings(
      {
        model: "openai/text-embedding-3-small",
        apiKey: openRouterKey,
      },
      { basePath: "https://openrouter.ai/api/v1" },
    );
  }

  if (openaiKey) {
    return new OpenAIEmbeddings({
      model: "text-embedding-3-small",
      apiKey: openaiKey,
    });
  }

  throw new Error("Set OPENROUTER_API_KEY or OPENAI_API_KEY in lab_8_OAuth/.env");
}

export async function loadOAuthPdf(filePath = DEFAULT_PDF_PATH) {
  const absolutePath = resolvePdfPath(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`OAuth PDF not found: ${absolutePath}`);
  }

  const buffer = fs.readFileSync(absolutePath);
  const parsed = await pdfParse(buffer);
  const text = parsed.text?.trim();
  if (!text) {
    throw new Error(`PDF is empty or unreadable: ${absolutePath}`);
  }

  return [
    new Document({
      pageContent: text,
      metadata: { source: absolutePath, pages: parsed.numpages ?? null },
    }),
  ];
}

export function splitDocuments(documents, { chunkSize = 1000, chunkOverlap = 150 } = {}) {
  const chunks = [];

  for (const doc of documents) {
    const text = doc.pageContent;
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const slice = text.slice(start, end).trim();
      if (slice) {
        chunks.push(
          new Document({
            pageContent: slice,
            metadata: { ...doc.metadata, chunkStart: start },
          }),
        );
      }
      if (end >= text.length) break;
      start = Math.max(end - chunkOverlap, start + 1);
    }
  }

  return chunks.length ? chunks : documents;
}

/**
 * Build in-memory vector store from OAuth PDF.
 * @param {string} [pdfPath]
 * @returns {Promise<{ vectorStore, retriever }>}
 */
export async function buildOAuthRAG(pdfPath = DEFAULT_PDF_PATH) {
  const docs = await loadOAuthPdf(pdfPath);
  const splitDocs = splitDocuments(docs);
  const embeddings = createEmbeddings();
  const vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
  const retriever = vectorStore.asRetriever({ k: 4 });

  return { vectorStore, retriever };
}

/**
 * Get shared retriever — indexes PDF on first call only (decoupled from each Q&A).
 */
export async function getOAuthRetriever(pdfPath = DEFAULT_PDF_PATH) {
  if (!ragCache) {
    ragCache = await buildOAuthRAG(pdfPath);
  }
  return ragCache.retriever;
}

export async function retrieveOAuthContext(retriever, query, k = 4) {
  return retriever.invoke(query, { k });
}

/** CLI: test RAG retrieval without the agent. */
async function main() {
  const query = process.argv.slice(2).join(" ").trim() || "What is OAuth 2.0?";

  console.log("Indexing OAuth PDF into memory (one-time)...");
  const retriever = await getOAuthRetriever();
  console.log("RAG ready.\n");

  const docs = await retrieveOAuthContext(retriever, query);
  console.log(`Query: ${query}\n--- Retrieved excerpts ---\n`);
  docs.forEach((doc, index) => {
    console.log(`[${index + 1}] ${doc.pageContent.slice(0, 400)}...\n`);
  });
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
