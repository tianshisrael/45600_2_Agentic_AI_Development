import "dotenv/config";

import { ChatOpenRouter } from "@langchain/openrouter";
import { createAgent } from "langchain";

import { FLIGHT_SYSTEM_PROMPT } from "./prompts.js";
import { AGENT_TOOLS, extractToolTrace } from "./tools.js";

const model = new ChatOpenRouter({
  model: "openai/gpt-5.4",
  temperature: 0.2,
});

const agent = createAgent({
  model,
  tools: AGENT_TOOLS,
  systemPrompt: FLIGHT_SYSTEM_PROMPT,
});

export async function runTravelPlanner() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Missing OPENROUTER_API_KEY in environment.");
  }
  if (!process.env.TAVILY_API_KEY) {
    console.error(
      "Missing TAVILY_API_KEY. Get one at https://app.tavily.com and add to .env",
    );
  }

  const userInput =
    "Plan a 3-day trip from Tel Aviv to New-York. Style: food + culture, light walking. Budget: high. Interests: sails at rivers, small galleries, hidden viewpoints. Use the flight finder to check flights, show me prices in NIS/ILS";

  const result = await agent.invoke({
    messages: [{ role: "user", content: userInput }],
  });

  const trace = extractToolTrace(result.messages);
  console.log("\n========== TOOL TRACE ==========\n");
  for (const step of trace) {
    console.log(`${step.icon} ${step.label} (${step.name})`, step.args);
    if (step.result) console.log("  →", step.result);
  }
  console.log("========== END TOOL TRACE ==========\n");

  const lastMessage = result.messages[result.messages.length - 1];
  return lastMessage.content;
}

export { agent, extractToolTrace };

const isMain = process.argv[1]?.endsWith("agent_new.js");
if (isMain) {
  runTravelPlanner()
    .then((message) => {
      console.log("####### AI RESULT ########");
      console.log(message);
      console.log("####### AI RESULT ########");
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
