import type {
  FlightPOHData,
  ClimbFromSeaLevelPoint,
  SeaLevelOrNumber,
} from "@/types/poh";

function slToZero(val: SeaLevelOrNumber): number {
  return val === "S.L." ? 0 : (val as number);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function interpByAltitude<T extends { pressureAltitudeFt: SeaLevelOrNumber }>(
  table: T[],
  targetAltFt: number
): { lo: T; hi: T; t: number } {
  const sorted = [...table].sort(
    (a, b) => slToZero(a.pressureAltitudeFt) - slToZero(b.pressureAltitudeFt)
  );
  const alt = Math.max(0, targetAltFt);
  let lo = sorted[0];
  let hi = sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const aAlt = slToZero(a.pressureAltitudeFt);
    const bAlt = slToZero(b.pressureAltitudeFt);
    if (alt >= aAlt && alt <= bAlt) {
      lo = a;
      hi = b;
      const t = aAlt === bAlt ? 0 : (alt - aAlt) / (bAlt - aAlt);
      return { lo, hi, t };
    }
  }
  // out of bounds: clamp
  const t = alt <= slToZero(sorted[0].pressureAltitudeFt) ? 0 : 1;
  return { lo, hi, t };
}

export function getClimbFromSeaLevel(
  poh: FlightPOHData,
  targetAltFt: number,
  mode: "normal" | "max" = "normal"
): { timeMin: number; fuelUsedGal: number; distanceNm: number } | undefined {
  const tfdt = poh.climbPerformance.timeFuelDistanceToClimb;
  const table: ClimbFromSeaLevelPoint[] | undefined =
    mode === "normal" ? tfdt.normalClimb?.data : tfdt.maximumRateClimb?.data;
  if (!table || table.length === 0) return undefined;
  const { lo, hi, t } = interpByAltitude(table, targetAltFt);
  const loFS = lo.fromSeaLevel;
  const hiFS = hi.fromSeaLevel;
  return {
    timeMin: lerp(loFS.timeMin, hiFS.timeMin, t),
    fuelUsedGal: lerp(loFS.fuelUsedGal, hiFS.fuelUsedGal, t),
    distanceNm: lerp(loFS.distanceNm, hiFS.distanceNm, t),
  };
}

export function getCruiseAtAltitude(
  poh: FlightPOHData,
  altFt: number,
  rpmPref: number = 2400,
  mpPref?: number,
  tempBand: "std" | "stdMinus20C" | "stdPlus20C" = "std"
): { ktas: number; gph: number } | undefined {
  const byAlt = poh.cruisePerformance.dataByAltitude;
  if (!byAlt?.length) return undefined;
  const { lo, hi, t } = interpByAltitude(byAlt, altFt);

  function pick(at: typeof lo) {
    // choose closest RPM block to preference
    const rpmBlock = at.dataByRpm.reduce((best, cur) => {
      if (!best) return cur;
      return Math.abs(cur.rpm - rpmPref) < Math.abs(best.rpm - rpmPref)
        ? cur
        : best;
    }, at.dataByRpm[0]);

    // within RPM block, choose nearest manifold pressure to preference if provided, else first row
    let perf = rpmBlock?.performance?.[0];
    if (mpPref && rpmBlock?.performance?.length) {
      perf = rpmBlock.performance.reduce((best, cur) => {
        return Math.abs(cur.manifoldPressureInHg - mpPref!) <
          Math.abs(best.manifoldPressureInHg - mpPref!)
          ? cur
          : best;
      }, rpmBlock.performance[0]);
    }
    if (!perf) return undefined;
    const cell = perf[tempBand];
    return { ktas: cell.ktas, gph: cell.gph };
  }

  const loV = pick(lo);
  const hiV = pick(hi);
  if (!loV && !hiV) return undefined;
  if (loV && !hiV) return loV;
  if (!loV && hiV) return hiV;
  return {
    ktas: lerp(loV!.ktas, hiV!.ktas, t),
    gph: lerp(loV!.gph, hiV!.gph, t),
  };
}
