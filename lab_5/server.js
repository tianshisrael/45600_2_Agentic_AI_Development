import "dotenv/config";
import express from "express";
import cors from "cors";
import { agent, extractToolTrace } from "./agent_new.js";
import { getToolCatalogForApi } from "./tools.js";
import { parseAgentJson, enrichTravelResponse } from "./responseUtils.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

app.get("/api/tools", (_req, res) => {
  const tools = getToolCatalogForApi();
  res.json({ tools, count: tools.length });
});

// API endpoint for chat – ReAct agent with flight, currency, geocode, flag tools
app.post("/api/chat", async (req, res) => {
  try {
    const { message, departure, destination, style, budget, interests } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Build the message with parameters if provided
    let fullMessage = message;
    if (departure || destination || style || budget || interests) {
      fullMessage = `Plan a 3-day trip.\n\n`;
      if (departure) fullMessage += `Departure city: ${departure}\n`;
      if (destination) fullMessage += `Destination city: ${destination}\n`;
      if (style) fullMessage += `Travel style: ${style}\n`;
      if (budget) fullMessage += `Budget level: ${budget}\n`;
      if (interests) fullMessage += `Special interests: ${interests}\n`;
      if (/israel|tel aviv|jerusalem|haifa/i.test(departure ?? "")) {
        fullMessage += `Show flight prices in both USD and NIS/ILS (shekels).\n`;
      }
      fullMessage += `\nAdditional request: ${message}`;
    }

    const result = await agent.invoke({
      messages: [{ role: "user", content: fullMessage }],
    });
    const toolsUsed = extractToolTrace(result.messages);
    const lastMessage = result.messages[result.messages.length - 1];
    const responseContent =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    const parsed = parseAgentJson(responseContent);
    const response = await enrichTravelResponse(parsed, { departure, destination });

    res.json({
      success: true,
      response,
      toolsUsed,
    });
  } catch (error) {
    console.error("Error processing chat request:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process chat request",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Travel Planner API is running" });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Travel Planner API server running on http://localhost:${PORT}`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`💚 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Tools:  http://localhost:${PORT}/api/tools`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the old server (Task Manager / kill node) and run npm run dev again.`,
    );
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

// async function testTools() {
//   const result2hardcoded = await agent.invoke({
//     messages: [
//       // { role: "system", content: "RETURN A JSON STRUCTURE FROM THE LIST FLIGHTS" },
//       { role: "user", content: "what are the tools you have avilable to use?" }],
//   });
//   console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")
//   console.log(result2hardcoded)
//   console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")
  
// }
// testTools()
