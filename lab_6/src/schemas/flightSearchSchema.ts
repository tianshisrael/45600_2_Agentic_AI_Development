import { z } from "zod";

export const flightSearchSchema = z.object({
  origin: z
    .string()
    .describe("Departure city or airport (e.g. San Francisco)"),
  destination: z
    .string()
    .describe("Arrival city or airport (e.g. Tokyo)"),
  date: z
    .string()
    .optional()
    .describe("Travel date (e.g. 2025-03-15) – optional"),
});

export const currencyExchangeSchema = z.object({
  priceInDollar: z
    .string()
    .describe("Price in US Dollars to convert to NIS/ILS"),
});

export type FlightSearchInput = z.infer<typeof flightSearchSchema>;
export type CurrencyExchangeInput = z.infer<typeof currencyExchangeSchema>;
