"use client";
import { create } from "zustand";
import { WaypointLeg, FuelPlanSettings } from "@/types/flight";
import type { FlightPOHData } from "@/types/poh";
import { distanceNmBetweenAirfields, findAirfieldByCode } from "@/lib/airfields";

export interface PlannerState {
  legs: WaypointLeg[];
  settings: FuelPlanSettings;
  pohData?: FlightPOHData;
}

export interface PlannerActions {
  addLeg: (leg: WaypointLeg) => void;
  updateLeg: (id: string, patch: Partial<WaypointLeg>) => void;
  removeLeg: (id: string) => void;
  reorderLegs: (idsInOrder: string[]) => void;
  setSettings: (patch: Partial<FuelPlanSettings>) => void;
  setPohData: (data?: FlightPOHData) => void;
  reset: () => void;
}

function createLeg(
  id: string,
  from: string,
  to: string,
  plannedAltitudeFt: number,
  fromSource: WaypointLeg["fromSource"] = "manual"
): WaypointLeg {
  const fromAirfield = findAirfieldByCode(from);
  const toAirfield = findAirfieldByCode(to);
  const distanceNM =
    fromAirfield && toAirfield
      ? Math.round(distanceNmBetweenAirfields(fromAirfield, toAirfield))
      : 100;

  return {
    id,
    from,
    to,
    fromSource,
    distanceNM,
    distanceSource: fromAirfield && toAirfield ? "airfield" : "manual",
    fromElevationFt: fromAirfield?.elevationFt,
    toElevationFt: toAirfield?.elevationFt,
    plannedAltitudeFt,
    plannedTimeSource: "auto",
  };
}

const defaultLegs = [
  createLeg("leg-1", "YSSY", "YSCB", 8000),
  createLeg("leg-2", "YSCB", "YMML", 9000, "auto"),
];

const defaultState: PlannerState = {
  legs: defaultLegs,
  settings: {
    // Default taxi fuel: 6 litres, stored internally in gallons
    taxiFuelGal: 1.585, // ~= 6 L
    startFieldElevationFt: defaultLegs[0]?.fromElevationFt ?? 0,
    // Default starting fuel: 333 litres, stored internally in gallons
    startingFuelGal: 87.964, // ~= 333 L
    reserveMinutes: 30,
    climbAllowanceGPH: 15,
    defaultCruiseKtas: 135,
    cruiseRpm: 2300,
    cruiseManifoldInHg: 23,
    fuelUnits: "l",
    holdingPercent: 0,
    contingencyPercent: 0,
    holdingMinutes: 0,
  },
  pohData: undefined,
};

export const usePlannerStore = create<PlannerState & PlannerActions>((set) => ({
  ...defaultState,
  addLeg: (leg) => set((s) => ({ legs: [...s.legs, leg] })),
  updateLeg: (id, patch) =>
    set((s) => {
      const changedIndex = s.legs.findIndex((leg) => leg.id === id);
      if (changedIndex === -1) return {};

      const legs = s.legs.map((leg, index) =>
        index === changedIndex ? applyRouteData({ ...leg, ...patch }) : leg
      );

      const changedLeg = legs[changedIndex];
      const nextLeg = legs[changedIndex + 1];
      const shouldSyncNextFrom =
        patch.to !== undefined &&
        nextLeg &&
        nextLeg.fromSource !== "manual";

      if (shouldSyncNextFrom) {
        legs[changedIndex + 1] = applyRouteData({
          ...nextLeg,
          from: changedLeg.to,
          fromSource: "auto",
          distanceSource:
            nextLeg.distanceSource === "manual" ? "manual" : "airfield",
          ...(nextLeg.plannedTimeSource === "manual"
            ? {}
            : { plannedTimeSource: "auto", plannedTimeMin: undefined }),
        });
      }

      return { legs };
    }),
  removeLeg: (id) =>
    set((s) => ({ legs: syncAutoFromFields(s.legs.filter((l) => l.id !== id)) })),
  reorderLegs: (ids) =>
    set((s) => ({
      legs: syncAutoFromFields(
        ids.map((id) => s.legs.find((l) => l.id === id)!).filter(Boolean)
      ),
    })),
  setSettings: (patch) =>
    set((s) => ({ settings: { ...s.settings, ...patch } })),
  setPohData: (data) => set(() => ({ pohData: data })),
  reset: () => set(() => ({ ...defaultState, legs: [] })),
}));

function applyRouteData(leg: WaypointLeg): WaypointLeg {
  const fromAirfield = findAirfieldByCode(leg.from);
  const toAirfield = findAirfieldByCode(leg.to);
  const shouldUseAirfieldDistance =
    fromAirfield && toAirfield && leg.distanceSource !== "manual";

  return {
    ...leg,
    fromElevationFt: fromAirfield?.elevationFt,
    toElevationFt: toAirfield?.elevationFt,
    ...(shouldUseAirfieldDistance
      ? {
          distanceNM: Math.round(
            distanceNmBetweenAirfields(fromAirfield, toAirfield)
          ),
          distanceSource: "airfield" as const,
        }
      : {}),
  };
}

function syncAutoFromFields(legs: WaypointLeg[]): WaypointLeg[] {
  return legs.map((leg, index, all) => {
    if (index === 0 || leg.fromSource === "manual") {
      return applyRouteData(leg);
    }

    const previous = all[index - 1];
    return applyRouteData({
      ...leg,
      from: previous?.to ?? leg.from,
      fromSource: "auto",
      distanceSource: leg.distanceSource === "manual" ? "manual" : "airfield",
      ...(leg.plannedTimeSource === "manual"
        ? {}
        : { plannedTimeSource: "auto", plannedTimeMin: undefined }),
    });
  });
}
