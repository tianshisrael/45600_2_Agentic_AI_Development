import "dotenv/config";
import express from "express";
import cors from "cors";
import { flightPlannerAgent, printAgentRunSummary } from "./src/agents/flightPlannerAgent.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  try {
    const { message, departure, destination, style, budget, interests } =
      req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    let fullMessage = message;
    if (departure || destination || style || budget || interests) {
      fullMessage = `Plan a 3-day trip.\n\n`;
      if (departure) fullMessage += `Departure city: ${departure}\n`;
      if (destination) fullMessage += `Destination city: ${destination}\n`;
      if (style) fullMessage += `Travel style: ${style}\n`;
      if (budget) fullMessage += `Budget level: ${budget}\n`;
      if (interests) fullMessage += `Special interests: ${interests}\n`;
      fullMessage += `\nAdditional request: ${message}`;
    }

    const result = await flightPlannerAgent.invoke({
      messages: [{ role: "user", content: fullMessage }],
    });

    printAgentRunSummary(result);

    const lastMessage = result.messages[result.messages.length - 1];
    const responseContent =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    res.json({
      success: true,
      response: JSON.parse(responseContent),
    });
  } catch (error) {
    const err = error as Error;
    console.error("Error processing chat request:", err);
    res.status(500).json({
      success: false,
      error: "Failed to process chat request",
      details: err.message,
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Travel Planner API is running" });
});

app.listen(PORT, () => {
  console.log(`🚀 Travel Planner API server running on http://localhost:${PORT}`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`💚 Health endpoint: http://localhost:${PORT}/api/health`);
});
