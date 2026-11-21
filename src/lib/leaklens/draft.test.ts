import { describe, expect, it } from "vitest";
import { draftAdvisory } from "./draft";

const base = {
  segment: "Arroyo Ave 400–600",
  area: "Low Terrace",
  minPsi: 11.6,
  durationMin: 42,
  notes: "",
};

describe("draftAdvisory", () => {
  it("states the segment, pressure and duration and marks the draft as simulated", () => {
    const d = draftAdvisory(base);
    expect(d.advisory).toContain("SIMULATED");
    expect(d.advisory).toContain("Arroyo Ave 400–600");
    expect(d.advisory).toContain("12 psi");
    expect(d.advisory).toContain("42 minutes");
  });

  it("includes operator notes only when given", () => {
    expect(draftAdvisory(base).advisory).not.toContain("Note from crew");
    expect(
      draftAdvisory({ ...base, notes: "school on block 500" }).advisory,
    ).toContain("school on block 500");
  });

  it("returns a numbered sampling plan", () => {
    expect(draftAdvisory(base).samplingPlan).toMatch(/^1\./);
  });
});
