import axios from "axios";
import { TavilySearch } from "@langchain/tavily";
import type { Coordinates, CountryInfo, FlightSearchParams } from "../types/flight.js";

const GEOCODING_BASE = "https://geocoding-api.open-meteo.com/v1/search";
const REST_COUNTRIES_BASE = "https://restcountries.com/v3.1/alpha";

const webSearch = new TavilySearch({
  maxResults: 5,
  topic: "general",
});

export async function searchFlights({
  origin,
  destination,
  date,
}: FlightSearchParams): Promise<string> {
  const query = date
    ? `flights from ${origin} to ${destination} on ${date} flight numbers departure arrival dates`
    : `flights from ${origin} to ${destination} flight numbers departure arrival dates`;

  const results = await webSearch.invoke({ query });
  console.log(JSON.stringify(results));
  return typeof results === "string" ? results : JSON.stringify(results);
}

export async function fetchCoordinates(
  name: string
): Promise<Coordinates | null> {
  const { data } = await axios.get(GEOCODING_BASE, {
    params: {
      name: name.trim(),
      count: 1,
      language: "en",
      format: "json",
    },
  });

  const results = data.results;
  if (!results || results.length === 0) return null;

  const first = results[0];
  return { lat: first.latitude, lon: first.longitude, name: first.name };
}

export async function fetchCountryFlag(
  countryCode: string
): Promise<CountryInfo | null> {
  try {
    const { data } = await axios.get(
      `${REST_COUNTRIES_BASE}/${countryCode.trim()}`
    );
    const country = Array.isArray(data) ? data[0] : data;
    if (!country) return null;

    return {
      name: country.name?.common ?? countryCode,
      flag: country.flags?.png ?? "",
    };
  } catch {
    return null;
  }
}

export function convertUsdToNis(priceInDollar: string): string {
  const price = parseFloat(priceInDollar);
  if (isNaN(price)) {
    return "Invalid price. Please provide a numeric value in USD.";
  }
  const priceInNIS = Math.round(price * 3.2);
  return `${price} USD = ${priceInNIS} NIS/ILS`;
}
