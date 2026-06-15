/**
 * Index schema.sql into pgvector (sso_db) for Schema Retriever RAG.
 * Run: npm run index-schema  (from server folder)
 * Requires: DB running (docker-compose up), OPENAI_API_KEY or OPENROUTER_API_KEY.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { v4 as uuidv4 } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const schemaPath = path.join(__dirname, "..", "..", "schema.sql");

function loadSchema() {
  if (!fs.existsSync(schemaPath)) throw new Error("schema.sql not found at " + schemaPath);
  return fs.readFileSync(schemaPath, "utf-8");
}

/**
 * Split schema into chunks: by CREATE TABLE blocks and COMMENT blocks.
 */
function chunkSchema(text) {
  const docs = [];
  // Full schema as one doc (good for "what tables exist")
  docs.push(new Document({ pageContent: text, metadata: { type: "full_schema" } }));

  // Per-table: extract CREATE TABLE ... ; and COMMENT ON TABLE
  const createRegex = /CREATE TABLE (\w+)\s*\([\s\S]*?\);/g;
  let m;
  while ((m = createRegex.exec(text)) !== null) {
    const tableName = m[1];
    const block = m[0];
    docs.push(
      new Document({
        pageContent: block,
        metadata: { type: "table", table: tableName },
      })
    );
  }

  // COMMENT ON TABLE lines
  const commentRegex = /COMMENT ON TABLE (\w+) IS '([^']+)';/g;
  while ((m = commentRegex.exec(text)) !== null) {
    docs.push(
      new Document({
        pageContent: `Table ${m[1]}: ${m[2]}`,
        metadata: { type: "comment", table: m[1] },
      })
    );
  }

  return docs;
}

async function main() {
  console.log("Loading schema from", schemaPath);
  const schemaText = loadSchema();
  const docs = chunkSchema(schemaText);
  console.log("Chunks:", docs.length);

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Set OPENAI_API_KEY or OPENROUTER_API_KEY in .env");

  const useOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  const embeddings = new OpenAIEmbeddings(
    {
      model: useOpenRouter ? "openai/text-embedding-3-small" : "text-embedding-3-small",
      apiKey,
    },
    useOpenRouter ? { basePath: "https://openrouter.ai/api/v1" } : undefined
  );

  const config = {
    postgresConnectionOptions: {
      type: "postgres",
      host: process.env.PG_HOST || "127.0.0.1",
      port: Number(process.env.PG_PORT || "5433"),
      user: process.env.PG_USER || "sso_user",
      password: process.env.PG_PASSWORD || "sso_pass",
      database: process.env.PG_DATABASE || "sso_db",
    },
    tableName: "schema_vectors",
    columns: {
      idColumnName: "id",
      vectorColumnName: "vector",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
  };

  console.log("Connecting to Postgres (pgvector)...");
  const vectorStore = await PGVectorStore.initialize(embeddings, config);
  const ids = docs.map(() => uuidv4());
  await vectorStore.addDocuments(docs, { ids });
  console.log("Indexed", docs.length, "chunks into schema_vectors");
  await vectorStore.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
