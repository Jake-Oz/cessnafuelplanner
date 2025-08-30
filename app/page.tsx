"use client";
import LegEditor from "@/components/LegEditor";
import SettingsPanel from "@/components/SettingsPanel";
// Upload removed; POH auto-load happens via a helper component
import AutoLoadPOH from "@/components/AutoLoadPOH";
import Summary from "@/components/Summary";
import dynamic from "next/dynamic";
const FuelChart = dynamic(() => import("@/components/charts/FuelChart"), {
  ssr: false,
});
const FuelDistanceChart = dynamic(
  () => import("@/components/charts/FuelDistanceChart"),
  { ssr: false }
);

export default function Home() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <AutoLoadPOH />
      <div className="xl:col-span-2 space-y-6">
        <div className="rounded-lg border p-4 border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <LegEditor />
        </div>
        <FuelChart />
        <FuelDistanceChart />
      </div>
      <div className="space-y-6">
        <div className="rounded-lg border p-4 border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <SettingsPanel />
        </div>
        <div className="rounded-lg border p-4 border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <Summary />
        </div>
      </div>
    </div>
  );
}
