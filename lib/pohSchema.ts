import { z } from "zod";

const SeaLevelOrNumber = z.union([z.number(), z.literal("S.L.")]);

const ClimbFromSeaLevelPoint = z.object({
  pressureAltitudeFt: SeaLevelOrNumber,
  climbSpeedKias: z.number(),
  rateOfClimbFpm: z.number(),
  fromSeaLevel: z.object({
    timeMin: z.number(),
    fuelUsedGal: z.number(),
    distanceNm: z.number(),
  }),
});

const NormalClimbTable = z.object({
  conditions: z.string(),
  data: z.array(ClimbFromSeaLevelPoint),
});

const TimeFuelDistanceToClimb = z.object({
  notes: z.array(z.string()).optional(),
  maximumRateClimb: z
    .object({ conditions: z.string(), data: z.array(ClimbFromSeaLevelPoint) })
    .optional(),
  normalClimb: NormalClimbTable.optional(),
});

const ClimbPerformance = z.object({
  conditions: z.record(z.string(), z.any()).optional(),
  maximumRateOfClimb: z.any().optional(),
  timeFuelDistanceToClimb: TimeFuelDistanceToClimb,
});

// Accept either 'bhpPercent' or 'bhp' from source data and normalize to 'bhpPercent'
const CruisePerformanceEntryTemp = z
  .object({
    ktas: z.number(),
    gph: z.number(),
    bhpPercent: z.number().optional(),
    bhp: z.number().optional(),
  })
  .refine((v) => v.bhpPercent !== undefined || v.bhp !== undefined, {
    message: "Expected either 'bhpPercent' or 'bhp'",
  })
  .transform((v) => ({
    ktas: v.ktas,
    gph: v.gph,
    bhpPercent: (v.bhpPercent ?? v.bhp!) as number,
  }));

const CruisePerformanceEntry = z.object({
  manifoldPressureInHg: z.number(),
  stdMinus20C: CruisePerformanceEntryTemp,
  std: CruisePerformanceEntryTemp,
  stdPlus20C: CruisePerformanceEntryTemp,
});

const CruiseDataByRpm = z.object({
  rpm: z.number(),
  performance: z.array(CruisePerformanceEntry),
});

const CruiseDataByAltitude = z.object({
  pressureAltitudeFt: SeaLevelOrNumber,
  dataByRpm: z.array(CruiseDataByRpm),
});

const CruisePerformance = z.object({
  conditions: z.record(z.string(), z.any()).optional(),
  dataByAltitude: z.array(CruiseDataByAltitude),
});

export const FlightPOHSchema = z.object({
  climbPerformance: ClimbPerformance,
  cruisePerformance: CruisePerformance,
});

export type FlightPOHParsed = z.infer<typeof FlightPOHSchema>;
