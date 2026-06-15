#!/usr/bin/env node
/**
 * Reads a newline-delimited text file where each line is JSON,
 * renames the "timestamp" key to "datetime_timestamp", and writes the result.
 *
 * Usage:
 *   node convert-timestamp-key.js <input.txt> [output.txt]
 *
 * If output is omitted, writes to <input>-converted.txt
 */

const fs = require("fs");
const path = require("path");

const inputPath = process.argv[2];
const outputPath =
  process.argv[3] ||
  (inputPath
    ? inputPath.replace(/(\.[^./\\]+)?$/, "-converted$1")
    : null);

if (!inputPath) {
  console.error(
    "Usage: node convert-timestamp-key.js <input.txt> [output.txt]"
  );
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, "utf8");
const endsWithNewline = raw.endsWith("\n");
const lines = raw.split(/\r?\n/);

const convertedLines = lines.map((line, index) => {
  const trimmed = line.trim();
  if (!trimmed) {
    return "";
  }

  let obj;
  try {
    obj = JSON.parse(trimmed);
  } catch (err) {
    throw new Error(
      `Invalid JSON on line ${index + 1}: ${err.message}`
    );
  }

  if (
    obj !== null &&
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    Object.prototype.hasOwnProperty.call(obj, "timestamp")
  ) {
    obj.datetime_timestamp = obj.timestamp;
    delete obj.timestamp;
  }

  return JSON.stringify(obj);
});

let output = convertedLines.join("\n");
if (endsWithNewline) {
  output += "\n";
}

fs.writeFileSync(outputPath, output, "utf8");
console.log(`Wrote ${convertedLines.filter(Boolean).length} line(s) to ${path.resolve(outputPath)}`);


