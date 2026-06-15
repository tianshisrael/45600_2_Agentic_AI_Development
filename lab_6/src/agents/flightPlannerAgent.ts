import { ChatOpenRouter } from "@langchain/openrouter";
import { createAgent } from "langchain";
import { FLIGHT_PLANNER_PROMPT } from "../prompts/flightPlannerPrompt.js";
import { agentTools } from "../tools/index.js";

const model = new ChatOpenRouter({
  model: "openai/gpt-5.4",
  temperature: 0,
});

export const flightPlannerAgent = createAgent({
  model,
  tools: agentTools,
  systemPrompt: FLIGHT_PLANNER_PROMPT,
});

interface ToolCallLogEntry {
  iteration: number;
  name: string;
  args: Record<string, unknown>;
}

function getMessageRole(msg: {
  _getType?: () => string;
  constructor?: { name?: string };
}): string {
  return (msg._getType?.() ?? msg.constructor?.name ?? "Message").toLowerCase();
}

function extractToolCalls(msg: {
  tool_calls?: Array<{
    name?: string;
    args?: Record<string, unknown>;
    function?: { name?: string; arguments?: string };
  }>;
  additional_kwargs?: {
    tool_calls?: Array<{
      name?: string;
      args?: Record<string, unknown>;
      function?: { name?: string; arguments?: string };
    }>;
  };
}): ToolCallLogEntry[] {
  const raw = msg.tool_calls ?? msg.additional_kwargs?.tool_calls ?? [];
  if (!Array.isArray(raw)) return [];

  return raw.map((tc) => {
    const name = tc.name ?? tc.function?.name ?? "unknown";
    let args = tc.args;
    if (args === undefined && tc.function?.arguments) {
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        args = { raw: tc.function.arguments };
      }
    }
    return { name, args: (args ?? {}) as Record<string, unknown>, iteration: 0 };
  });
}

/** Print a compact summary: iterations, tool calls, and payloads. */
export function printAgentRunSummary(result: {
  messages?: Array<{
    _getType?: () => string;
    constructor?: { name?: string };
    tool_calls?: Array<{
      name?: string;
      args?: Record<string, unknown>;
      function?: { name?: string; arguments?: string };
    }>;
    additional_kwargs?: {
      tool_calls?: Array<{
        name?: string;
        args?: Record<string, unknown>;
        function?: { name?: string; arguments?: string };
      }>;
    };
  }>;
}): void {
  const messages = result?.messages ?? [];
  let iterations = 0;
  const toolCallLog: ToolCallLogEntry[] = [];
  let toolResultCount = 0;

  for (const msg of messages) {
    const role = getMessageRole(msg);

    if (role.includes("ai")) {
      iterations += 1;
      for (const tc of extractToolCalls(msg)) {
        toolCallLog.push({ ...tc, iteration: iterations });
      }
    }

    if (role.includes("tool")) {
      toolResultCount += 1;
    }
  }

  console.log("\n========== AGENT RUN SUMMARY ==========");
  console.log(`Iterations (model turns): ${iterations}`);
  console.log(`Tool calls: ${toolCallLog.length}`);
  console.log(`Tool results received: ${toolResultCount}`);

  if (toolCallLog.length > 0) {
    console.log("\nTools called:");
    toolCallLog.forEach((tc, i) => {
      console.log(`  ${i + 1}. [iteration ${tc.iteration}] ${tc.name}`);
      console.log(`     payload: ${JSON.stringify(tc.args)}`);
    });
  } else {
    console.log("\nNo tools were called.");
  }

  console.log("========== END AGENT RUN SUMMARY ==========\n");
}

export async function runTravelPlanner(): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Missing OPENROUTER_API_KEY in environment.");
  }

  if (!process.env.TAVILY_API_KEY) {
    console.error(
      "Missing TAVILY_API_KEY. Get one at https://app.tavily.com and add to .env"
    );
  }

  const userInput = `Plan a 3-day trip from Tel Aviv to New-York. Style: food + culture, light walking. Budget: high. Interests: sails at rivers, small galleries, hidden viewpoints. Use the flight finder to check flights, show me prices in NIS/ILS`;

  const result = await flightPlannerAgent.invoke({
    messages: [{ role: "user", content: userInput }],
  });

  printAgentRunSummary(result);

  const lastMessage = result.messages[result.messages.length - 1];
  const content = lastMessage.content;
  return typeof content === "string" ? content : JSON.stringify(content);
}
