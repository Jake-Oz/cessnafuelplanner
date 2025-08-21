import {
  WaypointLeg,
  FuelPlanSettings,
  ComputedLegResult,
  PlanSummary,
} from "@/types/flight";
import type { FlightPOHData } from "@/types/poh";
import { getClimbFromSeaLevel, getCruiseAtAltitude } from "@/lib/poh";

export function computeLeg(
  leg: WaypointLeg,
  settings: FuelPlanSettings
): ComputedLegResult {
  // Legacy function retained for non-POH fallback; use defaults only
  const gph = settings.climbAllowanceGPH ?? 12;
  const ktas = settings.defaultCruiseKtas ?? 135;

  const timeHours = leg.plannedTimeMin
    ? leg.plannedTimeMin / 60
    : leg.distanceNM / ktas;
  const fuelGal = timeHours * gph;

  return {
    legId: leg.id,
    timeMin: timeHours * 60,
    fuelGal,
    averageGPH: gph,
    ktasUsed: ktas,
  };
}

export function computePlan(
  legs: WaypointLeg[],
  settings: FuelPlanSettings,
  pohData?: FlightPOHData
): {
  legs: ComputedLegResult[];
  summary: PlanSummary;
  cumulative: { timeMin: number; fuelGal: number; distanceNM: number }[];
} {
  const results: ComputedLegResult[] = [];
  const cumulative: { timeMin: number; fuelGal: number; distanceNM: number }[] =
    [];

  let totalTime = 0;
  let totalFuel = 0;
  let totalDistance = 0;

  // If POH data is loaded, incorporate climb whenever altitude increases for any leg.
  if (pohData && legs.length > 0) {
    const climbMode = settings.climbMode ?? "normal";
    const defaultRpm = settings.cruiseRpm ?? 2400;
    const defaultMp = settings.cruiseManifoldInHg;
    const globalTempBand = settings.tempBand ?? "std";

    let prevAlt = 0; // assume depart S.L.

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const targetAlt = Math.max(0, leg.plannedAltitudeFt ?? prevAlt);

      // Determine climb requirement for this leg (only if climbing above previous altitude)
      const needsClimb = targetAlt > prevAlt;
      const climbDelta = needsClimb ? targetAlt - prevAlt : 0;
      let climbTimeMin = 0;
      let climbFuelGal = 0;
      let climbDistNm = 0;
      if (needsClimb && climbDelta > 0) {
        const climb = getClimbFromSeaLevel(pohData, targetAlt, climbMode);
        const fromPrev = getClimbFromSeaLevel(pohData, prevAlt, climbMode);
        if (climb && fromPrev) {
          climbTimeMin = Math.max(0, climb.timeMin - fromPrev.timeMin);
          climbFuelGal = Math.max(0, climb.fuelUsedGal - fromPrev.fuelUsedGal);
          climbDistNm = Math.max(0, climb.distanceNm - fromPrev.distanceNm);
        }
      }

      // Cruise selection for leg altitude, allow per-leg override
      const rpm = leg.cruiseRpm ?? defaultRpm;
      const mp = leg.cruiseManifoldInHg ?? defaultMp;
      const tempBand = leg.tempBand ?? globalTempBand;
      const cruise = getCruiseAtAltitude(pohData, targetAlt, rpm, mp, tempBand);
      const cruiseKtas = cruise?.ktas ?? settings.defaultCruiseKtas ?? 135;
      const cruiseGph = cruise?.gph ?? 12;

      // Subtract climb distance/time from leg where applicable
      const remainingDist = Math.max(0, leg.distanceNM - climbDistNm);
      const remainingTimeHrs = leg.plannedTimeMin
        ? Math.max(0, leg.plannedTimeMin / 60 - climbTimeMin / 60)
        : remainingDist / cruiseKtas;
      const cruiseFuel = remainingTimeHrs * cruiseGph;

      const cruiseTimeMin = remainingTimeHrs * 60;
      const totalLegTimeMin = climbTimeMin + cruiseTimeMin;
      const totalLegFuelGal = climbFuelGal + cruiseFuel;

      const r: ComputedLegResult = {
        legId: leg.id,
        timeMin: totalLegTimeMin,
        fuelGal: totalLegFuelGal,
        averageGPH:
          totalLegTimeMin > 0
            ? totalLegFuelGal / (totalLegTimeMin / 60)
            : cruiseGph,
        ktasUsed: cruiseKtas,
        climbTimeMin: climbTimeMin || undefined,
        climbDistanceNm: climbDistNm || undefined,
        climbFuelGal: climbFuelGal || undefined,
        cruiseTimeMin: cruiseTimeMin || undefined,
        cruiseDistanceNm: remainingDist || undefined,
        cruiseFuelGal: cruiseFuel || undefined,
      };

      results.push(r);
      totalTime += r.timeMin;
      totalFuel += r.fuelGal;
      totalDistance += leg.distanceNM;
      cumulative.push({
        timeMin: totalTime,
        fuelGal: totalFuel,
        distanceNM: totalDistance,
      });

      prevAlt = targetAlt; // new reference altitude for next leg
    }
  } else {
    // No POH data: use generic fallback
    for (const leg of legs) {
      const r = computeLeg(leg, settings);
      results.push(r);
      totalTime += r.timeMin;
      totalFuel += r.fuelGal;
      totalDistance += leg.distanceNM;
      cumulative.push({
        timeMin: totalTime,
        fuelGal: totalFuel,
        distanceNM: totalDistance,
      });
    }
  }

  const reserveFuelByTime =
    (settings.reserveMinutes / 60) *
    (results.length ? average(results.map((r) => r.averageGPH)) : 12);
  const reserveFuel = settings.reserveFuelGal ?? reserveFuelByTime;
  const taxiFuel = settings.taxiFuelGal;
  // Holding fuel: if minutes provided, use same average GPH as reserve; else optional percent of flight fuel
  let holdingFuel =
    (Math.max(0, settings.holdingPercent ?? 0) / 100) * totalFuel;
  if ((settings.holdingMinutes ?? 0) > 0) {
    const avgGphForReserve = results.length
      ? average(results.map((r) => r.averageGPH))
      : 12;
    holdingFuel = avgGphForReserve * (settings.holdingMinutes! / 60);
  }
  const contingencyFuel =
    (Math.max(0, settings.contingencyPercent ?? 0) / 100) * totalFuel;

  const takeoffFuelRequiredGal =
    totalFuel + reserveFuel + taxiFuel + holdingFuel + contingencyFuel;

  return {
    legs: results,
    summary: {
      totalTimeMin: totalTime,
      totalFuelGal: totalFuel,
      reserveFuelGal: reserveFuel,
      taxiFuelGal: taxiFuel,
      holdingFuelGal: holdingFuel || undefined,
      contingencyFuelGal: contingencyFuel || undefined,
      takeoffFuelRequiredGal,
    },
    cumulative,
  };
}

function average(ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0) / (ns.length || 1);
}
