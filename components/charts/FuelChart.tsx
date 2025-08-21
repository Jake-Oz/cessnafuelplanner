"use client";
import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import type {
  TooltipItem,
  Plugin,
  ChartDataset,
  Chart,
  ChartData,
  ChartOptions,
} from "chart.js";
import { usePlannerStore } from "@/store/usePlannerStore";
import { computePlan } from "@/lib/calc";
import { useTailwindDark } from "@/hooks/useTailwindDark";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
);

export default function FuelChart() {
  const legs = usePlannerStore((s) => s.legs);
  const settings = usePlannerStore((s) => s.settings);
  const pohData = usePlannerStore((s) => s.pohData);
  const { cumulative, summary } = computePlan(legs, settings, pohData);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<Chart<"line"> | null>(null);

  // Theme-aware colors (respect Tailwind 'dark' class)
  const isDark = useTailwindDark();
  const colorText = isDark ? "#f4f4f5" : "#374151";
  const colorTick = isDark ? "#e5e7eb" : "#4b5563";
  const colorGrid = isDark ? "#27272a" : "#e5e7eb";
  const colorGuide = isDark
    ? "rgba(161,161,170,0.25)"
    : "rgba(107,114,128,0.35)";

  // Build cumulative distance positions (NM) and waypoint names including start
  const positionsNm = React.useMemo(
    () => [0, ...cumulative.map((c) => c.distanceNM)],
    [cumulative]
  );
  const waypointNames = React.useMemo(
    () =>
      positionsNm.map((_, idx) =>
        idx === 0 ? legs[0]?.from || "START" : legs[idx - 1]?.to || `${idx}`
      ),
    [positionsNm, legs]
  );

  // Fuel remaining series values
  const totalFuelPlanned = summary.totalFuelGal;
  const taxiFuelGal = summary.taxiFuelGal;
  const plannedStartGal = settings.startingFuelGal ?? totalFuelPlanned;
  const startAfterTaxiGal = Math.max(0, plannedStartGal - taxiFuelGal);
  const fuelRemainingGal = React.useMemo(
    () => [
      startAfterTaxiGal,
      ...cumulative.map((c) => Math.max(0, startAfterTaxiGal - c.fuelGal)),
    ],
    [cumulative, startAfterTaxiGal]
  );
  const toL = (g: number) => g * 3.78541;
  const fuelRemaining =
    settings.fuelUnits === "l" ? fuelRemainingGal.map(toL) : fuelRemainingGal;

  // Minimum required, holding and contingency lines
  const fuelUsedSoFarGal = [0, ...cumulative.map((c) => c.fuelGal)];
  const reserveGal = summary.reserveFuelGal;
  const totalFlightFuelGal = summary.totalFuelGal;
  const minRequiredGal = fuelUsedSoFarGal.map((used) =>
    Math.max(0, reserveGal + (totalFlightFuelGal - used))
  );
  const minRequired =
    settings.fuelUnits === "l" ? minRequiredGal.map(toL) : minRequiredGal;

  const holdingGal = summary.holdingFuelGal ?? 0;
  const contingencyGal = summary.contingencyFuelGal ?? 0;
  const holdingOffset =
    settings.fuelUnits === "l" ? toL(holdingGal) : holdingGal;
  const contingencyOffset =
    settings.fuelUnits === "l" ? toL(contingencyGal) : contingencyGal;
  const minPlusHolding = minRequired.map((v) => v + holdingOffset);
  const minHoldingContingency = minPlusHolding.map(
    (v) => v + contingencyOffset
  );

  // XY points for linear x-scale
  const series: { x: number; y: number; name?: string }[] = React.useMemo(
    () =>
      positionsNm.map((x, i) => ({
        x,
        y: fuelRemaining[i],
        name: waypointNames[i],
      })),
    [positionsNm, fuelRemaining, waypointNames]
  );

  // Plugin to render waypoint labels near each point
  const waypointLabelPlugin: Plugin<"line"> = React.useMemo(
    () => ({
      id: "waypointLabelPlugin",
      afterDatasetsDraw(chart) {
        const { ctx, chartArea } = chart;
        const meta = chart.getDatasetMeta(0);
        const ds = chart.data.datasets[0] as ChartDataset<
          "line",
          { x: number; y: number; name?: string }[]
        >;
        if (!meta || !ds) return;

        // Draw vertical guide lines at waypoint positions
        ctx.save();
        ctx.strokeStyle = colorGuide;
        ctx.lineWidth = 1;
        for (let i = 0; i < meta.data.length; i++) {
          const point = meta.data[i] as PointElement;
          if (!point) continue;
          const { x } = point as unknown as { x: number; y: number };
          ctx.beginPath();
          ctx.moveTo(x, chartArea.top);
          ctx.lineTo(x, chartArea.bottom);
          ctx.stroke();
        }
        ctx.restore();

        // Draw waypoint labels near each point
        ctx.save();
        ctx.font =
          "600 10px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
        ctx.fillStyle = colorTick;
        if (isDark) {
          ctx.shadowColor = "rgba(0,0,0,0.6)";
          ctx.shadowBlur = 2;
        }
        ctx.textAlign = "center";
        for (let i = 0; i < meta.data.length; i++) {
          const point = meta.data[i] as PointElement;
          const datum = ds.data[i] as { x: number; y: number; name?: string };
          const label: string | undefined = datum?.name;
          if (!point || !label) continue;
          const { x, y } = point as unknown as { x: number; y: number };
          const yOffset = y < chartArea.top + 20 ? 12 : -8;
          ctx.fillText(label, x, y + yOffset);
        }
        ctx.restore();
      },
    }),
    [colorGuide, colorTick, isDark]
  );

  // Compute a "nice" y-axis range and step
  const yMax = React.useMemo(() => {
    const maxFuel = Math.max(
      0,
      ...fuelRemaining,
      ...minRequired,
      ...minPlusHolding,
      ...minHoldingContingency
    );
    return Math.ceil(maxFuel / 5) * 5 || 5;
  }, [fuelRemaining, minRequired, minPlusHolding, minHoldingContingency]);
  const step = React.useMemo(() => Math.max(1, Math.round(yMax / 5)), [yMax]);

  const data: ChartData<
    "line",
    { x: number; y: number; name?: string }[],
    number
  > = React.useMemo(
    () => ({
      datasets: [
        {
          label: `Fuel Remaining (${settings.fuelUnits === "l" ? "L" : "gal"})`,
          data: series,
          borderColor: "rgb(99, 102, 241)",
          backgroundColor: "rgba(99, 102, 241, 0.2)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: `Min Required (${settings.fuelUnits === "l" ? "L" : "gal"})`,
          data: positionsNm.map((x, i) => ({
            x,
            y: minRequired[i],
            name: waypointNames[i],
          })),
          borderColor: "rgb(234, 179, 8)",
          backgroundColor: "rgba(234, 179, 8, 0.15)",
          fill: false,
          borderDash: [6, 4],
          tension: 0,
          pointRadius: 2,
        },
        // Holding line (Min Required + holding amount)
        {
          label: `Min + Holding (${settings.fuelUnits === "l" ? "L" : "gal"})`,
          data: positionsNm.map((x, i) => ({
            x,
            y: minPlusHolding[i],
            name: waypointNames[i],
          })),
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.0)",
          fill: false,
          borderDash: [4, 4],
          tension: 0,
          pointRadius: 0,
        },
        // Contingency line (Min + Holding + Contingency)
        {
          label: `Min + Holding + Contingency (${
            settings.fuelUnits === "l" ? "L" : "gal"
          })`,
          data: positionsNm.map((x, i) => ({
            x,
            y: minHoldingContingency[i],
            name: waypointNames[i],
          })),
          borderColor: "rgb(244, 63, 94)",
          backgroundColor: "rgba(244, 63, 94, 0.0)",
          fill: false,
          borderDash: [2, 6],
          tension: 0,
          pointRadius: 0,
        },
      ],
    }),
    [
      settings.fuelUnits,
      series,
      positionsNm,
      minRequired,
      waypointNames,
      minPlusHolding,
      minHoldingContingency,
    ]
  );

  const options: ChartOptions<"line"> = React.useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: { display: true, labels: { color: colorText } },
        tooltip: {
          mode: "nearest",
          intersect: false,
          callbacks: {
            title(items: TooltipItem<"line">[]) {
              const it = items[0];
              const x = it.parsed.x as number;
              return `Distance: ${Math.round(x)} NM`;
            },
            label(it: TooltipItem<"line">) {
              const idx = it.dataIndex as number;
              const name = waypointNames[idx] ?? "";
              const y = it.parsed.y as number;
              const unit = settings.fuelUnits === "l" ? "L" : "gal";
              const label = it.dataset.label ?? "";
              const parts: string[] = [];
              if (name) parts.push(`Waypoint: ${name}`);
              parts.push(`${label}: ${y.toFixed(1)} ${unit}`);
              return parts;
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          suggestedMax:
            Math.ceil((positionsNm[positionsNm.length - 1] || 0) / 50) * 50 ||
            50,
          ticks: { color: colorTick, stepSize: 50 },
          grid: { color: colorGrid },
          title: { display: true, text: "Distance (NM)", color: colorTick },
        },
        y: {
          beginAtZero: true,
          suggestedMax: yMax,
          ticks: { color: colorTick, stepSize: step },
          grid: { color: colorGrid },
          title: {
            display: true,
            text: `Fuel Remaining (${
              settings.fuelUnits === "l" ? "L" : "gal"
            })`,
            color: colorTick,
          },
        },
      },
    }),
    [
      colorText,
      positionsNm,
      colorTick,
      colorGrid,
      yMax,
      step,
      waypointNames,
      settings.fuelUnits,
    ]
  );

  // Build a print-specific config without mutating the live chart
  const buildPrintConfig = React.useCallback(() => {
    const printTick = "#111827"; // gray-900
    const printGrid = "#9ca3af"; // gray-400

    const printData: ChartData<
      "line",
      { x: number; y: number; name?: string }[],
      number
    > = {
      datasets: data.datasets.map((ds, idx) => {
        const typed = ds as ChartDataset<
          "line",
          { x: number; y: number; name?: string }[]
        >;
        if (idx === 0) {
          // Fuel Remaining line: remove fill for print
          return {
            ...typed,
            fill: false,
            backgroundColor: "rgba(0,0,0,0)",
          } as typeof typed;
        }
        return { ...typed } as typeof typed;
      }),
    };

    const printWaypointPlugin: Plugin<"line"> = {
      id: "printWaypointLabels",
      afterDatasetsDraw(chart) {
        const { ctx, chartArea } = chart;
        const meta = chart.getDatasetMeta(0);
        if (!meta) return;

        // Vertical guides at each waypoint x
        ctx.save();
        ctx.strokeStyle = "rgba(107,114,128,0.35)";
        ctx.lineWidth = 1;
        for (let i = 0; i < meta.data.length; i++) {
          const point = meta.data[i] as PointElement;
          if (!point) continue;
          const { x } = point as unknown as { x: number; y: number };
          ctx.beginPath();
          ctx.moveTo(x, chartArea.top);
          ctx.lineTo(x, chartArea.bottom);
          ctx.stroke();
        }
        ctx.restore();

        // Labels near points
        ctx.save();
        ctx.font =
          "600 10px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
        ctx.fillStyle = printTick;
        ctx.textAlign = "center";
        for (let i = 0; i < meta.data.length; i++) {
          const point = meta.data[i] as PointElement;
          const label: string | undefined = waypointNames[i];
          if (!point || !label) continue;
          const { x, y } = point as unknown as { x: number; y: number };
          const yOffset = y < chartArea.top + 20 ? 12 : -8;
          ctx.fillText(label, x, y + yOffset);
        }
        ctx.restore();
      },
    };

    const printOptions: ChartOptions<"line"> = {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: printTick } },
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          suggestedMax:
            Math.ceil((positionsNm[positionsNm.length - 1] || 0) / 50) * 50 ||
            50,
          ticks: { stepSize: 50, color: printTick },
          grid: { color: printGrid },
          title: { display: true, text: "Distance (NM)", color: printTick },
        },
        y: {
          beginAtZero: true,
          suggestedMax: yMax,
          ticks: { stepSize: step, color: printTick },
          grid: { color: printGrid },
          title: {
            display: true,
            text: `Fuel Remaining (${
              settings.fuelUnits === "l" ? "L" : "gal"
            })`,
            color: printTick,
          },
        },
      },
      animation: false,
    };

    return {
      data: printData,
      options: printOptions,
      plugins: [printWaypointPlugin],
    };
  }, [data, waypointNames, positionsNm, yMax, step, settings.fuelUnits]);

  const handlePrint = React.useCallback(() => {
    if (typeof window === "undefined") return;

    const chart = chartRef.current;
    let dataUrl: string | undefined;

    // Try an offscreen, print-styled chart for the snapshot
    try {
      if (chart) {
        const liveCanvas = wrapperRef.current?.querySelector(
          "canvas"
        ) as HTMLCanvasElement | null;
        const rect = liveCanvas?.getBoundingClientRect();
        const cssWidth = rect?.width || 0;
        const cssHeight = rect?.height || 0;
        const chartWidth = Math.round(cssWidth);
        const chartHeight = Math.round(cssHeight);
        if (chartWidth > 0 && chartHeight > 0) {
          const offCanvas = document.createElement("canvas");
          const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
          offCanvas.width = Math.round(chartWidth * dpr);
          offCanvas.height = Math.round(chartHeight * dpr);
          offCanvas.style.width = `${chartWidth}px`;
          offCanvas.style.height = `${chartHeight}px`;
          const ctx = offCanvas.getContext("2d");
          if (ctx) {
            const printCfg = buildPrintConfig();
            const tmpChart = new ChartJS(ctx, {
              type: "line",
              data: printCfg.data,
              options: printCfg.options,
              plugins: printCfg.plugins,
            });
            tmpChart.update("none");
            dataUrl = offCanvas.toDataURL("image/png");
            tmpChart.destroy();
            if (dataUrl && dataUrl.length < 1000) {
              // too small to be valid image, force fallback
              dataUrl = undefined;
            }
          }
        }
      }
    } catch {
      // fall back below
    }

    // Fallback: snapshot the live chart
    if (!dataUrl) {
      try {
        if (chart && typeof chart.toBase64Image === "function") {
          dataUrl = chart.toBase64Image();
        }
      } catch {}
    }
    if (!dataUrl) {
      const canvas = wrapperRef.current?.querySelector(
        "canvas"
      ) as HTMLCanvasElement | null;
      if (canvas) dataUrl = canvas.toDataURL("image/png");
    }
    if (!dataUrl) return;

    const printWin = window.open("", "_blank");
    if (!printWin) return;
    const title = "Fuel Remaining vs Distance";
    const lang = (navigator.language || "").toUpperCase();
    const pageSize = lang.includes("US") ? "letter" : "A4";

    // Minimal document with image and onload print
    const doc = printWin.document;
    doc.open();
    doc.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${title}</title></head><body></body></html>`
    );
    doc.close();
    const style = doc.createElement("style");
    style.textContent = `@page { size: ${pageSize} landscape; margin: 10mm; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      body { background: #fff; color: #000; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
      .page { display: flex; flex-direction: column; align-items: center; gap: 8px; }
      h1 { font-size: 16px; margin: 0; }
      img { max-width: 100%; height: auto; page-break-inside: avoid; }`;
    doc.head?.appendChild(style);
    const page = doc.createElement("div");
    page.className = "page";
    const h1 = doc.createElement("h1");
    h1.textContent = title;
    const img = doc.createElement("img");
    img.alt = title;
    img.onload = () => {
      printWin.focus();
      setTimeout(() => {
        printWin.print();
        printWin.close();
      }, 50);
    };
    img.onerror = () => {
      printWin.focus();
      setTimeout(() => {
        printWin.print();
        printWin.close();
      }, 200);
    };
    // Append first, set src after append to avoid some browsers skipping onload for cached data URLs
    page.appendChild(h1);
    page.appendChild(img);
    doc.body?.appendChild(page);
    // Defer setting src to ensure layout
    setTimeout(() => {
      img.src = dataUrl!;
    }, 0);
  }, [buildPrintConfig]);

  return (
    <div ref={wrapperRef} className="space-y-2 print-container">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Fuel Remaining vs Distance</h2>
        <button
          type="button"
          onClick={handlePrint}
          className="no-print px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
        >
          Print
        </button>
      </div>
      <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-4">
        <Line
          ref={chartRef}
          data={data}
          options={options}
          plugins={[waypointLabelPlugin]}
        />
      </div>
    </div>
  );
}
