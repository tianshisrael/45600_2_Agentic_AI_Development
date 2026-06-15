import "dotenv/config";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import axios from "axios";
import express from "express";
import {
  runStoryTeller,
  validateStoryRequest,
  StoryRequestValidationError,
} from "./storyTeller.js";
import { runExtractorAgent, ExtractorError } from "./extractorAgent.js";

const COUNTRIES_API_URL =
  "https://restcountries.com/v3.1/all?fields=name,capital,currencies";
import cors from "cors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));



const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors()); 

app.use(express.json({ limit: "32kb" }));
app.use(express.static(__dirname));

app.get("/healthcheck", (_req, res) => {
  console.log("Health check request", new Date().toISOString());
  res.json({ status: "ok" });
});

app.get("/countries", async (_req, res) => {
  try {
    const { data } = await axios.get(COUNTRIES_API_URL);
    res.json(data);
  } catch (err) {
    const status = err.response?.status ?? 502;
    const message = err.response?.data ?? err.message;
    res.status(status).json({ error: message });
  }
});

app.post("/api/story", async (req, res) => {
  console.log("request started")
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing API KEY - OPENROUTER_API_KEY");
  }

  let input;
  try {
    input = validateStoryRequest(req.body);
  } catch (err) {
    if (err instanceof StoryRequestValidationError) {
      console.error("Story request validation failed:", {
        message: err.message,
        details: err.details,
      });
      res.status(400).json({ error: err.message, details: err.details });
      return;
    }
    console.error("Story request validation failed:", err);
    res.status(400).json({ error: err?.message || String(err) });
    return;
  }

  try {
    const result = await runStoryTeller(input);
    res.json(result);
  } catch (err) {
    const message = err?.message || String(err);
    res.status(500).json({ error: message });
  }
});

app.post("/api/story/chat", async (req, res) => {
  console.log("chat story request started");
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing API KEY - OPENROUTER_API_KEY");
  }

  const text = req.body?.text;
  const mockExtractor = req.body?.mockExtractor;

  try {
    const extracted = await runExtractorAgent(text, { mockResponse: mockExtractor });
    console.log("extracted", extracted);
    const result = await runStoryTeller({
      subject: extracted.subject,
      title: extracted.title,
      mood: extracted.mood,
      lines: extracted.lines,
      creativity: extracted.creativity,
    });
    res.json({ extracted, ...result });
  } catch (err) {
    if (err instanceof ExtractorError) {
      console.error("Extractor failed:", err.message);
      res.status(err.status).json({ error: err.message });
      return;
    }
    const message = err?.message || String(err);
    console.error("Chat story failed:", message);
    res.status(500).json({ error: message });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Somethng went wrong" });
});



export { app };

const isMainModule =
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(pathToFileURL(process.argv[1]));

if (isMainModule) {
  app.listen(port, () => {
    console.log(`Story teller API listening on http://localhost:${port}`);
    console.log(`GET /countries — proxy restcountries.com`); // remove this one 
    console.log(`POST /api/story — launch the kids story agent`);
    console.log(`POST /api/story/chat — free-text chat → extractor → story agent`);
    console.log(`GET / — story teller UI (index.html)`);
  });
}

