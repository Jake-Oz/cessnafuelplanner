"use client";
import React from "react";
import HydrateStore from "@/components/HydrateStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <HydrateStore>{children}</HydrateStore>;
}
