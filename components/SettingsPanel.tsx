"use client";
import React from "react";
import { usePlannerStore } from "@/store/usePlannerStore";

const inputClass =
  "mt-1 rounded border px-2 py-1.5 text-sm bg-white text-gray-900 border-gray-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600";
const labelClass = "flex flex-col text-xs text-gray-700 dark:text-slate-200";

export default function SettingsPanel() {
  const settings = usePlannerStore((s) => s.settings);
  const setSettings = usePlannerStore((s) => s.setSettings);

  const isL = settings.fuelUnits === "l";
  const toL = (g: number) => g * 3.78541;
  const toGal = (l: number) => l / 3.78541;
  const to1 = (n: number) => Math.round(n * 10) / 10;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-50">
          Settings
        </h2>
        <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">
          Route distance and departure elevation can fill from Australian
          airfield codes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Fuel Units
          <select
            value={settings.fuelUnits ?? "l"}
            onChange={(e) =>
              setSettings({ fuelUnits: e.target.value as "gal" | "l" })
            }
            className={inputClass}
          >
            <option value="gal">Gallons</option>
            <option value="l">Litres</option>
          </select>
        </label>
        <label className={labelClass}>
          Starting Fuel ({isL ? "L" : "gal"})
          <input
            type="number"
            step={0.1}
            value={
              isL
                ? to1(toL(settings.startingFuelGal ?? 0))
                : settings.startingFuelGal ?? 0
            }
            onChange={(e) => {
              const n = Number(e.target.value) || 0;
              setSettings({ startingFuelGal: isL ? toGal(n) : n });
            }}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Reserve (min)
          <input
            type="number"
            min={0}
            value={settings.reserveMinutes}
            onChange={(e) =>
              setSettings({
                reserveMinutes: Math.max(0, Number(e.target.value) || 0),
              })
            }
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
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
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Contingency (%)
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
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Taxi Fuel ({isL ? "L" : "gal"})
          <input
            type="number"
            step={0.1}
            value={isL ? to1(toL(settings.taxiFuelGal)) : settings.taxiFuelGal}
            onChange={(e) => {
              const n = Number(e.target.value) || 0;
              setSettings({ taxiFuelGal: isL ? toGal(n) : n });
            }}
            className={inputClass}
          />
        </label>
      </div>

      <details className="rounded border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
        <summary className="cursor-pointer text-sm font-semibold text-gray-800 dark:text-slate-100">
          Aircraft and POH options
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className={labelClass}>
            Start Elevation (ft)
            <input
              type="number"
              step={50}
              min={-1000}
              value={settings.startFieldElevationFt ?? 0}
              onChange={(e) =>
                setSettings({
                  startFieldElevationFt: Number(e.target.value) || 0,
                })
              }
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Fixed Reserve ({isL ? "L" : "gal"})
            <input
              type="number"
              step={0.1}
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
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Climb GPH
            <input
              type="number"
              value={settings.climbAllowanceGPH ?? 0}
              onChange={(e) =>
                setSettings({
                  climbAllowanceGPH: Number(e.target.value) || undefined,
                })
              }
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Default Cruise KTAS
            <input
              type="number"
              value={settings.defaultCruiseKtas ?? 0}
              onChange={(e) =>
                setSettings({
                  defaultCruiseKtas: Number(e.target.value) || undefined,
                })
              }
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Climb Mode
            <select
              value={settings.climbMode ?? "normal"}
              onChange={(e) =>
                setSettings({ climbMode: e.target.value as "normal" | "max" })
              }
              className={inputClass}
            >
              <option value="normal">Normal</option>
              <option value="max">Max ROC</option>
            </select>
          </label>
          <label className={labelClass}>
            Cruise RPM
            <input
              type="number"
              value={settings.cruiseRpm ?? 2300}
              onChange={(e) =>
                setSettings({ cruiseRpm: Number(e.target.value) })
              }
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
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
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
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
              className={inputClass}
            >
              <option value="stdMinus20C">Std -20°C</option>
              <option value="std">Std</option>
              <option value="stdPlus20C">Std +20°C</option>
            </select>
          </label>
        </div>
      </details>
    </div>
  );
}
