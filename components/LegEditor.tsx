"use client";
import React from "react";
import { usePlannerStore } from "@/store/usePlannerStore";
import { computePlan } from "@/lib/calc";
import {
  distanceNmBetweenAirfields,
  findAirfieldByCode,
  normalizeAirfieldCode,
  searchAirfields,
} from "@/lib/airfields";
import type { WaypointLeg } from "@/types/flight";

// Phase concept removed; climb is auto-applied on altitude increases.

export default function LegEditor() {
  // Using Tailwind dark: classes directly on containers; hook kept for potential future conditional UI.
  const legs = usePlannerStore((s) => s.legs);
  const updateLeg = usePlannerStore((s) => s.updateLeg);
  const removeLeg = usePlannerStore((s) => s.removeLeg);
  const addLeg = usePlannerStore((s) => s.addLeg);
  const setSettings = usePlannerStore((s) => s.setSettings);
  const pohData = usePlannerStore((s) => s.pohData);
  const settings = usePlannerStore((s) => s.settings);
  // Global POH selections are controlled in SettingsPanel.

  const onAdd = () => {
    const last = legs[legs.length - 1];
    addLeg({
      id: crypto.randomUUID(),
      from: last ? last.to : "",
      to: "",
      distanceNM: 100,
      distanceSource: "airfield",
      fromElevationFt: last?.toElevationFt,
      plannedAltitudeFt: last?.plannedAltitudeFt ?? 8000,
    });
  };

  const applyAirfieldData = (
    leg: WaypointLeg,
    patch: Partial<WaypointLeg>
  ): Partial<WaypointLeg> => {
    const next = { ...leg, ...patch };
    const from = findAirfieldByCode(next.from);
    const to = findAirfieldByCode(next.to);
    const nextPatch: Partial<WaypointLeg> = {
      ...patch,
      fromElevationFt: from?.elevationFt,
      toElevationFt: to?.elevationFt,
    };

    if (from && to && next.distanceSource !== "manual") {
      nextPatch.distanceNM = Math.round(distanceNmBetweenAirfields(from, to));
      nextPatch.distanceSource = "airfield";
    }

    return nextPatch;
  };

  const updateRouteCode = (
    leg: WaypointLeg,
    field: "from" | "to",
    rawCode: string
  ) => {
    const code = normalizeAirfieldCode(rawCode);
    const patch = applyAirfieldData(leg, {
      [field]: code,
      distanceSource: leg.distanceSource === "manual" ? "manual" : "airfield",
    });
    updateLeg(leg.id, patch);

    if (field === "from" && leg.id === legs[0]?.id) {
      const airfield = findAirfieldByCode(code);
      setSettings({ startFieldElevationFt: airfield?.elevationFt ?? 0 });
    }
  };

  const setDistanceManually = (leg: WaypointLeg, distanceNM: number) => {
    updateLeg(leg.id, {
      distanceNM: Math.max(0, distanceNM),
      distanceSource: "manual",
    });
  };

  const restoreAirfieldDistance = (leg: WaypointLeg) => {
    const from = findAirfieldByCode(leg.from);
    const to = findAirfieldByCode(leg.to);
    if (!from || !to) return;
    updateLeg(leg.id, {
      distanceNM: Math.round(distanceNmBetweenAirfields(from, to)),
      distanceSource: "airfield",
      fromElevationFt: from.elevationFt,
      toElevationFt: to.elevationFt,
    });
  };

  // Build dropdown options from POH
  const getAltitudeBlocks = React.useCallback(
    (altFt: number) => {
      if (!pohData) return [];
      const byAlt = pohData.cruisePerformance.dataByAltitude || [];
      if (byAlt.length === 0) return [];

      const getAltValue = (alt: number | "S.L."): number => {
        return alt === "S.L." ? 0 : (alt as number);
      };

      // Find exact match first
      const exactMatch = byAlt.find(
        (a) => getAltValue(a.pressureAltitudeFt) === altFt
      );
      if (exactMatch) return [exactMatch];

      // Find lower and upper bounds
      let lower: (typeof byAlt)[0] | undefined;
      let upper: (typeof byAlt)[0] | undefined;

      for (const altBlock of byAlt) {
        const currentAlt = getAltValue(altBlock.pressureAltitudeFt);
        if (currentAlt < altFt) {
          if (!lower || currentAlt > getAltValue(lower.pressureAltitudeFt)) {
            lower = altBlock;
          }
        }
        if (currentAlt > altFt) {
          if (!upper || currentAlt < getAltValue(upper.pressureAltitudeFt)) {
            upper = altBlock;
          }
        }
      }

      if (!lower && !upper) return []; // Should not happen if byAlt is not empty
      if (!lower) return upper ? [upper] : [];
      if (!upper) return lower ? [lower] : [];

      const lowerAlt = getAltValue(lower.pressureAltitudeFt);
      const upperAlt = getAltValue(upper.pressureAltitudeFt);

      const diffLower = altFt - lowerAlt;
      const diffUpper = upperAlt - altFt;

      if (diffLower < diffUpper) return [lower];
      if (diffUpper < diffLower) return [upper];
      return [lower, upper]; // Exactly in the middle
    },
    [pohData]
  );

  const getRpmOptions = (altFt: number): number[] => {
    const altBlocks = getAltitudeBlocks(altFt);
    if (!altBlocks || altBlocks.length === 0) return [];

    const rpmSet = new Set<number>();
    for (const block of altBlocks) {
      for (const rpmData of block.dataByRpm || []) {
        rpmSet.add(rpmData.rpm);
      }
    }
    return Array.from(rpmSet).sort((a, b) => a - b);
  };

  const getMpOptions = (altFt: number, rpmPref?: number): number[] => {
    if (!rpmPref) return [];
    const altBlocks = getAltitudeBlocks(altFt);
    if (!altBlocks || altBlocks.length === 0) return [];

    const mpSet = new Set<number>();
    for (const block of altBlocks) {
      const rpmBlock = (block.dataByRpm || []).find((r) => r.rpm === rpmPref);
      if (rpmBlock) {
        for (const perf of rpmBlock.performance || []) {
          mpSet.add(perf.manifoldPressureInHg);
        }
      }
    }
    return Array.from(mpSet).sort((a, b) => a - b);
  };

  // Gate certain client-only UI (like computed notes) until mounted to avoid hydration warnings
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const computedLegs = React.useMemo(
    () => computePlan(legs, settings, pohData).legs,
    [legs, settings, pohData]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-50">
          Legs
        </h2>
        <button
          onClick={onAdd}
          className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
        >
          Add leg
        </button>
      </div>

      <div className="space-y-3">
        <div className="text-xs text-gray-600 dark:text-slate-300">
          Climb calculations start from field elevation:{" "}
          {Math.max(0, settings.startFieldElevationFt ?? 0)} ft
        </div>
        {legs.map((leg, idx) => {
          const fromAirfield = findAirfieldByCode(leg.from);
          const toAirfield = findAirfieldByCode(leg.to);
          const canUseAirfieldDistance = Boolean(fromAirfield && toAirfield);
          const routeSuggestions = [
            ...searchAirfields(leg.from, 3),
            ...searchAirfields(leg.to, 3),
          ].filter(
            (airfield, index, all) =>
              all.findIndex((item) => item.ident === airfield.ident) === index
          );

          return (
            <div
              key={leg.id}
              className="rounded-lg border p-3 border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-900"
            >
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{idx + 1}.</span>
                </div>
                <button
                  onClick={() => removeLeg(leg.id)}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-12 gap-3 mt-3">
                <label className="flex flex-col text-xs md:col-span-2">
                  From code
                  <input
                    list={`airfields-${leg.id}`}
                    value={leg.from}
                    onChange={(e) => updateRouteCode(leg, "from", e.target.value)}
                    placeholder="YSSY"
                    autoCapitalize="characters"
                    className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
                  />
                </label>
                <label className="flex flex-col text-xs md:col-span-2">
                  To code
                  <input
                    list={`airfields-${leg.id}`}
                    value={leg.to}
                    onChange={(e) => updateRouteCode(leg, "to", e.target.value)}
                    placeholder="YSCB"
                    autoCapitalize="characters"
                    className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
                  />
                  <datalist id={`airfields-${leg.id}`}>
                    {routeSuggestions.map((airfield) => (
                      <option
                        key={airfield.ident}
                        value={airfield.ident}
                        label={`${airfield.name}, ${airfield.municipality ?? airfield.region}`}
                      />
                    ))}
                  </datalist>
                </label>
                <label className="flex flex-col text-xs md:col-span-2">
                  Distance (NM)
                  <input
                    type="number"
                    step={1}
                    min={0}
                    value={leg.distanceNM}
                    onChange={(e) =>
                      setDistanceManually(leg, Number(e.target.value))
                    }
                    className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
                  />
                  <span className="mt-1 min-h-4 text-[11px] text-gray-600 dark:text-slate-300">
                    {leg.distanceSource === "airfield"
                      ? "From airfield coordinates"
                      : canUseAirfieldDistance
                        ? "Manual override"
                        : "Enter known AU codes"}
                  </span>
                </label>
                <label className="flex flex-col text-xs md:col-span-2">
                  Altitude (ft)
                  <input
                    type="number"
                    step={500}
                    value={leg.plannedAltitudeFt ?? 0}
                    onChange={(e) =>
                      updateLeg(leg.id, {
                        plannedAltitudeFt: Number(e.target.value),
                        cruiseRpm: undefined,
                        cruiseManifoldInHg: undefined,
                      })
                    }
                    className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
                  />
                </label>
                <label className="flex flex-col text-xs md:col-span-2">
                  Time (min)
                  <input
                    type="number"
                    value={leg.plannedTimeMin ?? 0}
                    onChange={(e) =>
                      updateLeg(leg.id, {
                        plannedTimeMin: Number(e.target.value) || undefined,
                      })
                    }
                    className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
                  />
                </label>
                {/* Phase removed */}
                <label className="flex flex-col text-xs md:col-span-1">
                  RPM
                  <select
                    value={leg.cruiseRpm ?? ""}
                    onChange={(e) =>
                      updateLeg(leg.id, {
                        cruiseRpm: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                        // Clear MP when RPM changes to refresh options if previously set
                        cruiseManifoldInHg: undefined,
                      })
                    }
                    disabled={!pohData}
                    className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
                  >
                    <option value="">Use Settings</option>
                    {getRpmOptions(leg.plannedAltitudeFt ?? 0).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-xs md:col-span-1">
                  MP (inHg)
                  <select
                    value={leg.cruiseManifoldInHg ?? ""}
                    onChange={(e) =>
                      updateLeg(leg.id, {
                        cruiseManifoldInHg: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    disabled={!pohData}
                    className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
                  >
                    <option value="">Use Settings</option>
                    {getMpOptions(
                      leg.plannedAltitudeFt ?? 0,
                      leg.cruiseRpm ?? settings.cruiseRpm
                    ).map((mp) => (
                      <option key={mp} value={mp}>
                        {mp.toFixed(0)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-xs md:col-span-2">
                  Temp Band
                  <select
                    value={leg.tempBand ?? ""}
                    onChange={(e) =>
                      updateLeg(leg.id, {
                        tempBand: (e.target.value || undefined) as
                          | "std"
                          | "stdMinus20C"
                          | "stdPlus20C"
                          | undefined,
                      })
                    }
                    className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
                  >
                    <option value="">Use Settings</option>
                    <option value="std">ISA</option>
                    <option value="stdMinus20C">ISA -20C</option>
                    <option value="stdPlus20C">ISA +20C</option>
                  </select>
                </label>
              </div>

              <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700 dark:border-slate-600 dark:bg-slate-950/70 dark:text-slate-100">
                <div className="grid gap-1 md:grid-cols-[1fr_auto_1fr] md:items-center">
                  <AirfieldLabel code={leg.from} />
                  <div className="hidden text-gray-500 dark:text-slate-300 md:block">
                    to
                  </div>
                  <AirfieldLabel code={leg.to} />
                </div>
                {canUseAirfieldDistance && leg.distanceSource === "manual" ? (
                  <button
                    type="button"
                    onClick={() => restoreAirfieldDistance(leg)}
                    className="mt-2 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-white dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Use calculated distance
                  </button>
                ) : null}
              </div>

              {/* Computed breakdown note */}
              {mounted
                ? (() => {
                    const comp = computedLegs[idx];
                    if (!comp) return null;
                    const fmt = (n: number | undefined, d = 1) =>
                      n === undefined ? "-" : n.toFixed(d);

                    const fuelUnitLabel =
                      settings.fuelUnits === "l" ? "L" : "gal";
                    const fuelRateUnitLabel =
                      settings.fuelUnits === "l" ? "LPH" : "GPH";
                    const convertFuel = (gal: number | undefined) => {
                      if (gal === undefined) return undefined;
                      if (settings.fuelUnits === "l") {
                        return gal * 3.78541;
                      }
                      return gal;
                    };

                    return (
                      <div className="mt-2 rounded border border-gray-100 bg-gray-50 p-2 text-xs text-gray-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100">
                        <div className="font-medium text-gray-900 dark:text-slate-50">
                          Notes
                        </div>
                        <div>
                          Climb: time {fmt(comp.climbTimeMin)} min, dist{" "}
                          {fmt(comp.climbDistanceNm)} NM, fuel{" "}
                          {fmt(convertFuel(comp.climbFuelGal))} {fuelUnitLabel}
                        </div>
                        <div>
                          Cruise: time {fmt(comp.cruiseTimeMin)} min, dist{" "}
                          {fmt(comp.cruiseDistanceNm)} NM, fuel{" "}
                          {fmt(convertFuel(comp.cruiseFuelGal))} {fuelUnitLabel}
                        </div>
                        {(() => {
                          const rpm =
                            leg.cruiseRpm ?? settings.cruiseRpm ?? 2300;
                          const mp =
                            leg.cruiseManifoldInHg ??
                            settings.cruiseManifoldInHg;
                          const ktas = comp.ktasUsed;
                          const gph =
                            comp.cruiseTimeMin &&
                            comp.cruiseTimeMin > 0 &&
                            comp.cruiseFuelGal !== undefined
                              ? comp.cruiseFuelGal / (comp.cruiseTimeMin / 60)
                              : undefined;
                          const ktasStr =
                            ktas !== undefined ? ktas.toFixed(0) : "-";
                          const fuelRateStr =
                            gph !== undefined ? fmt(convertFuel(gph)) : "-";
                          return (
                            <div>
                              Cruise perf: KTAS {ktasStr}, {fuelRateUnitLabel}{" "}
                              {fuelRateStr} (RPM {rpm}
                              {mp ? `, MP ${mp.toFixed(1)} inHg` : ""})
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()
                : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AirfieldLabel({ code }: { code: string }) {
  const airfield = findAirfieldByCode(code);

  if (!code) {
    return <div className="text-gray-600 dark:text-slate-300">No code set</div>;
  }

  if (!airfield) {
    return (
      <div>
        <span className="font-semibold">{code}</span>
        <span className="text-gray-600 dark:text-slate-300">
          {" "}
          not found in Australian airfield data
        </span>
      </div>
    );
  }

  const elevation =
    airfield.elevationFt === undefined ? "" : `, ${airfield.elevationFt} ft`;
  const place = airfield.municipality ?? airfield.region;

  return (
    <div>
      <span className="font-semibold">{airfield.ident}</span>
      <span> {airfield.name}</span>
      <span className="text-gray-600 dark:text-slate-300">
        {" "}
        ({place}
        {elevation})
      </span>
    </div>
  );
}
