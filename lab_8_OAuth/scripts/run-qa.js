#!/usr/bin/env node
/**
 * Run OAuth Q&A agent (delegates to agent/agent.js).
 *
 *   node scripts/run-qa.js "What is OAuth?"
 *   node scripts/run-qa.js
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const agentPath = path.join(__dirname, "..", "agent", "agent.js");

const child = spawn(process.execPath, [agentPath, ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: path.join(__dirname, ".."),
});

child.on("exit", (code) => process.exit(code ?? 0));
