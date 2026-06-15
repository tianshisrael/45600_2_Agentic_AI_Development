/**
 * Lab 9.2 Multi-Agent server: router uses each agent as a tool.
 * The LLM chooses which tool to call (HTML RAG or SQL agent); no if/else dispatch in code.
 */
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { routeWithTools } from "./agents/router-agent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "public");

const app = express();
app.use(cors());
app.use(express.json());
// let mermiad answer which avilable tools exists?
app.post("/query", async (req, res) => {
  const { question } = req.body || {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'question' in body" });
  }

  try {
    const result = await routeWithTools(question);
    console.log("result", result);
    console.log(question)
    return res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.get("/health", (_, res) => res.json({ ok: true }));

app.use(express.static(clientDist));

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log("Lab 9.2 Multi-Agent server (router with tools) on http://localhost:" + PORT));
