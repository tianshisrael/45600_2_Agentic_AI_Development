#!/usr/bin/env node
/**
 * Lab 4 – RAG + Construction pricing agent
 *
 * Usage:
 *   node index.js <path-to-construction-image>
 *   node index.js                    # runs with sample image path if you add one
 *
 * Requires: OPENAI_API_KEY or OPENROUTER_API_KEY in .env
 * Pricing file: data/pricing.txt (loaded into RAG in memory)
 */

import "dotenv/config";
import path from "path";
import { runConstructionPricingAgent } from "./agents/next/construction-pricing-agent.js";

async function main() {
  const imagePath = process.argv[2];

  if (!imagePath) {
    console.log(`
Usage: node index.js <path-to-construction-image>

Example:
  node index.js ./samples/floorplan-marked.jpg

The agent will:
  1. Load the pricing file (data/pricing.txt) into an in-memory RAG pipeline
  2. Load your image and use a vision model to identify marked work (walls to remove, bathroom demo, etc.)
  3. Match items to the pricing list and return a cost breakdown

Environment: set OPENAI_API_KEY or OPENROUTER_API_KEY in .env
`);
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), imagePath);
  console.log("Image:", resolvedPath);
  console.log("Loading pricing into RAG and analyzing image...\n");

  try {
    const result = await runConstructionPricingAgent({
      imagePath: resolvedPath,
      userPrompt:
        "Identify all demolition, removal, and rebuild work marked in this image and price each item using the pricing reference.",
    });
    console.log("--- Pricing breakdown ---\n");
    console.log(result);
  } catch (err) {
    console.error("Error:", err.message);
    if (err.message?.includes("OPENAI") || err.message?.includes("OPENROUTER")) {
      console.error("Ensure OPENAI_API_KEY or OPENROUTER_API_KEY is set in .env");
    }
    process.exit(1);
  }
}

main();
