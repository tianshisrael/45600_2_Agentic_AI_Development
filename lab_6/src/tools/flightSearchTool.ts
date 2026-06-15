import { tool } from "@langchain/core/tools";
import { flightSearchSchema } from "../schemas/flightSearchSchema.js";
import { searchFlights } from "../services/flightApiService.js";

export const flightSearchTool = tool(
  async ({ origin, destination, date }) => {
    return searchFlights({ origin, destination, date });
  },
  {
    name: "flight_finder",
    description:
      "Search for flight options between cities. Use this to find available flights, prices, airlines, flight numbers, and departure/arrival dates when planning travel.",
    schema: flightSearchSchema,
  }
);
