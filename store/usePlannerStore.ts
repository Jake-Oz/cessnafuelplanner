"use client";
import { create } from "zustand";
import { WaypointLeg, FuelPlanSettings } from "@/types/flight";
import type { FlightPOHData } from "@/types/poh";

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

const defaultState: PlannerState = {
  legs: [
    {
      id: "leg-1", // stable id to avoid hydration key mismatch
      from: "KABC",
      to: "KDEF",
      distanceNM: 120,
      plannedAltitudeFt: 8000,
    },
    {
      id: "leg-2", // stable id to avoid hydration key mismatch
      from: "KDEF",
      to: "KGHI",
      distanceNM: 250,
      plannedAltitudeFt: 9000,
    },
  ],
  settings: {
    // Default taxi fuel: 6 litres, stored internally in gallons
    taxiFuelGal: 1.585, // ~= 6 L
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
    set((s) => ({
      legs: s.legs.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),
  removeLeg: (id) => set((s) => ({ legs: s.legs.filter((l) => l.id !== id) })),
  reorderLegs: (ids) =>
    set((s) => ({
      legs: ids.map((id) => s.legs.find((l) => l.id === id)!).filter(Boolean),
    })),
  setSettings: (patch) =>
    set((s) => ({ settings: { ...s.settings, ...patch } })),
  setPohData: (data) => set(() => ({ pohData: data })),
  reset: () => set(() => ({ ...defaultState, legs: [] })),
}));
