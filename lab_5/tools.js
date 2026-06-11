import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TavilySearch } from "@langchain/tavily";

const GEOCODING_BASE = "https://geocoding-api.open-meteo.com/v1/search";
const REST_COUNTRIES_BASE = "https://restcountries.com/v3.1";

/** UI + prompt metadata (single source of truth). */
export const TOOL_CATALOG = [
  {
    id: "flight_finder",
    name: "Flight Finder",
    icon: "✈️",
    category: "travel",
    description: "Search flights, prices, and airlines between cities via web search.",
    requiresEnv: "TAVILY_API_KEY",
  },
  {
    id: "currency_exchange",
    name: "Currency Exchange",
    icon: "💱",
    category: "finance",
    description: "Convert USD prices to Israeli New Shekel (NIS/ILS). Rate: 1 USD ≈ 3.2 NIS.",
  },
  {
    id: "geocode_city",
    name: "Geocode City",
    icon: "📍",
    category: "maps",
    description: "Resolve a city name to latitude/longitude for map display.",
  },
  {
    id: "country_flag",
    name: "Country Flag",
    icon: "🏳️",
    category: "maps",
    description: "Get a PNG flag image URL for a country (for map markers).",
  },
];

let webSearchInstance = null;

function getWebSearch() {
  if (webSearchInstance) return webSearchInstance;
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return null;
  webSearchInstance = new TavilySearch({
    maxResults: 8,
    topic: "general",
    searchDepth: "advanced",
    includeAnswer: "advanced",
    chunksPerSource: 3,
    tavilyApiKey: apiKey,
  });
  return webSearchInstance;
}

export async function fetchCoordinates(name) {
  const params = new URLSearchParams({
    name: name.trim(),
    count: "1",
    language: "en",
    format: "json",
  });
  const res = await fetch(`${GEOCODING_BASE}?${params}`);
  if (!res.ok) throw new Error(`Geocoding API error: ${res.status}`);
  const data = await res.json();
  const results = data.results;
  if (!results?.length) return null;
  const first = results[0];
  return {
    lat: first.latitude,
    lon: first.longitude,
    long: first.longitude,
    name: first.name,
    country: first.country ?? "",
  };
}

