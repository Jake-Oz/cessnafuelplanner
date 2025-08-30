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
  Chart,
} from "chart.js";
import type {
  TooltipItem,
  Plugin,
  PointElement as PointElType,
  ChartData,
  ChartOptions,
  ChartDataset,
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

export default function FuelDistanceChart() {
  const legs = usePlannerStore((s) => s.legs);
  const settings = usePlannerStore((s) => s.settings);
  const pohData = usePlannerStore((s) => s.pohData);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<Chart<"line"> | null>(null);
  const {
    legs: computedLegs,
    cumulative,
    summary,
  } = computePlan(legs, settings, pohData);

  // Theme-aware colors
  const isDark = useTailwindDark();
  const colorText = isDark ? "#f4f4f5" : "#374151";
  const colorTick = isDark ? "#e5e7eb" : "#4b5563";
  const colorGrid = isDark ? "#27272a" : "#e5e7eb";
  const colorGuide = isDark
    ? "rgba(161,161,170,0.25)"
    : "rgba(107,114,128,0.35)";

  // Build cumulative time (min) and Time Remaining including start
  const positionsTimeRemaining = React.useMemo(() => {
    const cumulativeTimes: number[] = [];
    computedLegs.reduce((acc, r) => {
      const next = acc + r.timeMin;
      cumulativeTimes.push(next);
      return next;
    }, 0);
    const totalTimeLocal = computedLegs.reduce((a, b) => a + b.timeMin, 0);
    return [
      totalTimeLocal,
      ...cumulativeTimes.map((t) => Math.max(0, totalTimeLocal - t)),
    ];
  }, [computedLegs]);
  const waypointNames = React.useMemo(
    () =>
      positionsTimeRemaining.map((_, idx) =>
        idx === 0 ? legs[0]?.from || "START" : legs[idx - 1]?.to || `${idx}`
      ),
    [positionsTimeRemaining, legs]
  );

  // Fuel remaining including start and accounting for taxi (y-axis in this chart)
  const taxiFuelGal = summary.taxiFuelGal;
  const plannedStartGal = settings.startingFuelGal ?? summary.totalFuelGal;
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

  // Reserve (horizontal) line
  const reserveGal = summary.reserveFuelGal;
  const reserveFuelY =
    settings.fuelUnits === "l" ? toL(reserveGal) : reserveGal;

  // Holding horizontal line at Reserve + Holding
  const holdingGal = summary.holdingFuelGal ?? 0;
  const contingencyGal = summary.contingencyFuelGal ?? 0;
  const holdingY =
    reserveFuelY + (settings.fuelUnits === "l" ? toL(holdingGal) : holdingGal);
  // Contingency sits above reserve and holding
  const contingencyY =
    holdingY +
    (settings.fuelUnits === "l" ? toL(contingencyGal) : contingencyGal);

  // Compute X range (time). Extend to time when fuel would hit reserve using last leg burn.
  const totalTime = React.useMemo(
    () => computedLegs.reduce((a, b) => a + b.timeMin, 0),
    [computedLegs]
  );
  const lastFuelAtEndGal = fuelRemainingGal[fuelRemainingGal.length - 1] ?? 0;
  const lastLeg = computedLegs[computedLegs.length - 1];
  const lastLegGph = lastLeg?.averageGPH || 12; // fallback if unavailable
  const extraMinutesToReserve = React.useMemo(
    () =>
      Math.max(
        0,
        ((lastFuelAtEndGal - reserveGal) / Math.max(0.01, lastLegGph)) * 60
      ),
    [lastFuelAtEndGal, reserveGal, lastLegGph]
  );
  const xMax = Math.ceil((totalTime + extraMinutesToReserve) / 10) * 10 || 10;
  const xStep = Math.max(5, Math.round(xMax / 6));

  // Compute Y (fuel) range to include threshold lines
  const yMaxVal = Math.max(
    0,
    ...fuelRemaining,
    reserveFuelY,
    holdingY,
    contingencyY
  );
  const yMax = Math.ceil((yMaxVal || 5) / 5) * 5;
  const yStep = Math.max(1, Math.round(yMax / 5));

  // Build XY series for linear x-scale (Time Remaining) and y-scale (Fuel Remaining)
  const series = React.useMemo(
    () =>
      positionsTimeRemaining.map((timeRem, i) => ({
        x: timeRem,
        y: fuelRemaining[i],
      })),
    [positionsTimeRemaining, fuelRemaining]
  );

  const data = React.useMemo(
    () => ({
      datasets: [
        {
          label: `Fuel Remaining`,
          data: series,
          borderColor: "rgb(16, 185, 129)",
          backgroundColor: "rgba(16, 185, 129, 0.2)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
        // Horizontal reserve line across full X range
        {
          label: `Reserve (${settings.fuelUnits === "l" ? "L" : "gal"})`,
          data: [
            { x: 0, y: reserveFuelY },
            { x: xMax, y: reserveFuelY },
          ],
          borderColor: "rgb(234, 179, 8)",
          backgroundColor: "rgba(234, 179, 8, 0.0)",
          fill: false,
          borderDash: [6, 4],
          tension: 0,
          pointRadius: 0,
        },
        // Holding threshold line
        {
          label: `Reserve + Holding (${
            settings.fuelUnits === "l" ? "L" : "gal"
          })`,
          data: [
            { x: 0, y: holdingY },
            { x: xMax, y: holdingY },
          ],
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.0)",
          fill: false,
          borderDash: [4, 4],
          tension: 0,
          pointRadius: 0,
        },
        // Contingency threshold line across X range
        {
          label: `Reserve + Holding + Contingency (${
            settings.fuelUnits === "l" ? "L" : "gal"
          })`,
          data: [
            { x: 0, y: contingencyY },
            { x: xMax, y: contingencyY },
          ],
          borderColor: "rgb(244, 63, 94)",
          backgroundColor: "rgba(244, 63, 94, 0.0)",
          fill: false,
          borderDash: [2, 6],
          tension: 0,
          pointRadius: 0,
        },
        // Projection from last waypoint to reserve using last leg GPH
        {
          label: "Projection to Reserve",
          data: [
            { x: 0, y: 0 }, // placeholder, replaced below
            { x: 0, y: 0 },
          ],
          borderColor: "rgba(99,102,241,0.9)",
          backgroundColor: "rgba(99,102,241,0.0)",
          fill: false,
          borderDash: [4, 4],
          tension: 0,
          pointRadius: 0,
        },
      ],
    }),
    [series, settings.fuelUnits, reserveFuelY, xMax, holdingY, contingencyY]
  );

  const options = React.useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: { display: true, labels: { color: colorText } },
        tooltip: {
          mode: "nearest" as const,
          intersect: false,
          callbacks: {
            title(items: TooltipItem<"line">[]) {
              const it = items[0];
              const x = it.parsed.x as number;
              return `Time Remaining: ${Math.round(x)} min`;
            },
            label(it: TooltipItem<"line">) {
              const idx = it.dataIndex as number;
              const name = waypointNames[idx] ?? "";
              const y = it.parsed.y as number;
              const unit = settings.fuelUnits === "l" ? "L" : "gal";
              const parts: string[] = [];
              if (name) parts.push(`Waypoint: ${name}`);
              parts.push(`Fuel Remaining: ${y.toFixed(1)} ${unit}`);
              return parts;
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear" as const,
          min: 0,
          max: xMax,
          ticks: { color: colorTick, stepSize: xStep },
          grid: { color: colorGrid },
          title: {
            display: true,
            text: "Time Remaining (min)",
            color: colorTick,
          },
        },
        y: {
          beginAtZero: true,
          suggestedMax: yMax,
          ticks: { color: colorTick, stepSize: yStep },
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
      waypointNames,
      settings.fuelUnits,
      xMax,
      colorTick,
      xStep,
      colorGrid,
      yMax,
      yStep,
    ]
  );

  // (print config and handler defined after options)

  // (computed values moved above and memoized)

  // Plugin for waypoint guide lines and labels
  const waypointPlugin: Plugin<"line"> = {
    id: "timeWaypointPlugin",
    afterDatasetsDraw(chart) {
      const { ctx, chartArea } = chart;
      const meta = chart.getDatasetMeta(0);
      if (!meta) return;

      // Vertical guides at each waypoint x
      ctx.save();
      ctx.strokeStyle = colorGuide;
      ctx.lineWidth = 1;
      for (let i = 0; i < meta.data.length; i++) {
        const point = meta.data[i] as PointElType;
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
      ctx.fillStyle = colorTick;
      if (isDark) {
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 2;
      }
      ctx.textAlign = "center";
      for (let i = 0; i < meta.data.length; i++) {
        const point = meta.data[i] as PointElType;
        const label: string | undefined = waypointNames[i];
        if (!point || !label) continue;
        const { x, y } = point as unknown as { x: number; y: number };
        const yOffset = y < chartArea.top + 20 ? 12 : -8;
        ctx.fillText(label, x, y + yOffset);
      }
      ctx.restore();
    },
  };

  // (options is memoized above)

  // Build a print-specific config without mutating the live chart
  const buildPrintConfig = React.useCallback(() => {
    const printTick = "#111827"; // gray-900
    const printGrid = "#9ca3af"; // gray-400

    // Ensure the projection dataset is computed for print
    const computedDatasets = data.datasets.map((ds) => {
      const typed = ds as ChartDataset<"line", { x: number; y: number }[]>;
      if (typed.label === "Projection to Reserve") {
        const lastIdx = positionsTimeRemaining.length - 1;
        const x0 = positionsTimeRemaining[lastIdx];
        const y0 = fuelRemaining[lastIdx];
        const x1 = x0 + extraMinutesToReserve;
        const y1 = reserveFuelY;
        return {
          ...typed,
          data: [
            { x: x0, y: y0 },
            { x: x1, y: y1 },
          ],
        };
      }
      return { ...typed };
    });

    const printData: ChartData<"line", { x: number; y: number }[], number> = {
      datasets: computedDatasets.map((ds, idx) =>
        idx === 0
          ? ({
              ...ds,
              fill: false,
              backgroundColor: "rgba(0,0,0,0)",
            } as typeof ds)
          : ds
      ),
    };

    const printWaypointPlugin: Plugin<"line"> = {
      id: "printTimeWaypointLabels",
      afterDatasetsDraw(chart) {
        const { ctx, chartArea } = chart;
        const meta = chart.getDatasetMeta(0);
        if (!meta) return;
        ctx.save();
        ctx.strokeStyle = "rgba(107,114,128,0.35)";
        ctx.lineWidth = 1;
        for (let i = 0; i < meta.data.length; i++) {
          const point = meta.data[i] as PointElType;
          if (!point) continue;
          const { x } = point as unknown as { x: number; y: number };
          ctx.beginPath();
          ctx.moveTo(x, chartArea.top);
          ctx.lineTo(x, chartArea.bottom);
          ctx.stroke();
        }
        ctx.restore();

        ctx.save();
        ctx.font =
          "600 10px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
        ctx.fillStyle = printTick;
        ctx.textAlign = "center";
        for (let i = 0; i < meta.data.length; i++) {
          const point = meta.data[i] as PointElType;
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
        tooltip: { enabled: false },
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: xMax,
          ticks: { color: printTick, stepSize: xStep },
          grid: { color: printGrid },
          title: {
            display: true,
            text: "Time Remaining (min)",
            color: printTick,
          },
        },
        y: {
          beginAtZero: true,
          suggestedMax: yMax,
          ticks: { color: printTick, stepSize: yStep },
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
  }, [
    data,
    waypointNames,
    positionsTimeRemaining,
    extraMinutesToReserve,
    reserveFuelY,
    fuelRemaining,
    xMax,
    xStep,
    yMax,
    yStep,
    settings.fuelUnits,
  ]);

  const handlePrint = React.useCallback(() => {
    if (typeof window === "undefined") return;

    const chart = chartRef.current;
    let dataUrl: string | undefined;

    // Prefer an offscreen, print-styled chart snapshot
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
              dataUrl = undefined; // too small, fallback
            }
          }
        }
      }
    } catch {
      // fallback below
    }

    // Fallbacks: snapshot live chart or canvas
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
    const title = "Fuel Remaining vs Time Remaining";
    const lang = (navigator.language || "").toUpperCase();
    const pageSize = lang.includes("US") ? "letter" : "A4";

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
    page.appendChild(h1);
    page.appendChild(img);
    doc.body?.appendChild(page);
    setTimeout(() => {
      img.src = dataUrl!;
    }, 0);
  }, [buildPrintConfig]);

  return (
    <div ref={wrapperRef} className="space-y-2 print-container">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Fuel Remaining vs Time Remaining
        </h2>
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
          data={{
            ...data,
            datasets: data.datasets.map((ds) => {
              if (ds.label !== "Projection to Reserve") return ds;
              // compute projection points now that xMax is known
              const lastIdx = positionsTimeRemaining.length - 1;
              const x0 = positionsTimeRemaining[lastIdx]; // should be 0 at destination
              const y0 = fuelRemaining[lastIdx];
              const x1 = x0 + extraMinutesToReserve;
              const y1 = reserveFuelY;
              return {
                ...ds,
                data: [
                  { x: x0, y: y0 },
                  { x: x1, y: y1 },
                ],
              } as import("chart.js").ChartDataset<
                "line",
                { x: number; y: number }[]
              >;
            }),
          }}
          options={options}
          plugins={[waypointPlugin]}
        />
      </div>
    </div>
  );
}
