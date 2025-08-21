"use client";
import LegEditor from "@/components/LegEditor";
import SettingsPanel from "@/components/SettingsPanel";
// Upload removed; POH auto-load happens via a helper component
import AutoLoadPOH from "@/components/AutoLoadPOH";
import Summary from "@/components/Summary";
import dynamic from "next/dynamic";
import { useTailwindDark } from "@/hooks/useTailwindDark";
import clsx from "clsx";
const FuelChart = dynamic(() => import("@/components/charts/FuelChart"), {
  ssr: false,
});
const FuelDistanceChart = dynamic(
  () => import("@/components/charts/FuelDistanceChart"),
  { ssr: false }
);

export default function Home() {
  const isDark = useTailwindDark();
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <AutoLoadPOH />
      <div className="xl:col-span-2 space-y-6">
        <div
          className={clsx(
            "rounded-lg border p-4",
            isDark
              ? "border-slate-400 bg-slate-500"
              : "border-gray-200 bg-white"
          )}
        >
          <LegEditor />
        </div>
        <FuelChart />
        <FuelDistanceChart />
      </div>
      <div className="space-y-6">
        <div
          className={clsx(
            "rounded-lg border p-4",
            isDark
              ? "border-slate-400 bg-slate-500"
              : "border-gray-200 bg-white"
          )}
        >
          <SettingsPanel />
        </div>
        <div
          className={clsx(
            "rounded-lg border p-4",
            isDark
              ? "border-slate-400 bg-slate-500"
              : "border-gray-200 bg-white"
          )}
        >
          <Summary />
        </div>
      </div>
    </div>
  );
}
