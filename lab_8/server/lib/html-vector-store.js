/**
 * Vector store for HTML RAG: retrieve relevant HTML-derived chunks by user question.
 * Uses table html_vectors in the same DB (pgvector).
 */
import { OpenAIEmbeddings } from "@langchain/openai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";

const TABLE_NAME = "html_vectors";

function getEmbeddings() {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Set OPENAI_API_KEY or OPENROUTER_API_KEY in .env");
  const useOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  return new OpenAIEmbeddings(
    {
      model: useOpenRouter ? "openai/text-embedding-3-small" : "text-embedding-3-small",
      apiKey,
    },
    useOpenRouter ? { basePath: "https://openrouter.ai/api/v1" } : undefined
  );
}

export async function getHtmlVectorStore() {
  const store = await PGVectorStore.initialize(getEmbeddings(), {
    postgresConnectionOptions: {
      type: "postgres",
      host: process.env.PG_HOST || "127.0.0.1",
      port: Number(process.env.PG_PORT || "5433"),
      user: process.env.PG_USER || "sso_user",
      password: process.env.PG_PASSWORD || "sso_pass",
      database: process.env.PG_DATABASE || "sso_db",
    },
    tableName: TABLE_NAME,
    columns: {
      idColumnName: "id",
      vectorColumnName: "vector",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
  });
  return store;
}

export async function getHtmlRetriever(k = 6) {
  const store = await getHtmlVectorStore();
  return store.asRetriever(k);
}