export async function fetchCountryFlag(place) {
  const trimmed = place.trim();
  if (!trimmed) return null;

  const tryFetch = async (path) => {
    const res = await fetch(`${REST_COUNTRIES_BASE}/${path}/${encodeURIComponent(trimmed)}?fields=name,flags`);
    if (!res.ok) return null;
    const data = await res.json();
    const entry = Array.isArray(data) ? data[0] : data;
    if (!entry?.flags?.png) return null;
    return {
      country: entry.name?.common ?? trimmed,
      flag: entry.flags.png,
    };
  };

  return (await tryFetch("name")) ?? (await tryFetch("alpha"));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(baseIso, days) {
  const d = new Date(`${baseIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Dates to try: user date first, then today and next days. */
function candidateSearchDates(requestedDate) {
  const ordered = [];
  if (requestedDate?.trim()) ordered.push(requestedDate.trim());
  const today = todayIso();
  for (let i = 0; i < 14; i++) ordered.push(addDaysIso(today, i));
  return [...new Set(ordered)];
}

function buildFlightQuery(origin, destination, date) {
  return `all direct and nonstop flights ${origin} to ${destination} on ${date} every airline flight number departure arrival time price`;
}

function buildConnectingFlightQuery(origin, destination, date) {
  return `${origin} to ${destination} ${date} connecting flights 1-stop options Turkish Airlines Emirates Lufthansa Qatar flight numbers departure arrival prices`;
}

function mergeFlightSearchParts(parts, date) {
  const answers = parts.map((p) => p.answer).filter(Boolean);
  const results = [];
  const seenUrls = new Set();
  for (const part of parts) {
    for (const row of part.results ?? []) {
      if (row.url && seenUrls.has(row.url)) continue;
      if (row.url) seenUrls.add(row.url);
      results.push(row);
    }
  }
  return {
    answer: answers.join("\n\n---\n\n"),
    results,
    searchedDate: date,
    query: parts.map((p) => p.query).filter(Boolean).join(" | "),
  };
}

function flightSearchText(data) {
  const answer = data?.answer ?? "";
  const snippets = (data?.results ?? []).map((r) => `${r.title ?? ""} ${r.content ?? ""}`).join(" ");
  return `${answer} ${snippets}`;
}

function hasScheduleData(data) {
  const text = flightSearchText(data);
  return /\b\d{1,2}:\d{2}\b/.test(text) && /\b([A-Z]{2})\s?\d{1,4}\b|flight/i.test(text);
}

async function invokeFlightSearch(webSearch, query) {
  const raw = await webSearch.invoke({ query });
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return { answer: raw, results: [] };
    }
  }
  return raw;
}

async function searchFlightsForDate(webSearch, origin, destination, date) {
  const queries = [
    buildFlightQuery(origin, destination, date),
    buildConnectingFlightQuery(origin, destination, date),
  ];
  const parts = await Promise.all(
    queries.map(async (query) => ({ query, ...(await invokeFlightSearch(webSearch, query)) })),
  );
  return mergeFlightSearchParts(parts, date);
}

const flightFinder = tool(
  async ({ origin, destination, date }) => {
    const webSearch = getWebSearch();
    if (!webSearch) {
      return JSON.stringify({
        error:
          "Flight search unavailable: set TAVILY_API_KEY in lab_5/.env (https://app.tavily.com).",
      });
    }

    const requestedDate = date?.trim() || null;
    const dates = candidateSearchDates(requestedDate);
    let lastResult = null;

    for (let i = 0; i < dates.length; i++) {
      const searchDate = dates[i];
      try {
        const data = await searchFlightsForDate(webSearch, origin, destination, searchDate);
        lastResult = data;
        if (hasScheduleData(data)) {
          const usedFallback = Boolean(requestedDate && searchDate !== requestedDate);
          return JSON.stringify({
            ...data,
            requestedDate,
            searchedDate: searchDate,
            usedFallback,
            fallbackNote: usedFallback
              ? `No schedule found for ${requestedDate}; showing nearest available date ${searchDate}.`
              : null,
          });
        }
      } catch (err) {
        lastResult = { error: err.message || String(err), searchedDate: searchDate };
      }
      if (i >= 6) break;
    }

    return JSON.stringify({
      ...(lastResult ?? {}),
      requestedDate,
      searchedDate: lastResult?.searchedDate ?? requestedDate ?? todayIso(),
      usedFallback: Boolean(requestedDate && lastResult?.searchedDate !== requestedDate),
      warning: "Limited schedule data found for requested and nearby dates.",
    });
  },
  {
    name: "flight_finder",
    description:
      "Search all flight options between cities for a specific travel date (YYYY-MM-DD). If no schedule exists for that date, automatically searches nearest dates from today. Returns flight numbers, departure/arrival dates and times, prices, and airlines.",
    schema: z.object({
      origin: z.string().describe("Departure city or airport (e.g. Tel Aviv)"),
      destination: z.string().describe("Arrival city or airport (e.g. Tokyo)"),
      date: z.string().optional().describe("Travel date from user request (YYYY-MM-DD). Always pass when user mentions a date."),
    }),
  },
);

const currencyExchange = tool(({ priceInDollar }) => {
  const price = parseFloat(priceInDollar);
  if (Number.isNaN(price)) {
    return JSON.stringify({ error: "Invalid price. Provide a numeric USD value." });
  }
  const priceInNIS = Math.round(price * 3.2);
  return JSON.stringify({
    usd: price,
    nis: priceInNIS,
    formatted: `${price} USD = ${priceInNIS} NIS/ILS`,
  });
}, {
  name: "currency_exchange",
  description:
    "Convert USD to NIS/ILS. Use when the user asks for shekels or when displaying flight prices in Israeli currency.",
  schema: z.object({
    priceInDollar: z.string().describe("Price in US Dollars"),
  }),
});

const geocodeCity = tool(
  async ({ city }) => {
    try {
      const coords = await fetchCoordinates(city);
      if (!coords) {
        return JSON.stringify({ error: `No coordinates found for "${city}".` });
      }
      return JSON.stringify(coords);
    } catch (err) {
      return JSON.stringify({ error: err.message || String(err) });
    }
  },
  {
    name: "geocode_city",
    description:
      "Get latitude and longitude for a city. Use for origin/destination map coordinates in the JSON response.",
    schema: z.object({
      city: z.string().describe("City name to geocode (e.g. Tokyo)"),
    }),
  },
);

const countryFlag = tool(
  async ({ place }) => {
    try {
      const result = await fetchCountryFlag(place);
      if (!result) {
        return JSON.stringify({ error: `No flag found for "${place}".` });
      }
      return JSON.stringify(result);
    } catch (err) {
      return JSON.stringify({ error: err.message || String(err) });
    }
  },
  {
    name: "country_flag",
    description:
      "Get PNG flag URL for a country. Use for from.flag and to.flag fields in the final JSON response.",
    schema: z.object({
      place: z.string().describe("Country or city name (e.g. Japan, Israel)"),
    }),
  },
);

export const AGENT_TOOLS = [flightFinder, currencyExchange, geocodeCity, countryFlag];

export function getToolCatalogForApi() {
  return TOOL_CATALOG.map((meta) => ({
    ...meta,
    configured:
      meta.requiresEnv ? Boolean(process.env[meta.requiresEnv]?.trim()) : true,
  }));
}

export function buildToolsPromptSection() {
  return TOOL_CATALOG.map((t) => `- ${t.id}: ${t.description}`).join("\n");
}

function contentForTrace(toolName, content) {
  const text = typeof content === "string" ? content : JSON.stringify(content);
  if (toolName === "flight_finder") {
    return text.length > 500 ? `${text.slice(0, 500)}…` : text;
  }
  return text;
}

/** Extract tool calls/results from LangChain agent messages for API + UI. */
export function extractToolTrace(messages = []) {
  const trace = [];
  const pending = new Map();

  for (const msg of messages) {
    const role = (msg._getType?.() ?? msg.constructor?.name ?? "").toLowerCase();

    if (role.includes("ai")) {
      const toolCalls = msg.tool_calls ?? msg.additional_kwargs?.tool_calls ?? [];
      for (const tc of toolCalls) {
        const id = tc.id ?? `${tc.name}-${trace.length}`;
        const name = tc.name ?? tc.function?.name ?? "unknown";
        let args = tc.args;
        if (args === undefined && tc.function?.arguments) {
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {
            args = tc.function.arguments;
          }
        }
        const meta = TOOL_CATALOG.find((t) => t.id === name);
        const entry = {
          id,
          name,
          label: meta?.name ?? name,
          icon: meta?.icon ?? "🔧",
          args: args ?? {},
          result: null,
        };
        pending.set(id, entry);
        trace.push(entry);
      }
    }

    if (role.includes("tool")) {
      const id = msg.tool_call_id ?? msg.id;
      const name = msg.name ?? "tool";
      let entry = id ? pending.get(id) : null;
      if (!entry) {
        const meta = TOOL_CATALOG.find((t) => t.id === name);
        entry = {
          id: id ?? `tool-${trace.length}`,
          name,
          label: meta?.name ?? name,
          icon: meta?.icon ?? "🔧",
          args: {},
          result: null,
        };
        trace.push(entry);
      }
      entry.result = contentForTrace(entry.name, msg.content);
    }
  }

  return trace;
}
