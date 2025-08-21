const fs = require("fs");
const path = require("path");

const jsonPath = path.resolve(__dirname, "../public/flightdata.json");
const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

const zeros = [];

for (const alt of data.cruisePerformance.dataByAltitude) {
  const altitude = String(alt.pressureAltitudeFt);
  for (const rpmBlock of alt.dataByRpm) {
    const rpm = rpmBlock.rpm;
    for (const row of rpmBlock.performance) {
      const mp = row.manifoldPressureInHg;
      const bands = [
        ["stdMinus20C", row.stdMinus20C],
        ["std", row.std],
        ["stdPlus20C", row.stdPlus20C],
      ];
      for (const [name, band] of bands) {
        if (!band) continue;
        const hasZero = [band.bhpPercent, band.bhp, band.ktas, band.gph].some(
          (v) => v === 0
        );
        if (hasZero) {
          zeros.push({ altitude, rpm, mp, band: name, bandData: band });
        }
      }
    }
  }
}

console.log(`Zero placeholders: ${zeros.length}`);
for (const z of zeros) {
  console.log(
    `Alt ${z.altitude} RPM ${z.rpm} MP ${z.mp} Band ${z.band}:`,
    z.bandData
  );
}
