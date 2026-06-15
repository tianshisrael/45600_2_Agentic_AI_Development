/**
 * Helpers for image input (e.g. construction floor plan / markup).
 * Used by the construction pricing agent to send images to a vision model.
 */

import fs from "fs";
import path from "path";

/**
 * Detect MIME type from file extension.
 * @param {string} filePath
 * @returns {string}
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return mime[ext] || "image/jpeg";
}

/**
 * Read image file and return as base64 data URL for vision APIs.
 * @param {string} imagePath - Path to image file (jpg, png, etc.)
 * @returns {{ base64: string, mimeType: string }}
 */
export function imageToBase64DataUrl(imagePath) {
  const absolutePath = path.isAbsolute(imagePath) ? imagePath : path.resolve(process.cwd(), imagePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Image file not found: ${absolutePath}`);
  }
  const buffer = fs.readFileSync(absolutePath);
  const base64 = buffer.toString("base64");
  const mimeType = getMimeType(absolutePath);
  return {
    base64,
    mimeType,
    dataUrl: `data:${mimeType};base64,${base64}`,
  };
}
