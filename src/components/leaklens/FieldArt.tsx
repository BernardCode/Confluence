import type { Incident } from "@/lib/leaklens/reducer";

export function FieldArt({ incident }: { incident: Incident }) {
  return (
    <svg
      viewBox="0 0 420 180"
      className="field-art"
      data-isolated={incident.checklist.isolate}
      data-flushing={incident.checklist.flush && !incident.needsFlush}
      role="img"
      aria-label={`Simulated pipe ${incident.checklist.repair ? "repaired" : "awaiting repair"}, ${incident.needsFlush ? "flushing required" : "ready for sampling"}`}
    >
      <path d="M15 122 L190 70 L400 122" className="field-shell" />
      <path d="M15 122 L190 70 L400 122" className="field-water" />
      <path d="M15 122 L190 70 L400 122" className="field-flow" />
      <g className="field-valve" transform="translate(88 100)">
        <path d="M-9 -16 V16 M9 -22 V10 M0 -20 V-42 M-16 -42 H16" />
      </g>
      <g transform="translate(190 70)">
        <path
          d="M-17 -13 L17 -3 L17 20 L-17 10 Z"
          className={
            incident.checklist.repair ? "repair-band repaired" : "repair-band"
          }
        />
        {incident.checklist.repair && (
          <path d="M-7 0 l5 5 10 -9" className="repair-check" />
        )}
      </g>
      <path d="M300 97 V54 H327 V73" className="sample-tap" />
      <g transform="translate(312 80)">
        <path
          d="M0 0 V49 Q0 58 10 58 H25 Q35 58 35 49 V0"
          className="sample-vessel"
        />
        <path
          d="M2 35 H33 V49 Q33 56 25 56 H10 Q2 56 2 49 Z"
          className={
            incident.samples.at(-1)?.result === "fail"
              ? "sample-water failed"
              : "sample-water"
          }
        />
        {incident.samples.length > 0 && (
          <text x="18" y="30" textAnchor="middle">
            {incident.samples.length}
          </text>
        )}
      </g>
      <text x="68" y="157">
        {incident.checklist.isolate ? "Isolated" : "Flowing"}
      </text>
      <text x="169" y="133">
        {incident.checklist.repair ? "Repaired" : "Repair point"}
      </text>
      <text x="304" y="160">
        Sampling
      </text>
    </svg>
  );
}
