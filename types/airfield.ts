export interface Airfield {
  ident: string;
  name: string;
  type: "small_airport" | "medium_airport" | "large_airport";
  latitudeDeg: number;
  longitudeDeg: number;
  elevationFt?: number;
  region: string;
  municipality?: string;
  icaoCode?: string;
  iataCode?: string;
  gpsCode?: string;
  localCode?: string;
}

export interface AirfieldDataset {
  source: string;
  sourceUrl: string;
  country: "AU";
  generatedAt: string;
  count: number;
  airfields: Airfield[];
}
