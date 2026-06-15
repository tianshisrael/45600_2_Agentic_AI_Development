import "dotenv/config";
import assert from "node:assert/strict";
import axios from "axios";
import { app } from "../server.js";

describe("POST /api/story", function () {
  this.timeout(120_000);

  /** @type {import("node:http").Server | undefined} */
  let server;
  /** @type {string | undefined} */
  let baseUrl;

  before(function () {
    if (!process.env.OPENROUTER_API_KEY?.trim()) {
      this.skip();
    }
    return new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(function () {
    return new Promise((resolve, reject) => {
      if (!server) {
        resolve();
        return;
      }
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("returns 200 and a story string for subject, mood, and lines", async function () {
    const { status, data } = await axios.post(`${baseUrl}/api/story`, {
      subject: "a friendly dragon",
      mood: "happy",
      lines: 3,
    });

    assert.equal(status, 200);
    assert.equal(typeof data.story, "string");
    assert.ok(data.story.trim().length > 0);
  });
});
