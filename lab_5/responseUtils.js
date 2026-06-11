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

const AIRLINE_IATA = [
  ["el al", "LY"],
  ["ethiopian", "ET"],
  ["cathay pacific", "CX"],
  ["turkish", "TK"],
  ["lufthansa", "LH"],
  ["swiss", "LX"],
  ["scandinavian", "SK"],
  ["etihad", "EY"],
  ["qatar", "QR"],
  ["emirates", "EK"],
  ["ana", "NH"],
  ["japan airlines", "JL"],
  ["air france", "AF"],
  ["british airways", "BA"],
  ["united", "UA"],
  ["delta", "DL"],
  ["american airlines", "AA"],
  ["klm", "KL"],
  ["iberia", "IB"],
  ["aegean", "A3"],
  ["flydubai", "FZ"],
];

const IATA_AIRLINE = Object.fromEntries(AIRLINE_IATA.map(([name, code]) => [code, name]));
const KNOWN_IATA = new Set(Object.keys(IATA_AIRLINE));

function airlineIataCode(airline = "") {
  const lower = airline.toLowerCase();
  for (const [needle, code] of AIRLINE_IATA) {
    if (lower.includes(needle)) return code;
  }
  const match = airline.match(/\b([A-Z]{2})\b/);
  return match?.[1] ?? null;
}

function parseFlightFinderResult(toolsUsed = []) {
  const finder = toolsUsed.find((t) => t.name === "flight_finder");
  if (!finder?.result) return null;
  try {
    return JSON.parse(finder.result);
  } catch {
    return null;
  }
}

function flightSearchCorpus(toolsUsed = []) {
  const data = parseFlightFinderResult(toolsUsed);
  if (!data) {
    const finder = toolsUsed.find((t) => t.name === "flight_finder");
    return finder?.result ? String(finder.result) : "";
  }
  const meta = [
    data.requestedDate ? `Requested date: ${data.requestedDate}` : "",
    data.searchedDate ? `Searched date: ${data.searchedDate}` : "",
    data.fallbackNote ?? "",
  ]
    .filter(Boolean)
    .join("\n");
  const answer = data.answer ? `Tavily answer:\n${data.answer}\n` : "";
  const snippets = (data.results ?? [])
    .map((r) => `${r.title ?? ""}\n${r.content ?? ""}`)
    .join("\n");
  return `${meta}\n${answer}${snippets}`;
}

function flightSearchMeta(toolsUsed = []) {
  const data = parseFlightFinderResult(toolsUsed);
  return {
    requestedDate: data?.requestedDate ?? null,
    searchedDate: data?.searchedDate ?? null,
    usedFallback: Boolean(data?.usedFallback),
  };
}

