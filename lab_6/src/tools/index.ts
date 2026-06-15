import { tool } from "@langchain/core/tools";
import { currencyExchangeSchema } from "../schemas/flightSearchSchema.js";
import { convertUsdToNis, fetchCountryFlag } from "../services/flightApiService.js";
import { flightSearchTool } from "./flightSearchTool.js";

export const currencyExchangeTool = tool(
  ({ priceInDollar }) => convertUsdToNis(priceInDollar),
  {
    name: "currency_exchange",
    description:
      "Convert a price from US Dollars (USD) to Israeli New Shekel (NIS/ILS). Use this when the user asks for prices in NIS, shekels, or ILS, or when showing flight/hotel prices to someone who prefers Israeli currency. Exchange rate: 1 USD ≈ 3.2 NIS.",
    schema: currencyExchangeSchema,
  }
);
const DEFAULT_FLAG = "https://flagcdn.com/w40/il.png";
export const getCountryFlagTool = tool(
  async ({ countryCode }) => {
    let c = null;
    try {
       c = await fetchCountryFlag(countryCode);
       
    } catch (error) {
      
    }finally{
      if(!c?.flag) return DEFAULT_FLAG
    }
  },
  {
    name: "currency_exchange",
    description:
      "Convert a price from US Dollars (USD) to Israeli New Shekel (NIS/ILS). Use this when the user asks for prices in NIS, shekels, or ILS, or when showing flight/hotel prices to someone who prefers Israeli currency. Exchange rate: 1 USD ≈ 3.2 NIS.",
    schema: {},
  }
);

export const agentTools = [flightSearchTool, currencyExchangeTool];

export { flightSearchTool };
