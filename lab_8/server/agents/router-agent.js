/**
 * Router Agent: each agent is a tool. The LLM chooses which tool to call
 * (answer_with_html_rag or run_sql_agent) instead of returning a route string.
 */
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { answerWithHtmlRag } from "./html-rag-agent.js";
import { runSqlAgent } from "./sql-agent-pipeline.js";
import { runMermaidMcpAgent } from "./mermaid-mcp-agent.js";

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

const ROUTER_SYSTEM_PROMPT = `You are a router. You have exactly three tools. Use exactly one to answer the user's question.

1. answer_with_html_rag: Use for simple questions about general knowledge, documentation, definitions, how-to, or content that can be answered from documentation/web pages. Examples: "What is SSO?", "How does login work?", "What are the project guidelines?"

2. run_sql_agent: Use for questions that require querying a database (lists, counts, who has what, filtering data). Examples: "How many users?", "List all permissions", "Which users have permission X?"

3. use_mermaid_diagram: Use when the user wants to create, draw, or generate a diagram (flowchart, sequence diagram, class diagram, etc.) or work with Mermaid diagrams. Examples: "Draw a flowchart for login", "Create a sequence diagram for this API", "Generate a Mermaid diagram of the architecture."

Call exactly one tool with the user's question.`;

/**
 * Build tools that wrap the HTML RAG and SQL agents. Each returns the full API response shape.
 * @returns {{ tools: import("@langchain/core/tools").StructuredToolInterface[], toolsByName: Record<string, import("@langchain/core/tools").StructuredToolInterface> }}
 */
function createRouterTools() {
  const answerWithHtmlRagTool = new DynamicStructuredTool({
    name: "answer_with_html_rag",
    description:
      "Answers simple or documentation questions using retrieved HTML/content. Use for: What is X?, How does Y work?, definitions, project guidelines, general knowledge from docs.",
    schema: z.object({
      question: z.string().describe("The user's question to answer from documentation"),
    }),
    func: async ({ question }) => {
      const answer = await answerWithHtmlRag(question);
      return {
        route: "html_rag",
        answer,
        sql: null,
        rows: null,
        rowCount: null,
        error: null,
      };
    },
  });

  const runSqlAgentTool = new DynamicStructuredTool({
    name: "run_sql_agent",
    description:
      "Answers database/data questions by generating and running SQL. Use for: counts, lists, filtering (e.g. How many users?, List permissions, Which users have X?).",
    schema: z.object({
      question: z.string().describe("The user's question to answer using the database"),
    }),
    func: async ({ question }) => {
      const result = await runSqlAgent(question);
      return {
        route: "sql_agent",
        answer: result.answer,
        sql: result.sql,
        rows: result.rows,
        rowCount: result.rowCount,
        error: result.error,
      };
    },
  });

  const useMermaidDiagramTool = new DynamicStructuredTool({
    name: "use_mermaid_diagram",
    description:
      "Creates or generates Mermaid diagrams (flowcharts, sequence diagrams, class diagrams, etc.). Use when the user asks to draw, create, or generate a diagram.",
    schema: z.object({
      question: z.string().describe("The user's request for a diagram (e.g. 'Draw a flowchart for login')"),
    }),
    func: async ({ question }) => {
      const { answer, error } = await runMermaidMcpAgent(question);
      return {
        route: "mermaid_diagram",
        answer,
        sql: null,
        rows: null,
        rowCount: null,
        error: error ?? null,
      };
    },
  });

  const tools = [answerWithHtmlRagTool, runSqlAgentTool, useMermaidDiagramTool];
  const toolsByName = Object.fromEntries(tools.map((t) => [t.name, t]));
  return { tools, toolsByName };
}

/**
 * Route the question by invoking the router model with tools; execute the chosen tool and return its result.
 * @param {string} question
 * @returns {Promise<{ route: string, answer: string, sql: string | null, rows: any[] | null, rowCount: number | null, error: string | null }>}
 */
export async function routeWithTools(question) {
  const { tools, toolsByName } = createRouterTools();
  const model = createModel().bindTools(tools);

  const messages = [
    new SystemMessage({ content: ROUTER_SYSTEM_PROMPT }),
    new HumanMessage({ content: question }),
  ];

  const response = await model.invoke(messages);
  const toolCalls = response.tool_calls ?? response.additional_kwargs?.tool_calls ?? [];

  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    const tc = toolCalls[0];
    const name = tc.name ?? tc.function?.name ?? "";
    let args = tc.args;
    if (args === undefined && tc.function?.arguments != null) {
      try {
        args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
      } catch {
        args = {};
      }
    }
    args = args ?? {};
    const tool = toolsByName[name];
    if (tool) {
      const result = await tool.invoke(args);
      return result;
    }
  }

  // Fallback: no tool call (e.g. model replied in text) — use HTML RAG as default
  const answer = await answerWithHtmlRag(question);
  return {
    route: "html_rag",
    answer,
    sql: null,
    rows: null,
    rowCount: null,
    error: null,
  };
}
