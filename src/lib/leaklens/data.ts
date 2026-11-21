// SIMULATED DATA — fictional network, not a real utility.
export type Factor = {
  key: string;
  label: string;
  weight: number;
  value: number;
  note: string;
};
export type Segment = {
  id: string;
  name: string;
  area: string;
  material: string;
  installed: number;
  path: [number, number][];
  factors: Omit<Factor, "weight" | "label">[];
};

export const WEIGHTS: Record<string, { label: string; weight: number }> = {
  leak: { label: "Leak history (5 yr)", weight: 0.3 },
  groundwater: { label: "Pipe below groundwater", weight: 0.2 },
  sewer: { label: "Sewer lateral proximity", weight: 0.2 },
  age: { label: "Material & age", weight: 0.15 },
  volatility: { label: "Pressure volatility", weight: 0.15 },
};

const f = (
  leak: number,
  groundwater: number,
  sewer: number,
  age: number,
  volatility: number,
  notes: string[],
) => [
  { key: "leak", value: leak, note: notes[0] ?? "" },
  { key: "groundwater", value: groundwater, note: notes[1] ?? "" },
  { key: "sewer", value: sewer, note: notes[2] ?? "" },
  { key: "age", value: age, note: notes[3] ?? "" },
  { key: "volatility", value: volatility, note: notes[4] ?? "" },
];

export const SEGMENTS: Segment[] = [
  {
    id: "S-114",
    name: "Arroyo Ave 400–600",
    area: "Low Terrace",
    material: "Cast iron",
    installed: 1958,
    path: [
      [80, 300],
      [260, 300],
      [300, 260],
    ],
    factors: f(0.9, 0.8, 0.7, 0.9, 0.6, [
      "4 repaired leaks",
      "Seasonal high water table",
      "Lateral 1.1 m away",
      "Cast iron, 1958",
      "Frequent surges at pump start",
    ]),
  },
  {
    id: "S-207",
    name: "Mission Rd trunk",
    area: "Old Town",
    material: "Asbestos cement",
    installed: 1966,
    path: [
      [300, 260],
      [460, 260],
      [560, 200],
    ],
    factors: f(0.6, 0.5, 0.8, 0.7, 0.4, [
      "2 repaired leaks",
      "Intermittent saturation",
      "Shared trench",
      "AC pipe, 1966",
      "Moderate",
    ]),
  },
  {
    id: "S-031",
    name: "Calle Verde loop",
    area: "Riverside",
    material: "Ductile iron",
    installed: 1988,
    path: [
      [120, 160],
      [260, 120],
      [380, 140],
    ],
    factors: f(0.4, 0.9, 0.3, 0.4, 0.3, [
      "1 repaired leak",
      "Adjacent to river levee",
      "Lateral 3 m away",
      "DI, 1988",
      "Low",
    ]),
  },
  {
    id: "S-322",
    name: "Sierra Vista 12-in",
    area: "Hillcrest",
    material: "PVC",
    installed: 2004,
    path: [
      [560, 200],
      [640, 110],
      [700, 80],
    ],
    factors: f(0.2, 0.1, 0.2, 0.2, 0.8, [
      "None recorded",
      "Above water table",
      "Separate trench",
      "PVC, 2004",
      "Steep zone, PRV cycling",
    ]),
  },
  {
    id: "S-415",
    name: "Harbor Blvd 8-in",
    area: "Port District",
    material: "Cast iron",
    installed: 1949,
    path: [
      [460, 260],
      [500, 360],
      [620, 400],
    ],
    factors: f(0.7, 0.7, 0.5, 1.0, 0.3, [
      "3 repaired leaks",
      "Tidal influence",
      "Lateral 2 m away",
      "Cast iron, 1949",
      "Low",
    ]),
  },
  {
    id: "S-509",
    name: "Olive St service",
    area: "Low Terrace",
    material: "PVC",
    installed: 2011,
    path: [
      [260, 300],
      [240, 420],
      [320, 460],
    ],
    factors: f(0.1, 0.6, 0.4, 0.1, 0.2, [
      "None recorded",
      "Seasonal high water table",
      "Lateral 2.5 m",
      "PVC, 2011",
      "Low",
    ]),
  },
];

export const TARGET_SEGMENT = "S-114";

export function riskBreakdown(seg: Segment): {
  score: number;
  factors: Factor[];
} {
  const factors: Factor[] = seg.factors.map((x) => ({
    ...x,
    label: WEIGHTS[x.key]!.label,
    weight: WEIGHTS[x.key]!.weight,
  }));
  const score = Math.round(
    factors.reduce((s, x) => s + x.weight * x.value, 0) * 100,
  );
  return { score, factors };
}

export function rankedSegments() {
  return SEGMENTS.map((s) => ({ seg: s, ...riskBreakdown(s) })).sort(
    (a, b) => b.score - a.score,
  );
}

/** Reading: psi value, or null = missing; stale = sensor did not refresh. */
export type Reading = { minute: number; psi: number | null; stale?: boolean };

const BASELINE: Reading[] = Array.from({ length: 24 }, (_, i) => ({
  minute: i * 5,
  psi: 56 + ((i * 7) % 5) - 2,
}));

export function pressureSeries(scenarioActive: boolean): Reading[] {
  if (!scenarioActive) return BASELINE;
  const s = [...BASELINE];
  // Deterministic main-break at minute 40: drop, a reading exactly at 20, a gap, sustained low.
  const overrides: Record<number, Reading> = {
    8: { minute: 40, psi: 34 },
    9: { minute: 45, psi: 20 },
    10: { minute: 50, psi: 14 },
    11: { minute: 55, psi: null },
    12: { minute: 60, psi: 11 },
    13: { minute: 65, psi: 12, stale: true },
    14: { minute: 70, psi: 9 },
    15: { minute: 75, psi: 13 },
    16: { minute: 80, psi: 18 },
    17: { minute: 85, psi: 27 },
    18: { minute: 90, psi: 41 },
  };
  return s.map((r, i) => overrides[i] ?? r);
}

export const LOW_PSI = 20;

export type ReadingStatus = "ok" | "low" | "missing" | "stale";
export function readingStatus(r: Reading): ReadingStatus {
  if (r.psi === null) return "missing";
  if (r.stale) return "stale";
  return r.psi < LOW_PSI ? "low" : "ok"; // exactly 20 psi is NOT below 20
}

/** Low-pressure event: >=3 valid consecutive readings strictly below 20 psi. Missing/stale readings do not count as recovery. */
export function detectLowPressureEvent(series: Reading[]) {
  let run: Reading[] = [];
  let best: Reading[] = [];
  for (const r of series) {
    const st = readingStatus(r);
    if (st === "low") run.push(r);
    else if (st === "missing" || st === "stale") continue;
    else {
      if (run.length > best.length) best = run;
      run = [];
    }
  }
  if (run.length > best.length) best = run;
  if (best.length < 3) return null;
  return {
    start: best[0]!.minute,
    end: best[best.length - 1]!.minute,
    minPsi: Math.min(...best.map((r) => r.psi!)),
  };
}
