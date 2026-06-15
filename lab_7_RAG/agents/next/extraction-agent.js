/**
 * Future: Extraction agent – analyzes a construction image and extracts
 * a structured list of work items (walls to remove, bathroom demo, etc.)
 * without pricing. Output can be passed to the pricing agent or pricing-check agent.
 *
 * Usage (when implemented):
 *   const items = await runExtractionAgent({ imagePath });
 *   // then: runPricingCheckAgent({ items, retriever }) or runConstructionPricingAgent with items
 */

// Placeholder – implement when you add the second agent
export async function runExtractionAgent({ imagePath }) {
  throw new Error("Extraction agent not implemented yet. Use construction-pricing-agent for full flow.");
}
