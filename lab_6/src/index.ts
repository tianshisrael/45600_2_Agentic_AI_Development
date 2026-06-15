import "dotenv/config";

export { flightPlannerAgent, printAgentRunSummary, runTravelPlanner } from "./agents/flightPlannerAgent.js";
export { flightSearchTool, currencyExchangeTool, agentTools } from "./tools/index.js";
export { searchFlights, fetchCoordinates, fetchCountryFlag, convertUsdToNis } from "./services/flightApiService.js";
export { FLIGHT_PLANNER_PROMPT, buildFlightPlannerPrompt } from "./prompts/flightPlannerPrompt.js";
export type { Flight, FlightPlace, TravelPlanResponse, Coordinates, FlightSearchParams } from "./types/flight.js";

const isMain =
  process.argv[1]?.endsWith("index.ts") ||
  process.argv[1]?.endsWith("index.js");

if (isMain) {
  const { runTravelPlanner } = await import("./agents/flightPlannerAgent.js");
  runTravelPlanner()
    .then((message) => {
      console.log("####### THIS IS AI RESULT ########");
      console.log(message);
      console.log("####### THIS IS AI RESULT ########");
    })
    .catch((err: unknown) => {
      console.error(err);
      process.exit(1);
    });
}
