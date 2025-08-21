// Types describing the structure of the Cessna 182S performance data JSON
// You will provide the real JSON later; keep at least these fields for compatibility.

export type Phase = "climb" | "cruise";

export interface PerformancePoint {
  // Optional identifiers
  altitudeFt?: number; // pressure or density altitude, specify in your file
  oatC?: number; // outside air temp in C
  rpm?: number;
  manifoldInHg?: number;
  percentPower?: number;

  // Core values used by the planner
  fuelFlowGPH: number; // gallons per hour
  ktas?: number; // true airspeed in knots, optional but useful to compute time

  // Any other POH-derived data you want to include is allowed
  [k: string]: unknown;
}

export interface PerformanceProfile {
  id: string; // e.g., "cruise-65pct-8000ft"
  name: string; // e.g., "Cruise 65% @ 8000 ft"
  phase: Phase; // which phase this profile best describes
  notes?: string;
  points: PerformancePoint[];
}

export interface PerformanceData {
  aircraft: string; // e.g., "Cessna 182S"
  source?: string; // e.g., "POH Sect. 5"
  units?: {
    altitude?: "ft" | string;
    temp?: "C" | string;
    speed?: "ktas" | string;
    fuelFlow?: "gph" | string;
  };
  profiles: PerformanceProfile[];
}
