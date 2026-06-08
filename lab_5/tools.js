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
    maxResults: 5,
    topic: "general",
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

const flightFinder = tool(
  async ({ origin, destination, date }) => {
    const webSearch = getWebSearch();
    if (!webSearch) {
      return JSON.stringify({
        error:
          "Flight search unavailable: set TAVILY_API_KEY in lab_5/.env (https://app.tavily.com).",
      });
    }
    const query = date
      ? `flights from ${origin} to ${destination} on ${date}`
      : `flights from ${origin} to ${destination}`;
    const results = await webSearch.invoke({ query });
    return typeof results === "string" ? results : JSON.stringify(results);
  },
  {
    name: "flight_finder",
    description:
      "Search for flight options between cities. Use this to find available flights, prices, and airlines when planning travel.",
    schema: z.object({
      origin: z.string().describe("Departure city or airport (e.g. Tel Aviv)"),
      destination: z.string().describe("Arrival city or airport (e.g. Tokyo)"),
      date: z.string().optional().describe("Travel date (e.g. 2025-03-15)"),
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
