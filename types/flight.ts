export interface WaypointLeg {
  id: string;
  from: string; // ICAO or name
  to: string; // ICAO or name
  distanceNM: number; // nautical miles
  plannedAltitudeFt?: number;
  plannedTimeMin?: number; // if not provided, computed from speed
  // Optional POH cruise overrides for this leg; if omitted, use Settings
  cruiseRpm?: number;
  cruiseManifoldInHg?: number;
  tempBand?: "std" | "stdMinus20C" | "stdPlus20C"; // per-leg POH temp column override
}

export interface FuelPlanSettings {
  taxiFuelGal: number; // startup & taxi allowance
  reserveMinutes: number; // time-based reserve
  reserveFuelGal?: number; // optional fixed reserve gallons takes precedence if provided
  climbAllowanceGPH?: number; // optional override for climb if no profile
  defaultCruiseKtas?: number; // used if profile lacks ktas
  // POH-driven options
  climbMode?: "normal" | "max"; // which climb table to use
  cruiseRpm?: number; // pick RPM from POH (e.g., 2400)
  cruiseManifoldInHg?: number; // desired manifold pressure when selecting a row in POH
  tempBand?: "std" | "stdMinus20C" | "stdPlus20C"; // POH temp column
  startingFuelGal?: number; // optional starting fuel for charts and checks
  fuelUnits?: "gal" | "l"; // display units for fuel values
  // Policy-based extras (percent of flight fuel)
  holdingPercent?: number; // % of flight fuel added for holding
  contingencyPercent?: number; // % of flight fuel added as contingency
  // Holding by time using a fixed POH power setting
  holdingMinutes?: number; // minutes of holding to add using 20 inHg/2000 RPM @ 2000 ft
}

export interface ComputedLegResult {
  legId: string;
  timeMin: number;
  fuelGal: number;
  averageGPH: number;
  ktasUsed?: number;
  // Breakdown
  climbTimeMin?: number;
  climbDistanceNm?: number;
  climbFuelGal?: number;
  cruiseTimeMin?: number;
  cruiseDistanceNm?: number;
  cruiseFuelGal?: number;
}

export interface PlanSummary {
  totalTimeMin: number;
  totalFuelGal: number;
  reserveFuelGal: number;
  taxiFuelGal: number;
  holdingFuelGal?: number;
  contingencyFuelGal?: number;
  takeoffFuelRequiredGal: number;
}
