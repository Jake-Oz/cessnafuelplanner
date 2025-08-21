"use client";
import React, { useRef } from "react";
import { usePlannerStore } from "@/store/usePlannerStore";
import { FlightPOHSchema } from "@/lib/pohSchema";
import type { FlightPOHData } from "@/types/poh";

export default function PerformanceLoader() {
  const setPohData = usePlannerStore((s) => s.setPohData);
  const inputRefPOH = useRef<HTMLInputElement>(null);

  const parseAndSetPOH = (raw: unknown) => {
    const pohTry = FlightPOHSchema.safeParse(raw);
    if (pohTry.success) {
      setPohData(pohTry.data);
      return { kind: "poh" as const };
    }
    return { kind: "error" as const, pohIssues: pohTry.error.issues };
  };

  // No profiles upload; POH only.

  const onFilePOH = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = parseAndSetPOH(json);
      if (res.kind === "error") {
        console.error("POH issues:", res.pohIssues);
        alert("Invalid JSON: does not match POH schema.");
      }
    } catch (e) {
      console.error(e);
      alert("Invalid JSON file (parse error).");
    }
  };

  const loadBundledPOH = async () => {
    try {
      const res = await fetch("/flightdata.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const parsed = FlightPOHSchema.parse(json) as FlightPOHData;
      setPohData(parsed);
    } catch (e) {
      console.error(e);
      alert(
        "Could not load /flightdata.json. Place your file in the public folder as flightdata.json or use Upload POH JSON."
      );
    }
  };

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Performance Data</h2>
      <p className="text-sm text-zinc-400">
        Load the POH-format flightdata.json. This enables automatic climb on the
        first leg and cruise thereafter.
      </p>
      <div className="flex items-center gap-2">
        <input
          ref={inputRefPOH}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) =>
            e.target.files && e.target.files[0] && onFilePOH(e.target.files[0])
          }
        />
        <button
          onClick={() => inputRefPOH.current?.click()}
          className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
        >
          Upload POH JSON
        </button>

        <button
          onClick={loadBundledPOH}
          className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm"
        >
          Load /flightdata.json
        </button>
      </div>
    </div>
  );
}
