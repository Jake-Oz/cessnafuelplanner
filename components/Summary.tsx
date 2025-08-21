"use client";
import React from "react";
import { usePlannerStore } from "@/store/usePlannerStore";
import { computePlan } from "@/lib/calc";
import { getCruiseAtAltitude } from "@/lib/poh";

export default function Summary() {
  const legs = usePlannerStore((s) => s.legs);
  const settings = usePlannerStore((s) => s.settings);
  const pohData = usePlannerStore((s) => s.pohData);
  const { summary } = computePlan(legs, settings, pohData);

  const toL = (g: number) => g * 3.78541;
  const isL = settings.fuelUnits === "l";
  const fmt = (g: number) => (isL ? toL(g) : g).toFixed(1);
  const unit = isL ? "L" : "gal";

  const row = (label: string, value: string) => (
    <div className="flex justify-between text-sm">
      <span className="text-slate-300">{label}</span>
      <span className="text-slate-50 font-semibold">{value}</span>
    </div>
  );

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-50">
        Summary
      </h2>
      <div className="rounded-lg border border-slate-500 bg-slate-700/40 p-4 space-y-2">
        {row("Total time", `${summary.totalTimeMin.toFixed(1)} min`)}
        {row("Flight fuel", `${fmt(summary.totalFuelGal)} ${unit}`)}
        {row("Reserve", `${fmt(summary.reserveFuelGal)} ${unit}`)}
        {row("Taxi", `${fmt(summary.taxiFuelGal)} ${unit}`)}
        {summary.holdingFuelGal !== undefined &&
          row("Holding", `${fmt(summary.holdingFuelGal)} ${unit}`)}
        {summary.contingencyFuelGal !== undefined &&
          row("Contingency", `${fmt(summary.contingencyFuelGal)} ${unit}`)}
        <div className="border-t border-slate-600 my-2"></div>
        {row(
          "Takeoff fuel required",
          `${fmt(summary.takeoffFuelRequiredGal)} ${unit}`
        )}
      </div>
      <div className="rounded-lg border border-slate-500 bg-slate-700/30 p-3 space-y-1">
        <div className="text-sm font-semibold text-slate-200">
          Leg performance (POH)
        </div>
        {!pohData ? (
          <div className="text-xs text-slate-200/90">
            POH data not loaded. Check public/flightdata.json and Network tab.
          </div>
        ) : (
          <ul className="text-xs text-slate-200/90 space-y-1">
            {legs.map((leg, idx) => {
              const alt = Math.max(0, leg.plannedAltitudeFt ?? 0);
              const rpm = leg.cruiseRpm ?? settings.cruiseRpm ?? 2400;
              const mp = leg.cruiseManifoldInHg ?? settings.cruiseManifoldInHg;
              const perf = getCruiseAtAltitude(
                pohData,
                alt,
                rpm,
                mp,
                leg.tempBand ?? settings.tempBand ?? "std"
              );
              return (
                <li key={leg.id}>
                  Leg {idx + 1}: Alt {alt.toFixed(0)} ft, RPM {rpm}
                  {mp ? `, MP ${mp.toFixed(1)} inHg` : ", MP auto"}
                  {" \u2192 "}
                  KTAS {perf?.ktas ?? "-"}, GPH {perf?.gph ?? "-"}
                  {leg.tempBand ? ` (Temp ${labelTemp(leg.tempBand)})` : ""}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function labelTemp(t: "std" | "stdMinus20C" | "stdPlus20C") {
  switch (t) {
    case "stdMinus20C":
      return "ISA -20C";
    case "stdPlus20C":
      return "ISA +20C";
    default:
      return "ISA";
  }
}
