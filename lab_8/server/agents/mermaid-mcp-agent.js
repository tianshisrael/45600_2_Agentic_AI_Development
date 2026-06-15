/**
 * Mermaid MCP Agent: connects to the Mermaid MCP server (Streamable HTTP with auth)
 * and exposes its tools to a LangChain agent. Used as a router tool for diagram requests.
 *
 * Requires in .env: MCP_MERMAID_URL (e.g. https://mcp.mermaid.ai/mcp), MCP_MERMAID_AUTH (Bearer token).
 */
import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const MCP_MERMAID_URL = process.env.MCP_MERMAID_URL || "https://mcp.mermaid.ai/mcp";
const MCP_MERMAID_AUTH = process.env.MCP_MERMAID_AUTH || "";

function createModel() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openRouterKey) {
    return new ChatOpenAI({
      model: "openai/gpt-4o-mini",
      temperature: 0,
      configuration: { baseURL: "https://openrouter.ai/api/v1", apiKey: openRouterKey },
    });
  }
  if (openaiKey) {
    return new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
  }
  throw new Error("Set OPENAI_API_KEY or OPENROUTER_API_KEY in .env");
}

/**
 * Convert MCP tool inputSchema (JSON Schema) to a Zod object for LangChain.
 */
function mcpInputSchemaToZod(jsonSchema) {
  if (!jsonSchema || typeof jsonSchema !== "object") return z.object({});
  const props = jsonSchema.properties;
  const required = new Set(jsonSchema.required || []);
  if (!props || typeof props !== "object") return z.object({});
  const shape = {};
  for (const [key, prop] of Object.entries(props)) {
    if (!prop || typeof prop !== "object") {
      shape[key] = z.any().optional().nullable();
      continue;
    }
    let field = z.any();
    switch (prop.type) {
      case "string":
        field = z.string();
        break;
      case "number":
      case "integer":
        field = z.number();
        break;
      case "boolean":
        field = z.boolean();
        break;
      case "array":
        field = z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]));
        break;
      case "object":
        field = z.record(z.any());
        break;
      default:
        field = z.any();
    }
    if (!required.has(key)) field = field.optional().nullable();
    shape[key] = field;
  }
  return z.object(shape);
}

/**
 * Build LangChain tools from a connected MCP client (tools/list + tools/call).
 */
async function getMcpToolsAsLangChain(mcpClient) {
  const { tools } = await mcpClient.listTools();
  return tools.map((t) => {
    const name = t.name;
    const description = t.description ?? `Call MCP tool: ${name}`;
    const schema = mcpInputSchemaToZod(t.inputSchema);
    return new DynamicStructuredTool({
      name,
      description,
      schema,
      func: async (args) => {
        const result = await mcpClient.callTool({ name, arguments: args });
        const texts = (result.content || [])
          .filter((c) => c.type === "text")
          .map((c) => c.text);
        return texts.join("\n") || JSON.stringify(result);
      },
    });
  });
}

const SYSTEM_PROMPT = `You are a diagram assistant with access to the Mermaid MCP server. Use the available tools to create, render, or work with Mermaid diagrams based on the user's request. Answer concisely and return diagram code or results as appropriate.`;

/**
 * Run the Mermaid MCP agent for one question. Connects to Mermaid MCP, fetches tools, runs agent.
 * @param {string} question - User question (e.g. "Draw a flowchart for login" or "Generate a sequence diagram for API call")
 * @returns {Promise<{ answer: string, error?: string }>}
 */
export async function runMermaidMcpAgent(question) {
  if (!MCP_MERMAID_AUTH) {
    return {
      answer: "Mermaid MCP is not configured. Set MCP_MERMAID_URL and MCP_MERMAID_AUTH in .env (see .env.example).",
      error: "MCP_MERMAID_AUTH not set",
    };
  }

  const requestInit = {
    headers: {
      Authorization: MCP_MERMAID_AUTH,
      "Content-Type": "application/json",
    },
  };

  const transport = new StreamableHTTPClientTransport(new URL(MCP_MERMAID_URL), { requestInit });
  const client = new Client(
    { name: "lab9-2-mermaid-agent", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
  } catch (err) {
    return {
      answer: `Could not connect to Mermaid MCP: ${err.message}. Check MCP_MERMAID_URL and MCP_MERMAID_AUTH.`,
      error: err.message,
    };
  }

  try {
    const tools = await getMcpToolsAsLangChain(client);
    if (!tools.length) {
      return { answer: "Mermaid MCP server reported no tools." };
    }

    const llm = createModel();
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", SYSTEM_PROMPT],
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);
    const agent = createToolCallingAgent({ llm, tools, prompt });
    const executor = new AgentExecutor({
      agent,
      tools,
      verbose: Boolean(process.env.VERBOSE),
      maxIterations: 10,
      returnIntermediateSteps: true,
    });

    const result = await executor.invoke({ input: question });
    let answer = (result.output ?? "").trim();
    if (!answer && result.intermediateSteps?.length) {
      const lastStep = result.intermediateSteps[result.intermediateSteps.length - 1];
      const observation = lastStep?.[1];
      if (typeof observation === "string" && observation.trim()) answer = observation.trim();
    }
    return { answer };
  } finally {
    await transport.close();
  }
}
