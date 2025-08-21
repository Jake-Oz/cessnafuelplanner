import fs from "fs";
import path from "path";

interface TempBand {
  bhpPercent?: number;
  bhp?: number;
  ktas: number;
  gph: number;
}
interface PerfRow {
  manifoldPressureInHg: number;
  stdMinus20C: TempBand;
  std: TempBand;
  stdPlus20C: TempBand;
}
interface RpmBlock {
  rpm: number;
  performance: PerfRow[];
}
interface AltBlock {
  pressureAltitudeFt: number | "S.L.";
  dataByRpm: RpmBlock[];
}

interface CruiseData {
  cruisePerformance: { dataByAltitude: AltBlock[] };
}

function loadJson(file: string): CruiseData {
  const raw = fs.readFileSync(file, "utf8");
  return JSON.parse(raw);
}

function findAltBlocks(data: CruiseData) {
  return data.cruisePerformance.dataByAltitude.map(
    (ab) => ab.pressureAltitudeFt
  );
}

function collectPerfIndex(
  data: CruiseData
): Array<PerfRow & { rpm: number; altitude: string }> {
  const index: Array<PerfRow & { rpm: number; altitude: string }> = [];
  for (const alt of data.cruisePerformance.dataByAltitude) {
    for (const rpmBlock of alt.dataByRpm) {
      for (const row of rpmBlock.performance) {
        index.push({
          ...row,
          rpm: rpmBlock.rpm,
          altitude: String(alt.pressureAltitudeFt),
        });
      }
    }
  }
  return index;
}

function main() {
  const jsonPath = path.resolve(__dirname, "../public/flightdata.json");
  const data = loadJson(jsonPath);
  console.log("Altitudes:", findAltBlocks(data));
  const rows = collectPerfIndex(data);
  console.log(`Total perf rows: ${rows.length}`);
  const zeros = rows.filter(
    (r) =>
      (r.stdMinus20C &&
        ((r.stdMinus20C as any).bhpPercent === 0 ||
          (r.stdMinus20C as any).bhp === 0 ||
          r.stdMinus20C.ktas === 0 ||
          r.stdMinus20C.gph === 0)) ||
      (r.std &&
        ((r.std as any).bhpPercent === 0 ||
          (r.std as any).bhp === 0 ||
          r.std.ktas === 0 ||
          r.std.gph === 0)) ||
      (r.stdPlus20C &&
        ((r.stdPlus20C as any).bhpPercent === 0 ||
          (r.stdPlus20C as any).bhp === 0 ||
          r.stdPlus20C.ktas === 0 ||
          r.stdPlus20C.gph === 0))
  );
  console.log("Zero placeholders found:", zeros.length);
  for (const r of zeros.slice(0, 20)) {
    console.log(
      `Alt ${r.altitude} RPM ${r.rpm} MP ${r.manifoldPressureInHg}:`,
      r
    );
  }
}

main();
