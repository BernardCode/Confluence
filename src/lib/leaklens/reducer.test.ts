import { describe, expect, it } from "vitest";
import { reducer, initialState, loadState, type Action } from "./reducer";
import { detectLowPressureEvent, readingStatus, pressureSeries } from "./data";

const run = (...as: Action[]) => as.reduce(reducer, initialState());
const ready: Action[] = [
  { type: "RUN_SCENARIO" },
  { type: "APPROVE_NOTICE" },
  { type: "ASSIGN_CREW" },
  { type: "CHECK", item: "isolate" },
  { type: "CHECK", item: "repair" },
  { type: "CHECK", item: "flush" },
];

describe("pressure", () => {
  it("exactly 20 psi is not below 20", () =>
    expect(readingStatus({ minute: 0, psi: 20 })).toBe("ok"));
  it("missing reading is not normal", () =>
    expect(readingStatus({ minute: 0, psi: null })).toBe("missing"));
  it("scenario triggers event, baseline does not", () => {
    expect(detectLowPressureEvent(pressureSeries(false))).toBeNull();
    expect(detectLowPressureEvent(pressureSeries(true))?.start).toBe(50);
  });
  it("three readings at exactly 20 do not trigger", () =>
    expect(
      detectLowPressureEvent([0, 5, 10].map((m) => ({ minute: m, psi: 20 }))),
    ).toBeNull());
});

describe("response reducer", () => {
  it("crew cannot be assigned before approval", () =>
    expect(
      run({ type: "RUN_SCENARIO" }, { type: "ASSIGN_CREW" }).incident?.status,
    ).toBe("detected"));
  it("rejects duplicate sample IDs", () => {
    const s = run(
      ...ready,
      { type: "RECORD_SAMPLE", id: "A1", result: "clear" },
      { type: "RECORD_SAMPLE", id: "a1", result: "clear" },
    );
    expect(s.incident?.samples).toHaveLength(1);
    expect(s.lastError).toMatch(/Duplicate/);
  });
  it("failed sample resets streak and requires flushing", () => {
    const s = run(
      ...ready,
      { type: "RECORD_SAMPLE", id: "A1", result: "clear" },
      { type: "RECORD_SAMPLE", id: "A2", result: "fail" },
      { type: "RECORD_SAMPLE", id: "A3", result: "clear" },
    );
    expect(s.incident?.clearStreak).toBe(0);
    expect(s.incident?.needsFlush).toBe(true);
    expect(s.incident?.samples).toHaveLength(2);
  });
  it("two clears make eligible but never auto-clear", () => {
    const s = run(
      ...ready,
      { type: "RECORD_SAMPLE", id: "A1", result: "clear" },
      { type: "RECORD_SAMPLE", id: "A2", result: "clear" },
    );
    expect(s.incident?.status).toBe("clearance_eligible");
    expect(reducer(s, { type: "APPROVE_CLEARANCE" }).incident?.status).toBe(
      "cleared",
    );
  });
  it("one clear is not enough for clearance", () => {
    const s = run(
      ...ready,
      { type: "RECORD_SAMPLE", id: "A1", result: "clear" },
      { type: "APPROVE_CLEARANCE" },
    );
    expect(s.incident?.status).toBe("crew_assigned");
  });
  it("recovers from corrupt or old storage", () => {
    expect(loadState("{oops")).toEqual(initialState());
    expect(loadState(JSON.stringify({ version: 0 }))).toEqual(initialState());
  });
});
