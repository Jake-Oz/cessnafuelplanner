## Cessna 182S Fuel Planner (Next.js)

What’s inside

- Next.js App Router + Tailwind UI
- Flight legs editor, settings, summary
- Performance JSON loader (validate with Zod)
- Charts: Fuel vs Time and Fuel vs Distance

How to run

1. npm run dev
2. Open http://localhost:3000

Quick test

- In the Performance Data panel, upload public/sample-performance.json
- In each leg, pick a matching Performance Profile

JSON shape (simplified)
{
"aircraft": "Cessna 182S",
"profiles": [
{
"id": "cruise-65pct-8000",
"name": "Cruise 65% @8000 ft",
"phase": "cruise",
"points": [ { "altitudeFt": 8000, "percentPower": 65, "fuelFlowGPH": 11, "ktas": 135 } ]
}
]
}

Notes

- This is a planning aid. Always cross-check with the official POH and real-world performance.
