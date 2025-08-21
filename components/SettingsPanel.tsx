"use client";
import React from "react";
import { usePlannerStore } from "@/store/usePlannerStore";

export default function SettingsPanel() {
  const settings = usePlannerStore((s) => s.settings);
  const setSettings = usePlannerStore((s) => s.setSettings);

  const isL = settings.fuelUnits === "l";
  const toL = (g: number) => g * 3.78541;
  const toGal = (l: number) => l / 3.78541;
  const to1 = (n: number) => Math.round(n * 10) / 10; // one decimal place

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-50">
        Settings
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="flex flex-col text-xs text-gray-700 dark:text-slate-200">
          Fuel Units
          <select
            value={settings.fuelUnits ?? "l"}
            onChange={(e) =>
              setSettings({ fuelUnits: e.target.value as "gal" | "l" })
            }
            className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
          >
            <option value="gal">Gallons</option>
            <option value="l">Litres</option>
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-700 dark:text-slate-200">
          Holding Time (min)
          <input
            type="number"
            step={1}
            min={0}
            value={settings.holdingMinutes ?? 0}
            onChange={(e) =>
              setSettings({
                holdingMinutes: Math.max(0, Number(e.target.value) || 0),
              })
            }
            className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-700 dark:text-slate-200">
          Contingency (% of flight fuel)
          <input
            type="number"
            step={1}
            min={0}
            value={settings.contingencyPercent ?? 0}
            onChange={(e) =>
              setSettings({
                contingencyPercent: Math.max(0, Number(e.target.value) || 0),
              })
            }
            className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-700 dark:text-slate-200">
          Taxi Fuel ({isL ? "L" : "gal"})
          <input
            type="number"
            step={isL ? 0.1 : 0.1}
            value={isL ? to1(toL(settings.taxiFuelGal)) : settings.taxiFuelGal}
            onChange={(e) => {
              const n = Number(e.target.value);
              setSettings({ taxiFuelGal: isL ? toGal(n) : n });
            }}
            className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-700 dark:text-slate-200">
          Starting Fuel ({isL ? "L" : "gal"})
          <input
            type="number"
            step={isL ? 0.1 : 0.1}
            value={
              isL
                ? to1(toL(settings.startingFuelGal ?? 0))
                : settings.startingFuelGal ?? 0
            }
            onChange={(e) => {
              const n = Number(e.target.value) || 0;
              setSettings({ startingFuelGal: isL ? toGal(n) : n });
            }}
            className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-700 dark:text-slate-200">
          Reserve (min)
          <input
            type="number"
            value={settings.reserveMinutes}
            onChange={(e) =>
              setSettings({ reserveMinutes: Number(e.target.value) })
            }
            className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-700 dark:text-slate-200">
          Reserve ({isL ? "L" : "gal"}) optional
          <input
            type="number"
            step={isL ? 0.1 : 0.1}
            value={
              isL
                ? to1(toL(settings.reserveFuelGal ?? 0))
                : settings.reserveFuelGal ?? 0
            }
            onChange={(e) => {
              const raw = Number(e.target.value);
              const v =
                isNaN(raw) || raw === 0 ? undefined : isL ? toGal(raw) : raw;
              setSettings({ reserveFuelGal: v });
            }}
            className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-700 dark:text-slate-200">
          Climb GPH
          <input
            type="number"
            value={settings.climbAllowanceGPH ?? 0}
            onChange={(e) =>
              setSettings({
                climbAllowanceGPH: Number(e.target.value) || undefined,
              })
            }
            className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-700 dark:text-slate-200">
          Default Cruise KTAS
          <input
            type="number"
            value={settings.defaultCruiseKtas ?? 0}
            onChange={(e) =>
              setSettings({
                defaultCruiseKtas: Number(e.target.value) || undefined,
              })
            }
            className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-700 dark:text-slate-200">
          Climb Mode
          <select
            value={settings.climbMode ?? "normal"}
            onChange={(e) =>
              setSettings({ climbMode: e.target.value as "normal" | "max" })
            }
            className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
          >
            <option value="normal">Normal</option>
            <option value="max">Max ROC</option>
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-700 dark:text-slate-200">
          Cruise RPM
          <input
            type="number"
            value={settings.cruiseRpm ?? 2300}
            onChange={(e) => setSettings({ cruiseRpm: Number(e.target.value) })}
            className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-700 dark:text-slate-200">
          Cruise Manifold (inHg)
          <input
            type="number"
            step={0.5}
            value={settings.cruiseManifoldInHg ?? 23}
            onChange={(e) =>
              setSettings({
                cruiseManifoldInHg:
                  (Number(e.target.value) || 0) === 0
                    ? undefined
                    : Number(e.target.value),
              })
            }
            placeholder="auto"
            className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-700 dark:text-slate-200">
          Temp Band
          <select
            value={settings.tempBand ?? "std"}
            onChange={(e) =>
              setSettings({
                tempBand: e.target.value as
                  | "std"
                  | "stdMinus20C"
                  | "stdPlus20C",
              })
            }
            className="mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
          >
            <option value="stdMinus20C">Std -20°C</option>
            <option value="std">Std</option>
            <option value="stdPlus20C">Std +20°C</option>
          </select>
        </label>
      </div>
    </div>
  );
}
