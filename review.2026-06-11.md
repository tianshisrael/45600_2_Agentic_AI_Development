# Review: `lab_5/agent_new.js`

Date: 2026-06-11

## 🔴 Critical Issues

### Security: untrusted web content is passed directly into the agent

`flight_finder` sends user-controlled travel details to Tavily and returns raw search results directly back into the agent context. Web search results are untrusted LLM input and may contain prompt-injection instructions such as "ignore previous instructions" or malicious content that can influence the final answer.

Relevant area: `flightFinder` builds a free-text query, invokes Tavily, stringifies the complete result, and returns it without sanitization or source filtering.

Recommendation:
- Treat Tavily output as untrusted data.
- Extract only required flight fields before returning tool output to the model.
- Add source allow-listing or ranking rules if possible.
- Add prompt rules that explicitly mark tool results as untrusted, but do not rely on prompting alone.

### Security: raw tool output and tool payloads are logged

The code logs full Tavily results and tool-call payloads with `console.log(JSON.stringify(results))` and `printAgentRunSummary`. Travel requests may contain personal plans, dates, locations, budget, and preferences. In a server context, this creates avoidable privacy leakage.

Recommendation:
- Remove raw result logging from production paths.
- Log only metadata such as tool name, latency, result count, and sanitized error details.
- Gate detailed logs behind an explicit debug flag.

### Issues and bugs: missing API keys do not stop execution

`runTravelPlanner()` checks for `OPENROUTER_API_KEY` and `TAVILY_API_KEY`, but only logs errors because `process.exit(1)` is commented out. The agent can continue into runtime failures with unclear behavior.

Recommendation:
- Fail fast before constructing or invoking the agent when required keys are missing.
- Throw a clear configuration error that callers can handle.

## 🟡 Medium Issues

### Code quality: outbound HTTP uses `fetch` instead of Axios

`fetchCoordinates()` uses `fetch` for the Open-Meteo geocoding request. This conflicts with the workspace rule that outbound HTTP calls should use Axios only. The function is currently unused, but if it becomes active it will violate the project convention.

Recommendation:
- Replace `fetch` with Axios before using this function.
- Add Axios to `lab_5/package.json` if it is not already available.

### LangChain architecture: output JSON is prompt-only, not enforced

`FLIGHT_SYSTEM_PROMPT` asks the model to return valid JSON, but `agent.invoke()` does not enforce structured output with a schema or parser. The final response can still include invalid JSON, markdown fences, missing fields, or inconsistent flight objects.

Recommendation:
- Use structured output support or a Zod-based parser for the final response.
- Validate the final response before returning it to the caller.
- Add a repair or retry path when validation fails.

### Input validation: tool schemas are too permissive

The `flight_finder` schema accepts arbitrary strings for `origin`, `destination`, and `date`. `currency_exchange` accepts string prices but does not constrain format, range, currency, or maximum array length.

Recommendation:
- Require non-empty trimmed strings for cities.
- Validate date format with `z.string().date()` or a stricter regex.
- Validate price strings with numeric regex/range checks.
- Set maximum input lengths and array sizes to avoid oversized tool calls.

### Issues and bugs: hardcoded USD to NIS exchange rate

`USD_TO_NIS_RATE` is hardcoded to `3.2`. Currency conversion in user-facing travel planning will become inaccurate quickly and can mislead users.

Recommendation:
- Use a real exchange-rate API or clearly label the conversion as approximate and static.
- Include the rate timestamp if dynamic conversion is added.

### LangChain architecture: tools return large unstructured strings

`flight_finder` returns stringified search results instead of a normalized object. This increases token usage and makes the agent responsible for parsing noisy text.

Recommendation:
- Return compact structured data from tools.
- Normalize flight fields before they reach the model.
- Keep raw search results out of the agent context unless needed for debugging.

## 🔵 Low Issues

### Code quality: unused imports and constants

`jwt`, `ChatOpenAI`, `GEOCODING_BASE`, `fetchCoordinates`, and `REST_COUNTRIES_BASE` appear unused in `agent_new.js`. This makes the file harder to understand and suggests partially implemented features.

Recommendation:
- Remove unused code or move planned features behind clearly named TODO sections.
- Keep the agent file focused on active tools.

### Code quality: comments contain typos and stale notes

Several comments contain typos or unclear notes, such as `calude`, `sonet`, `currnecies`, `sepcification`, and `HIS IS AI RESULT`. These are minor but reduce maintainability.

Recommendation:
- Clean comments so they explain current behavior.
- Remove old experiment notes once the implementation direction is clear.

### Issues and bugs: standalone detection is fragile

`const isMain = process.argv[1]?.endsWith("agent_new.js");` can produce false positives for similarly named paths and is less robust than comparing the current module URL.

Recommendation:
- Use `import.meta.url` with `fileURLToPath` for reliable ESM main-module detection.

### Input validation: user input is currently hardcoded

`runTravelPlanner()` uses a hardcoded travel request. This is fine for a lab demo, but the exported function cannot accept runtime user input without editing source code.

Recommendation:
- Accept `userInput` as a function argument.
- Validate it before invoking the agent.
- Keep the hardcoded prompt only as a sample or test fixture.

### LangChain architecture: no agent execution limits are visible

The agent configuration does not show max iterations, timeout handling, or retry controls. Tool-using agents can loop, run slowly, or create expensive calls if not bounded.

Recommendation:
- Add execution limits appropriate for the LangChain version in use.
- Wrap tool calls with timeout/error handling.
- Return clear fallback messages when external services fail.
