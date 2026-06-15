export interface Coordinates {
  lat: number;
  lon: number;
  name: string;
}

export interface FlightPlace {
  name: string;
  lat?: number;
  long?: number;
  lon?: number;
  latitude?: number;
  longitude?: number;
  flag?: string | null;
}

export interface Flight {
  airline: string;
  flightNumber?: string;
  startDate?: string;
  endDate?: string;
  departure: string;
  arrival: string;
  price: string;
  duration: string;
  stops: string;
}

export interface TravelPlanResponse {
  from: FlightPlace;
  to: FlightPlace;
  message: string;
  flights: Flight[];
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  date?: string;
}

export interface CountryInfo {
  name: string;
  flag: string;
}
