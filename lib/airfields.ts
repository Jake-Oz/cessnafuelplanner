import dataset from "@/public/au-airfields.json";
import type { Airfield, AirfieldDataset } from "@/types/airfield";

export const AU_AIRFIELDS = (dataset as AirfieldDataset).airfields;

const CODE_KEYS: Array<keyof Airfield> = [
  "ident",
  "icaoCode",
  "iataCode",
  "gpsCode",
  "localCode",
];

const airfieldsByCode = new Map<string, Airfield>();

for (const airfield of AU_AIRFIELDS) {
  for (const key of CODE_KEYS) {
    const value = airfield[key];
    if (typeof value === "string" && value.trim()) {
      airfieldsByCode.set(normalizeAirfieldCode(value), airfield);
    }
  }
}

export function normalizeAirfieldCode(code: string): string {
  return code.trim().toUpperCase();
}

export function findAirfieldByCode(code: string): Airfield | undefined {
  return airfieldsByCode.get(normalizeAirfieldCode(code));
}

export function searchAirfields(query: string, limit = 8): Airfield[] {
  const q = normalizeAirfieldCode(query);
  if (!q) return [];

  const scored = AU_AIRFIELDS.map((airfield) => {
    const codes = CODE_KEYS.map((key) => airfield[key])
      .filter((value): value is string => typeof value === "string")
      .map(normalizeAirfieldCode);
    const name = airfield.name.toUpperCase();
    const municipality = airfield.municipality?.toUpperCase() ?? "";

    let score = 0;
    if (codes.some((code) => code === q)) score = 100;
    else if (codes.some((code) => code.startsWith(q))) score = 80;
    else if (name.startsWith(q)) score = 60;
    else if (municipality.startsWith(q)) score = 50;
    else if (name.includes(q)) score = 30;
    else if (municipality.includes(q)) score = 20;

    return { airfield, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.airfield.ident.localeCompare(b.airfield.ident));

  return scored.slice(0, limit).map((item) => item.airfield);
}

export function distanceNmBetweenAirfields(from: Airfield, to: Airfield): number {
  return haversineNm(
    from.latitudeDeg,
    from.longitudeDeg,
    to.latitudeDeg,
    to.longitudeDeg
  );
}

function haversineNm(
  fromLatDeg: number,
  fromLonDeg: number,
  toLatDeg: number,
  toLonDeg: number
): number {
  const earthRadiusNm = 3440.065;
  const fromLat = toRad(fromLatDeg);
  const toLat = toRad(toLatDeg);
  const deltaLat = toRad(toLatDeg - fromLatDeg);
  const deltaLon = toRad(toLonDeg - fromLonDeg);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLat) *
      Math.cos(toLat) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  return 2 * earthRadiusNm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
