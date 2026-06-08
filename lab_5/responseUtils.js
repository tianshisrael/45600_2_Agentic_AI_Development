import { fetchCoordinates, fetchCountryFlag } from "./tools.js";

const USD_TO_NIS = 3.2;

function isIsraelDeparture(departure = "", country = "") {
  const hint = `${departure} ${country}`.toLowerCase();
  return /israel|tel aviv|jerusalem|haifa|beer sheva|eilat|ben gurion/.test(hint);
}

function parseUsdAmount(priceStr) {
  if (!priceStr) return null;
  const text = String(priceStr);
  const match =
    text.match(/(?:US\$|USD|\$)\s*([\d,]+(?:\.\d+)?)/i) ??
    text.match(/([\d,]+(?:\.\d+)?)\s*(?:USD|US\$)/i);
  if (!match) return null;
  const value = Number.parseFloat(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

function formatNis(amount) {
  return `₪${Math.round(amount).toLocaleString("en-US")}`;
}

/** Add NIS equivalents when the trip departs from Israel. */
function enrichFlightPrices(flights, { departure = "", fromCountry = "" } = {}) {
  if (!isIsraelDeparture(departure, fromCountry)) return flights;

  return flights.map((flight) => {
    const usd = parseUsdAmount(flight.price);
    if (usd == null) return flight;

    const nis = formatNis(usd * USD_TO_NIS);
    return {
      ...flight,
      priceUsd: flight.price,
      priceNis: nis,
      price: `${flight.price} (≈ ${nis})`,
    };
  });
}

/** Strip markdown fences and parse JSON from model output. */
export function parseAgentJson(raw) {
  let text = String(raw ?? "").trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  const parsed = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Agent response must be a JSON object.");
  }
  return parsed;
}

function normalizePlace(place, fallbackName = "") {
  const base =
    typeof place === "object" && place !== null
      ? { ...place }
      : { name: String(place ?? fallbackName) };
  if (!base.name && fallbackName) base.name = fallbackName;
  return base;
}

/** Fill lat/long/flag when the model omitted them (uses geocode + flag APIs). */
function cleanAgentMessage(text) {
  return String(text ?? "")
    .replace(/\d+\.\s*[^\n]*\(open link\)[^\n]*/gi, "")
    .replace(/\(open link\)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function enrichTravelResponse(response, { departure = "", destination = "" } = {}) {
  const out = {
    message: cleanAgentMessage(
      typeof response.message === "string" ? response.message : "",
    ),
    flights: Array.isArray(response.flights) ? response.flights : [],
    from: normalizePlace(response.from, departure),
    to: normalizePlace(response.to, destination),
  };

  const pairs = [
    ["from", departure || out.from.name],
    ["to", destination || out.to.name],
  ];

  for (const [key, cityHint] of pairs) {
    const place = out[key];
    const city = (cityHint || place.name || "").trim();
    if (!city) continue;

    try {
      const geo = await fetchCoordinates(city);
      if (geo) {
        place.name = place.name || geo.name;
        if (place.lat == null && place.latitude == null) {
          place.lat = geo.lat;
          place.long = geo.lon;
          place.lon = geo.lon;
        }
        place.country = place.country || geo.country;
      }
    } catch (err) {
      console.warn(`Geocode failed for ${city}:`, err.message);
    }

    if (!place.flag) {
      try {
        const flagData = await fetchCountryFlag(place.country || city);
        if (flagData?.flag) {
          place.flag = flagData.flag;
          place.country = place.country || flagData.country;
        }
      } catch (err) {
        console.warn(`Flag lookup failed for ${city}:`, err.message);
      }
    }
  }

  out.flights = enrichFlightPrices(out.flights, {
    departure,
    fromCountry: out.from.country,
  });

  return out;
}
