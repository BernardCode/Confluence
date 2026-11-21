export const STATE_VERSION = 1;
export type SampleResult = "clear" | "fail";
export type Sample = { id: string; result: SampleResult; seq: number };
export type IncidentStatus =
  "detected" | "approved" | "crew_assigned" | "clearance_eligible" | "cleared";
export type Incident = {
  segmentId: string;
  status: IncidentStatus;
  advisory: string;
  samplingPlan: string;
  checklist: { isolate: boolean; repair: boolean; flush: boolean };
  photos: string[];
  samples: Sample[];
  clearStreak: number;
  needsFlush: boolean;
};
export type TimelineEntry = { seq: number; label: string };
export type State = {
  version: number;
  seq: number;
  incident: Incident | null;
  timeline: TimelineEntry[];
  lastError: string | null;
};

export type Action =
  | { type: "RUN_SCENARIO" }
  | { type: "RESET" }
  | { type: "EDIT_DRAFT"; advisory: string; samplingPlan: string }
  | { type: "APPROVE_NOTICE" }
  | { type: "ASSIGN_CREW" }
  | { type: "CHECK"; item: "isolate" | "repair" | "flush" }
  | { type: "ADD_PHOTO"; name: string }
  | { type: "RECORD_SAMPLE"; id: string; result: SampleResult }
  | { type: "APPROVE_CLEARANCE" };

export const DEFAULT_ADVISORY =
  "SIMULATED — Precautionary notice for Arroyo Ave 400–600 (Low Terrace). A main break caused low water pressure. Until further notice, run cold water for 2 minutes before drinking or cooking. We are testing water quality and will update you.";
export const DEFAULT_PLAN =
  "1. Flush hydrant H-114A until chlorine residual is stable.\n2. Collect bacteriological samples at SP-114-1 (upstream) and SP-114-2 (downstream).\n3. Record chlorine residual and turbidity at each point.";

export const initialState = (): State => ({
  version: STATE_VERSION,
  seq: 0,
  incident: null,
  timeline: [],
  lastError: null,
});

const fail = (s: State, msg: string): State => ({ ...s, lastError: msg });
const log = (s: State, label: string, patch: Partial<State> = {}): State => {
  const seq = s.seq + 1;
  return {
    ...s,
    ...patch,
    seq,
    lastError: null,
    timeline: [...s.timeline, { seq, label }],
  };
};

export function reducer(s: State, a: Action): State {
  const inc = s.incident;
  switch (a.type) {
    case "RESET":
      return initialState();
    case "RUN_SCENARIO":
      if (inc) return fail(s, "Scenario already running. Reset first.");
      return log(
        s,
        "Sustained pressure below 20 psi on S-114 (simulated main break). Incident opened.",
        {
          incident: {
            segmentId: "S-114",
            status: "detected",
            advisory: DEFAULT_ADVISORY,
            samplingPlan: DEFAULT_PLAN,
            checklist: { isolate: false, repair: false, flush: false },
            photos: [],
            samples: [],
            clearStreak: 0,
            needsFlush: true,
          },
        },
      );
  }
  if (!inc) return fail(s, "No active incident.");
  const set = (label: string, p: Partial<Incident>) =>
    log(s, label, { incident: { ...inc, ...p } });
  switch (a.type) {
    case "EDIT_DRAFT":
      if (inc.status !== "detected")
        return fail(s, "Draft is locked after approval.");
      return {
        ...s,
        lastError: null,
        incident: {
          ...inc,
          advisory: a.advisory,
          samplingPlan: a.samplingPlan,
        },
      };
    case "APPROVE_NOTICE":
      if (inc.status !== "detected") return fail(s, "Notice already approved.");
      if (!inc.advisory.trim()) return fail(s, "Advisory text is empty.");
      return set(
        "Operator approved advisory. Simulated notice queued (nothing sent).",
        { status: "approved" },
      );
    case "ASSIGN_CREW":
      if (inc.status !== "approved")
        return fail(s, "Approve the notice before assigning a crew.");
      return set("Crew 3 assigned (simulated).", { status: "crew_assigned" });
    case "CHECK": {
      if (inc.status !== "crew_assigned" && inc.status !== "clearance_eligible")
        return fail(s, "No crew assigned yet.");
      if (inc.checklist[a.item]) return fail(s, "Step already completed.");
      if (a.item === "repair" && !inc.checklist.isolate)
        return fail(s, "Isolate the segment before repair.");
      if (a.item === "flush" && !inc.checklist.repair)
        return fail(s, "Complete repair before flushing.");
      const label = {
        isolate: "Segment isolated.",
        repair: "Repair completed.",
        flush: "Flushing completed.",
      }[a.item];
      return set(label, {
        checklist: { ...inc.checklist, [a.item]: true },
        needsFlush: a.item === "flush" ? false : inc.needsFlush,
      });
    }
    case "ADD_PHOTO":
      if (inc.status === "detected" || inc.status === "approved")
        return fail(s, "No crew assigned yet.");
      return set(`Photo attached: ${a.name}`, {
        photos: [...inc.photos, a.name],
      });
    case "RECORD_SAMPLE": {
      const id = a.id.trim();
      if (!id) return fail(s, "Sample ID is required.");
      if (inc.status === "cleared") return fail(s, "Incident already cleared.");
      if (inc.status !== "crew_assigned" && inc.status !== "clearance_eligible")
        return fail(s, "No crew assigned yet.");
      if (!inc.checklist.repair)
        return fail(s, "Complete repair before sampling.");
      if (inc.needsFlush) return fail(s, "Flush before sampling.");
      if (inc.samples.some((x) => x.id.toLowerCase() === id.toLowerCase()))
        return fail(s, `Duplicate sample ID ${id}.`);
      const sample = { id, result: a.result, seq: s.seq + 1 };
      if (a.result === "fail")
        return set(`Sample ${id} FAILED. Streak reset; flush and resample.`, {
          samples: [...inc.samples, sample],
          clearStreak: 0,
          needsFlush: true,
          status: "crew_assigned",
          checklist: { ...inc.checklist, flush: false },
        });
      const streak = inc.clearStreak + 1;
      return set(`Sample ${id} clear (${streak} consecutive).`, {
        samples: [...inc.samples, sample],
        clearStreak: streak,
        status: streak >= 2 ? "clearance_eligible" : "crew_assigned",
      });
    }
    case "APPROVE_CLEARANCE":
      if (inc.status !== "clearance_eligible")
        return fail(s, "Two consecutive clear samples required first.");
      return set(
        "Operator approved clearance (demo rule, not compliance certification).",
        { status: "cleared" },
      );
  }
  return s;
}

export function loadState(raw: string | null): State {
  if (!raw) return initialState();
  try {
    const p = JSON.parse(raw);
    if (
      !p ||
      p.version !== STATE_VERSION ||
      typeof p.seq !== "number" ||
      !Array.isArray(p.timeline)
    )
      return initialState();
    return { ...p, lastError: null };
  } catch {
    return initialState();
  }
}
