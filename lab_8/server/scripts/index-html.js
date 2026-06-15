/**
 * Index HTML content into pgvector (html_vectors) for HTML RAG.
 * Run: npm run index-html  (from server folder)
 * Requires: DB running, OPENAI_API_KEY or OPENROUTER_API_KEY.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Document } from "@langchain/core/documents";
import { v4 as uuidv4 } from "uuid";
import { getHtmlVectorStore } from "../lib/html-vector-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.join(__dirname, "..", "content");

/** Strip HTML tags and normalize whitespace */
function htmlToText(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split text into chunks of roughly chunkSize chars with overlap */
function chunkText(text, chunkSize = 400, overlap = 80) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let slice = text.slice(start, end);
    if (end < text.length) {
      const lastSpace = slice.lastIndexOf(" ");
      if (lastSpace > chunkSize / 2) slice = slice.slice(0, lastSpace + 1);
    }
    if (slice.trim()) chunks.push(slice.trim());
    start = end - overlap;
  }
  return chunks;
}

function loadHtmlFiles() {
  if (!fs.existsSync(contentDir)) {
    console.warn("Content dir not found:", contentDir);
    return [];
  }
  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".html"));
  const docs = [];
  for (const file of files) {
    const filePath = path.join(contentDir, file);
    const html = fs.readFileSync(filePath, "utf-8");
    const text = htmlToText(html);
    const chunks = chunkText(text);
    for (const content of chunks) {
      docs.push(new Document({ pageContent: content, metadata: { source: file } }));
    }
  }
  return docs;
}

async function main() {
  console.log("Loading HTML from", contentDir);
  const docs = loadHtmlFiles();
  if (docs.length === 0) {
    console.log("No HTML chunks found. Add .html files to server/content/");
    process.exit(0);
  }
  console.log("Chunks:", docs.length);

  const store = await getHtmlVectorStore();
  const ids = docs.map(() => uuidv4());
  await store.addDocuments(docs, { ids });
  console.log("Indexed", docs.length, "chunks into html_vectors");
  await store.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
