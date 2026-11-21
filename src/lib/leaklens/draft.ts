// Template-based advisory drafting. Everything here is SIMULATED demo content.
// The site is hosted statically, so drafting runs in the browser from the incident data.
import { DEFAULT_PLAN } from "./reducer";

export type DraftInput = {
  segment: string;
  area: string;
  minPsi: number;
  durationMin: number;
  notes: string;
};

export type Draft = { advisory: string; samplingPlan: string };

export function draftAdvisory(input: DraftInput): Draft {
  const note = input.notes.trim().replace(/\s+/g, " ");
  const lines = [
    `SIMULATED — Precautionary notice for ${input.segment} (${input.area}).`,
    `A main break caused low water pressure (as low as ${Math.round(input.minPsi)} psi for about ${Math.round(input.durationMin)} minutes).`,
    "Until further notice, run cold water for 2 minutes before drinking or cooking.",
  ];
  if (note) lines.push(`Note from crew: ${note}.`.replace(/\.\.$/, "."));
  lines.push("We are testing water quality and will update you.");
  return { advisory: lines.join(" "), samplingPlan: DEFAULT_PLAN };
}
