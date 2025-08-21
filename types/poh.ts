export type SeaLevelOrNumber = number | "S.L.";

export interface ClimbFromSeaLevelPoint {
  pressureAltitudeFt: SeaLevelOrNumber;
  climbSpeedKias: number;
  rateOfClimbFpm: number;
  fromSeaLevel: {
    timeMin: number;
    fuelUsedGal: number;
    distanceNm: number;
  };
}

export interface NormalClimbTable {
  conditions: string;
  data: ClimbFromSeaLevelPoint[];
}

export interface TimeFuelDistanceToClimb {
  notes?: string[];
  maximumRateClimb?: {
    conditions: string;
    data: ClimbFromSeaLevelPoint[];
  };
  normalClimb?: NormalClimbTable;
}

export interface ClimbPerformance {
  conditions?: Record<string, unknown>;
  maximumRateOfClimb?: unknown; // not used currently
  timeFuelDistanceToClimb: TimeFuelDistanceToClimb;
}

export interface CruisePerformanceEntryTemp {
  bhpPercent: number;
  ktas: number;
  gph: number;
}

export interface CruisePerformanceEntry {
  manifoldPressureInHg: number;
  stdMinus20C: CruisePerformanceEntryTemp;
  std: CruisePerformanceEntryTemp;
  stdPlus20C: CruisePerformanceEntryTemp;
}

export interface CruiseDataByRpm {
  rpm: number;
  performance: CruisePerformanceEntry[];
}

export interface CruiseDataByAltitude {
  pressureAltitudeFt: SeaLevelOrNumber;
  dataByRpm: CruiseDataByRpm[];
}

export interface CruisePerformance {
  conditions?: Record<string, unknown>;
  dataByAltitude: CruiseDataByAltitude[];
}

export interface FlightPOHData {
  climbPerformance: ClimbPerformance;
  cruisePerformance: CruisePerformance;
}
