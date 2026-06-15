/**
 * Test the RAG pipeline only: load pricing.txt and run a few retrieval queries.
 * No image, no vision – useful to verify embeddings and vector store.
 *
 * Run: node scripts/run-rag-only.js
 */

import "dotenv/config";
import { buildPricingRAG, getRelevantPricing } from "../lib/rag-pipeline.js";

async function main() {
  console.log("Building RAG from data/pricing.txt...");
  const { retriever } = await buildPricingRAG();
  console.log("RAG ready. Sample queries:\n");

  const queries = [
    "remove load-bearing wall",
    "bathroom demolition",
    "drywall rebuild",
  ];

  for (const q of queries) {
    const docs = await getRelevantPricing(retriever, q, 3);
    console.log(`Query: "${q}"`);
    docs.forEach((d, i) => {
      console.log(`  [${i + 1}] ${d.pageContent.slice(0, 120)}...`);
    });
    console.log("");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});



// data - unstructured data - pricing.txt
// index - Memory ?! 
