"use client";
import React, { useEffect, useState } from "react";
import { usePlannerStore } from "@/store/usePlannerStore";

export default function HydrateStore({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = (usePlannerStore as unknown as any).persist;
        if (api && typeof api.rehydrate === "function") {
          await api.rehydrate();
        }
      } catch {
        // If persisted state is corrupted, clear it and continue
        try {
          localStorage.removeItem("planner-state");
        } catch {}
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  if (!ready) return null;
  return <>{children}</>;
}
