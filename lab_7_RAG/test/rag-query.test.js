/**
 * Short test: RAG pipeline with a query.
 * Run: npm test
 */
import "dotenv/config";
import test from "node:test";
import assert from "node:assert";
import { buildPricingRAG, getRelevantPricing } from "../lib/rag-pipeline.js";

const QUERY = "remove load-bearing wall demolition";

test("RAG returns relevant pricing docs for query", async () => {
  const { retriever } = await buildPricingRAG();
  const docs = await getRelevantPricing(retriever, QUERY, 3);

  assert.ok(Array.isArray(docs), "retriever should return an array");
  assert.ok(docs.length > 0, "should return at least one document for query: " + QUERY);
  assert.ok(
    docs.every((d) => d.pageContent && d.pageContent.length > 0),
    "each doc should have non-empty pageContent"
  );
});
