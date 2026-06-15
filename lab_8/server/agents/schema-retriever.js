/**
 * Schema Retriever (RAG)
 * Input: user question
 * Output: relevant tables/columns/relations + short notes
 */
import { getSchemaRetriever } from "../lib/schema-vector-store.js";

export async function retrieveSchemaContext(question, k = 8) {
  const retriever = await getSchemaRetriever(k);
  const docs = await retriever.invoke(question);
  const parts = docs.map((d) => d.pageContent);
  const notes = docs.length
    ? "Relevant schema excerpts (tables, columns, relations):"
    : "No schema context found. Available tables: users, permissions, users_permissions, audit_login.";
  return {
    schemaContext: parts.join("\n\n---\n\n"),
    notes,
    sources: docs.map((d) => ({ table: d.metadata?.table, type: d.metadata?.type })),
  };
}
