"use client";
import { useEffect } from "react";
import { usePlannerStore } from "@/store/usePlannerStore";
import { FlightPOHSchema } from "@/lib/pohSchema";
import type { FlightPOHData } from "@/types/poh";

export default function AutoLoadPOH() {
  const setPohData = usePlannerStore((s) => s.setPohData);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/flightdata.json", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const parsed = FlightPOHSchema.parse(json) as FlightPOHData;
        if (mounted) setPohData(parsed);
      } catch (e) {
        console.warn("POH autoload failed", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setPohData]);
  return null;
}