const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function isoFromParts(year, month, day) {
  if (!year || !month || !day) return null;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function inferYear(month, explicitYear, fallbackIso) {
  if (explicitYear) return Number(explicitYear);
  const fallbackYear = fallbackIso ? Number(fallbackIso.slice(0, 4)) : new Date().getFullYear();
  const fallbackMonth = fallbackIso ? Number(fallbackIso.slice(5, 7)) : new Date().getMonth() + 1;
  if (month < fallbackMonth) return fallbackYear + 1;
  return fallbackYear;
}

/** Parse "15 June 2026", "2026-06-15", "16 June" from text near dep/arr. */
function extractDateFromFragment(text, fallbackIso = null) {
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return isoFromParts(iso[1], iso[2], iso[3]);

  const dmy = text.match(/\b(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?\b/);
  if (dmy) {
    const month = MONTHS[dmy[2].toLowerCase()];
    if (month) {
      const year = inferYear(month, dmy[3], fallbackIso);
      return isoFromParts(year, month, dmy[1]);
    }
  }

  const mdy = text.match(/\b([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/);
  if (mdy) {
    const month = MONTHS[mdy[1].toLowerCase()];
    if (month) {
      const year = inferYear(month, mdy[3], fallbackIso);
      return isoFromParts(year, month, mdy[2]);
    }
  }

  return fallbackIso;
}

/** Parse "departs ... at 19:45" / "arrive ... at 13:20" from Tavily answer text. */
function extractScheduleFromAnswer(text, fallbackIso = null) {
  const dep =
    text.match(/depart(?:s|ure)?[^.]{0,120}?at\s+(\d{1,2}:\d{2})/i)?.[1] ??
    text.match(/departure[^.]{0,80}?(\d{1,2}:\d{2})/i)?.[1] ??
    null;
  const arr =
    text.match(/arriv(?:e|al|es)[^.]{0,120}?at\s+(\d{1,2}:\d{2})/i)?.[1] ??
    text.match(/land(?:s)?[^.]{0,80}?at\s+(\d{1,2}:\d{2})/i)?.[1] ??
    null;
  const flightNumber =
    text.match(/\bflight\s*(?:number\s*)?([A-Z]{2})\s*(\d{1,4})\b/i)?.[0]?.replace(
      /flight\s*(?:number\s*)?/i,
      "",
    ).trim() ??
    text.match(/\b([A-Z]{2})\s?(\d{2,4})\b/)?.[0]?.replace(/\s+/, "") ??
    null;

  const depFragment = text.match(/depart(?:s|ure)?[^.]{0,160}/i)?.[0] ?? text;
  const arrFragment = text.match(/arriv(?:e|al|es)[^.]{0,160}/i)?.[0] ?? text;
  const depDate = extractDateFromFragment(depFragment, fallbackIso) ?? extractDateFromFragment(text, fallbackIso);
  const arrDate =
    extractDateFromFragment(arrFragment, depDate ?? fallbackIso) ??
    (depDate && arr && dep && arr < dep ? addDayIso(depDate, 1) : depDate);

  return {
    dep,
    arr,
    depDate,
    arrDate,
    flightNumber: flightNumber?.replace(/([A-Z]{2})(\d+)/, "$1 $2"),
  };
}

function addDayIso(iso, days = 1) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function normalizeFlightNumber(value) {
  if (!value) return "";
  const m = String(value).match(/\b([A-Z]{2})\s*(\d{1,4})\b/i);
  if (!m) return String(value).trim().toUpperCase();
  return `${m[1].toUpperCase()} ${Number.parseInt(m[2], 10)}`;
}

function isLikelyFlightToken(code, num, window) {
  if (!KNOWN_IATA.has(code)) return false;
  if (!/^\d{1,4}$/.test(num)) return false;
  return /flight|depart|arriv|operat|airline|nonstop|stop|connect|via|route|fare|price/i.test(
    window,
  );
}

function airlineFromFlightNumber(flightNumber) {
  const code = normalizeFlightNumber(flightNumber).split(" ")[0];
  const name = IATA_AIRLINE[code];
  if (!name) return "";
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractFlightNumbersInChunk(chunk) {
  const nums = [];
  const seen = new Set();
  const regex = /\b([A-Z]{2})\s?(\d{1,4})\b/g;
  let match;
  while ((match = regex.exec(chunk)) !== null) {
    const code = match[1].toUpperCase();
    const num = match[2];
    if (!isLikelyFlightToken(code, num, chunk)) continue;
    const flightNumber = `${code} ${num}`;
    if (seen.has(flightNumber)) continue;
    seen.add(flightNumber);
    nums.push(flightNumber);
  }
  return nums;
}

function extractLayover(chunk) {
  const via = chunk.match(/\bvia\s+([A-Za-z][A-Za-z\s]*?)(?:\s*\((\w{3})\))?/i);
  if (via) {
    const city = via[1].trim();
    return via[2] ? `${city} (${via[2].toUpperCase()})` : city;
  }
  const layover = chunk.match(/layover[^.]{0,60}?(?:at\s+)?([A-Za-z][A-Za-z\s]*?\s*\(\w{3}\))/i);
  return layover?.[1]?.trim() ?? null;
}

function extractAirlineName(chunk, fallbackFlightNumber = "") {
  const named = chunk.match(
    /(El Al(?:\s+Israel)?(?:\s+Airlines)?|Turkish Airlines|Emirates|Lufthansa|Qatar Airways|Ethiopian Airlines|ANA|Japan Airlines)/i,
  );
  if (named) return named[1].replace(/\s+/g, " ").trim();
  return airlineFromFlightNumber(fallbackFlightNumber);
}

function splitItineraryChunks(text) {
  const chunks = [];
  for (const part of text.split(/\n---\n+/)) {
    const sentences = part.split(/(?<=[.!?])\s+/).filter(Boolean);
    let buffer = "";
    for (const sentence of sentences) {
      const startsAirline = /^(El Al|Turkish|Emirates|Lufthansa|Qatar|Ethiopian|ANA|Japan)/i.test(
        sentence,
      );
      if (startsAirline && buffer) {
        chunks.push(buffer.trim());
        buffer = sentence;
      } else {
        buffer = buffer ? `${buffer} ${sentence}` : sentence;
      }
    }
    if (buffer.trim()) chunks.push(buffer.trim());
  }
  return chunks.filter((c) => extractFlightNumbersInChunk(c).length > 0);
}

function buildSegments(flightNumbers, times, depDate, layover) {
  const segments = [];
  for (let i = 0; i < flightNumbers.length; i++) {
    const depTime = times[i * 2] ?? (i === 0 ? times[0] : null) ?? "Not listed";
    const arrTime = times[i * 2 + 1] ?? (i === flightNumbers.length - 1 ? times.at(-1) : null) ?? "Not listed";
    const segDepDate =
      i === 0
        ? depDate
        : segments[i - 1]?.arrivalDate ??
          (segments[i - 1]?.arrivalTime &&
          depTime !== "Not listed" &&
          segments[i - 1].arrivalTime > depTime
            ? addDayIso(depDate, 1)
            : depDate);
    let segArrDate = segDepDate;
    if (arrTime !== "Not listed" && depTime !== "Not listed" && arrTime < depTime) {
      segArrDate = addDayIso(segDepDate, 1);
    }
    segments.push({
      flightNumber: flightNumbers[i],
      airline: airlineFromFlightNumber(flightNumbers[i]),
      departureDate: segDepDate,
      departureTime: depTime,
      arrivalDate: segArrDate,
      arrivalTime: arrTime,
      departure: i === 0 ? null : layover,
      arrival: i === flightNumbers.length - 1 ? null : layover,
    });
  }
  return segments;
}

function parseItineraryChunk(chunk, fallbackDate, meta) {
  const flightNumbers = extractFlightNumbersInChunk(chunk);
  if (flightNumbers.length === 0) return null;

  const times = extractTimes(chunk);
  const depDate = extractDateFromFragment(chunk, fallbackDate) ?? fallbackDate;
  const schedule = extractScheduleFromAnswer(chunk, fallbackDate);
  const layover = extractLayover(chunk);
  const airline = extractAirlineName(chunk, flightNumbers[0]);
  const connecting =
    flightNumbers.length > 1 || /\bconnect|\d\s*stop|layover|via\b/i.test(chunk);

  if (connecting && flightNumbers.length > 1) {
    const segments = buildSegments(flightNumbers, times, depDate, layover);
    const first = segments[0];
    const last = segments[segments.length - 1];
    return {
      airline,
      flightNumber: flightNumbers.join(" · "),
      departureDate: first.departureDate ?? depDate,
      departureTime: first.departureTime ?? schedule.dep ?? "Not listed",
      arrivalDate: last.arrivalDate ?? schedule.arrDate ?? depDate,
      arrivalTime: last.arrivalTime ?? schedule.arr ?? "Not listed",
      stops: layover ? `1 stop · ${layover}` : `${flightNumbers.length - 1} stop(s)`,
      layover,
      segments,
      duration: normalizeDuration(chunk.match(/(\d+\s*h(?:our)?s?\s*\d+\s*m|\d+\s*h(?:our)?s?)/i)?.[0] ?? ""),
      price: "",
    };
  }

  const arrDate =
    schedule.arrDate ??
    (depDate && schedule.dep && schedule.arr && schedule.arr < schedule.dep
      ? addDayIso(depDate, 1)
      : depDate);

  return {
    airline,
    flightNumber: flightNumbers[0],
    departureDate: schedule.depDate ?? depDate,
    departureTime: schedule.dep ?? times[0] ?? "Not listed",
    arrivalDate: arrDate,
    arrivalTime: schedule.arr ?? times[1] ?? "Not listed",
    stops: "Nonstop",
    layover: null,
    segments: [],
    duration: normalizeDuration(chunk.match(/(\d+\s*h(?:our)?s?\s*\d+\s*m|\d+\s*h(?:our)?s?)/i)?.[0] ?? ""),
    price: "",
  };
}

/** Parse full itineraries (not isolated leg numbers) from Tavily corpus. */
function parseItinerariesFromCorpus(text, fallbackIso = null, meta = {}) {
  const chunks = splitItineraryChunks(text);
  const itineraries = chunks
    .map((chunk) => parseItineraryChunk(chunk, fallbackIso, meta))
    .filter(Boolean);

  if (itineraries.length > 0) return itineraries;

  const schedule = extractScheduleFromAnswer(text, fallbackIso);
  if (!schedule.flightNumber) return [];
  return [
    {
      airline: airlineFromFlightNumber(schedule.flightNumber),
      flightNumber: schedule.flightNumber,
      departureDate: schedule.depDate ?? fallbackIso,
      departureTime: schedule.dep ?? "Not listed",
      arrivalDate: schedule.arrDate ?? fallbackIso,
      arrivalTime: schedule.arr ?? "Not listed",
      stops: "Nonstop",
      layover: null,
      segments: [],
      duration: "",
      price: "",
    },
  ];
}

function itineraryToFlight(itinerary, meta) {
  const out = { ...itinerary };
  if (meta.usedFallback && !out.dateNote) {
    out.dateNote = meta.requestedDate
      ? `Schedule shown for ${meta.searchedDate} (nearest to requested ${meta.requestedDate})`
      : `Schedule shown for ${meta.searchedDate}`;
  }
  return out;
}

function splitCombinedFlightNumber(value = "") {
  return String(value)
    .split(/\s*[\/+·&]\s*|\s+and\s+/i)
    .map((part) => normalizeFlightNumber(part))
    .filter((part) => /^\w{2} \d{1,4}$/.test(part));
}

function ensureConnectingSegments(flight, fallbackDate) {
  const out = { ...flight };
  if (Array.isArray(out.segments) && out.segments.length > 1) {
    if (!out.stops || out.stops === "Nonstop") {
      out.stops = out.layover ? `1 stop · ${out.layover}` : "1+ stop(s)";
    }
    return out;
  }

  const legs = splitCombinedFlightNumber(out.flightNumber);
  if (legs.length <= 1) {
    out.stops = out.stops || "Nonstop";
    out.segments = [];
    return out;
  }

  const depDate = pickIsoDate(out.departureDate, fallbackDate) ?? fallbackDate;
  const segments = buildSegments(
    legs,
    [pickClockTime(out.departureTime), pickClockTime(out.arrivalTime)].filter(Boolean),
    depDate,
    out.layover,
  );

  if (segments.length > 1) {
    out.segments = segments;
    out.flightNumber = legs.join(" · ");
    if (!out.layover) out.layover = extractLayover(String(out.stops ?? ""));
    out.stops =
      out.stops && out.stops !== "Nonstop"
        ? out.stops
        : out.layover
          ? `1 stop · ${out.layover}`
          : `${legs.length - 1} stop(s)`;
  }
  return out;
}

function normalizeAirlineKey(name = "") {
  const base = String(name)
    .toLowerCase()
    .replace(/\b(israel\s+)?airlines?\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (base === "el al" || base.startsWith("el al ")) return "el al";
  return base;
}

function resolveAirlineKey(flight) {
  let airline = normalizeAirlineKey(flight.airline ?? "");
  if (airline) return airline;
  const legs = splitCombinedFlightNumber(flight.flightNumber);
  if (legs[0]) return normalizeAirlineKey(airlineFromFlightNumber(legs[0]));
  const iata = airlineIataCode(flight.airline ?? "");
  return iata ? iata.toLowerCase() : "";
}

function fixOvernightArrival(flight) {
  const out = { ...flight };
  const dep = pickClockTime(out.departureTime);
  const arr = pickClockTime(out.arrivalTime);
  if (!out.departureDate || !dep || !arr) return out;
  if (arr < dep && out.arrivalDate === out.departureDate) {
    out.arrivalDate = addDayIso(out.departureDate, 1);
  }
  return out;
}

function flightLegsKey(flight) {
  const legs = splitCombinedFlightNumber(flight.flightNumber)
    .map((leg) => normalizeFlightNumber(leg))
    .filter(Boolean);
  if (legs.length > 0) return legs.join("+");
  const single = normalizeFlightNumber(flight.flightNumber);
  return single || "unknown";
}

function flightOptionKey(flight) {
  const airline = resolveAirlineKey(flight);
  const route = flightLegsKey(flight);
  const depDate = flight.departureDate ?? "";
  const depTime = pickClockTime(flight.departureTime) ?? "";
  return `${airline}|${route}|${depDate}|${depTime}`;
}

function scoreFlightOption(flight) {
  let score = 0;
  if (flight.segments?.length > 1) score += 12;
  if (flight.departure && flight.arrival) score += 4;
  if ((flight.airline ?? "").length > 6) score += 2;
  if (pickClockTime(flight.departureTime)) score += 3;
  if (pickClockTime(flight.arrivalTime)) score += 2;
  if (flight.departureDate) score += 2;
  if (flight.arrivalDate && flight.arrivalDate !== flight.departureDate) score += 1;
  if (flight.duration) score += 1;
  if (flight.price && !/^not listed$/i.test(String(flight.price))) score += 1;
  if (flight.stops === "Nonstop") score += 1;
  return score;
}

function dedupeFlightOptions(flights) {
  const best = new Map();
  for (const flight of flights) {
    const key = flightOptionKey(flight);
    const prev = best.get(key);
    if (!prev || scoreFlightOption(flight) > scoreFlightOption(prev)) {
      best.set(key, flight);
    }
  }
  return [...best.values()];
}

function filterByDepartureDate(flights, departureDate) {
  if (!departureDate) return flights;
  return flights.filter((f) => f.departureDate === departureDate);
}

function departureSortKey(flight) {
  const date = flight.departureDate ?? "9999-12-31";
  const time = pickClockTime(flight.departureTime);
  if (!time) return `${date}T99:99`;
  const [hours, minutes] = time.split(":").map((part) => Number.parseInt(part, 10));
  const hh = String(Number.isFinite(hours) ? hours : 99).padStart(2, "0");
  const mm = String(Number.isFinite(minutes) ? minutes : 99).padStart(2, "0");
  return `${date}T${hh}:${mm}`;
}

function sortFlightsByDeparture(flights) {
  return [...flights].sort((a, b) => departureSortKey(a).localeCompare(departureSortKey(b)));
}

function extractTimes(text) {
  return [...text.matchAll(/\b(\d{1,2}:\d{2})\b/g)].map((m) => m[1]);
}

function extractFlightNumbers(text) {
  return [...text.matchAll(/\b([A-Z]{2})\s*(\d{1,4})\b/g)].map((m) => `${m[1]} ${m[2]}`);
}

function normalizeDuration(text = "") {
  const value = String(text).trim();
  if (!value) return "";
  const range = value.match(/(\d+)\s*[-–]\s*(\d+)\s*h/i);
  if (range) return `${range[1]}–${range[2]}h`;
  const hm = value.match(/(\d+)\s*h(?:our)?s?\s*(\d+)\s*m/i);
  if (hm) return `${hm[1]}h ${hm[2]}m`;
  const hours = value.match(/(\d+)\s*h(?:our|rs?)?/i);
  if (hours) return `${hours[1]}h`;
  return value.length > 24 ? `${value.slice(0, 22)}…` : value;
}

function pickClockTime(value) {
  if (!value || value === "Not listed") return null;
  const match = String(value).match(/\b(\d{1,2}:\d{2})\b/);
  return match?.[1] ?? null;
}

function pickIsoDate(value, fallback) {
  if (!value || value === "Not listed") return fallback ?? null;
  const text = String(value).trim();
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  return extractDateFromFragment(text, fallback);
}

function enrichFlightsFromTools(flights, toolsUsed = []) {
  const corpus = flightSearchCorpus(toolsUsed);
  const meta = flightSearchMeta(toolsUsed);
  const fallbackDate = meta.searchedDate ?? meta.requestedDate ?? null;
  const itineraries = parseItinerariesFromCorpus(corpus, fallbackDate, meta);

  let list = dedupeFlightOptions(
    Array.isArray(flights) ? flights.map((f) => ({ ...f })) : [],
  );
  if (list.length === 0 && itineraries.length > 0) {
    list = itineraries.map((it) => itineraryToFlight(it, meta));
  } else if (itineraries.length > 0) {
    const existing = new Set(list.map((f) => flightOptionKey(f)));
    for (const it of itineraries) {
      const candidate = itineraryToFlight(it, meta);
      const key = flightOptionKey(candidate);
      if (existing.has(key)) continue;
      existing.add(key);
      list.push(candidate);
    }
  }

  list = list.map((flight, index) => {
    const itinerary = itineraries[index] ?? itineraries.find((it) => flightOptionKey(it) === flightOptionKey(flight));
    const out = { ...flight };
    const iata = airlineIataCode(out.airline ?? "");

    if (!out.flightNumber && itinerary?.flightNumber) {
      out.flightNumber = itinerary.flightNumber;
    } else if (!out.flightNumber && iata) {
      out.flightNumber = `${iata} · check airline`;
    }

    out.departureTime = pickClockTime(out.departureTime) ?? itinerary?.departureTime ?? "Not listed";
    out.arrivalTime = pickClockTime(out.arrivalTime) ?? itinerary?.arrivalTime ?? "Not listed";
    out.departureDate =
      pickIsoDate(out.departureDate, itinerary?.departureDate ?? fallbackDate) ?? fallbackDate;
    out.arrivalDate =
      pickIsoDate(out.arrivalDate, itinerary?.arrivalDate ?? out.departureDate) ??
      (out.departureDate &&
      pickClockTime(out.arrivalTime) &&
      pickClockTime(out.departureTime) &&
      pickClockTime(out.arrivalTime) < pickClockTime(out.departureTime)
        ? addDayIso(out.departureDate, 1)
        : out.departureDate);

    if (!out.duration && itinerary?.duration) out.duration = itinerary.duration;
    if (!out.layover && itinerary?.layover) out.layover = itinerary.layover;
    if (!out.stops && itinerary?.stops) out.stops = itinerary.stops;
    if ((!out.segments || out.segments.length === 0) && itinerary?.segments?.length) {
      out.segments = itinerary.segments;
    }

    if (meta.usedFallback && !out.dateNote) {
      out.dateNote = meta.requestedDate
        ? `Schedule shown for ${meta.searchedDate} (nearest to requested ${meta.requestedDate})`
        : `Schedule shown for ${meta.searchedDate}`;
    }

    out.duration = normalizeDuration(out.duration);
    return fixOvernightArrival(ensureConnectingSegments(out, fallbackDate));
  });

  list = dedupeFlightOptions(list);
  list = filterByDepartureDate(list, fallbackDate);
  return sortFlightsByDeparture(list);
}

/** Add NIS equivalents when the trip departs from Israel. */
function enrichFlightPrices(flights, { departure = "", fromCountry = "" } = {}) {
  if (!isIsraelDeparture(departure, fromCountry)) return flights;

  return flights.map((flight) => {
    const usd = parseUsdAmount(flight.price);
    if (usd == null) return flight;

    const nis = formatNis(usd * USD_TO_NIS);
    const usdLabel = `$${Math.round(usd).toLocaleString("en-US")}`;
    return {
      ...flight,
      priceUsd: usdLabel,
      priceNis: nis,
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

export async function enrichTravelResponse(
  response,
  { departure = "", destination = "", toolsUsed = [] } = {},
) {
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

  out.flights = enrichFlightsFromTools(out.flights, toolsUsed);
  out.flights = enrichFlightPrices(out.flights, {
    departure,
    fromCountry: out.from.country,
  });

  return out;
}
