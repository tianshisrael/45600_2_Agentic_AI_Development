#!/usr/bin/env node
/**
 * Run the pricing Q&A agent separately from the rest of the agents.
 * Uses the same RAG pipeline (data/pricing.txt); you send questions and get answers about job pricing.
 *
 * Usage:
 *   node scripts/run-pricing-qa.js "How much to remove a load-bearing wall?"
 *   node scripts/run-pricing-qa.js   # interactive: type questions, one per line
 *
 * Requires: OPENAI_API_KEY or OPENROUTER_API_KEY in .env
 */
// node scripts/run-pricing-qa.js "How much to remove a load-bearing wall?"
import "dotenv/config";
import readline from "readline";
import { createPricingQAAgent } from "../agents/pricing-qa-agent.js";

async function main() {
  const questionArg = process.argv[2];

  console.log("Loading RAG from data/pricing.txt...");
  const agent = await createPricingQAAgent();
  console.log("Pricing Q&A agent ready.\n");

  if (questionArg) {
    const answer = await agent.answer(questionArg);
    console.log("--- Answer ---\n");
    console.log(answer);
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = () => {
    rl.question("Your question (or Ctrl+C to exit): ", async (line) => {
      const q = line?.trim();
      if (!q) {
        ask();
        return;
      }
      try {
        const answer = await agent.answer(q);
        console.log("\n--- Answer ---\n");
        console.log(answer);
        console.log("");
      } catch (err) {
        console.error("Error:", err.message);
      }
      ask();
    });
  };
  console.log("Ask anything about construction/renovation pricing. Examples:");
  console.log('  "How much to remove a bathroom?"');
  console.log('  "Cost to rebuild a wall per metre?"');
  console.log("");
  ask();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
