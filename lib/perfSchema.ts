import { z } from "zod";

export const PhaseSchema = z.enum(["climb", "cruise"]);

export const PerformancePointSchema = z
  .object({
    altitudeFt: z.number().optional(),
    oatC: z.number().optional(),
    rpm: z.number().optional(),
    manifoldInHg: z.number().optional(),
    percentPower: z.number().optional(),
    fuelFlowGPH: z.number(),
    ktas: z.number().optional(),
  })
  .passthrough();

export const PerformanceProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  phase: PhaseSchema,
  notes: z.string().optional(),
  points: z.array(PerformancePointSchema).min(1),
});

export const PerformanceDataSchema = z.object({
  aircraft: z.string(),
  source: z.string().optional(),
  units: z
    .object({
      altitude: z.string().optional(),
      temp: z.string().optional(),
      speed: z.string().optional(),
      fuelFlow: z.string().optional(),
    })
    .optional(),
  profiles: z.array(PerformanceProfileSchema).min(1),
});

export type PerformanceDataParsed = z.infer<typeof PerformanceDataSchema>;
