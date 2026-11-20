/** Explanatory schematic only — not a validated hydraulic simulation. */
export function PipeSchematic({ mode }: { mode: "normal" | "loss" }) {
  const loss = mode === "loss";
  const arrows = [140, 200, 260];
  return (
    <figure className="m-0">
      <svg viewBox="0 0 400 220" role="img" aria-label={loss ? "Cracked pipe during pressure loss: groundwater drawn inward" : "Cracked pipe at normal pressure: water pushes outward"} className="w-full">
        <defs>
          <marker id={`ah-${mode}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0L10 5L0 10z" className={mode === "loss" ? "fill-destructive" : "fill-primary"} />
          </marker>
        </defs>
        <rect x="0" y="0" width="400" height="220" className="fill-secondary" />
        <line x1="0" y1="40" x2="400" y2="40" className="stroke-muted-foreground" strokeDasharray="4 4" />
        <text x="8" y="32" className="fill-muted-foreground" fontSize="10" fontFamily="var(--font-mono)">GROUNDWATER / SOIL</text>
        <rect x="0" y="80" width="400" height="60" className="fill-card stroke-foreground" strokeWidth="2" />
        <line x1="0" y1="110" x2="400" y2="110" className={`stroke-primary ${loss ? "" : "animate-flow"}`} strokeWidth="2" strokeDasharray="8 4" />
        <path d="M195 80 L200 70 L205 80" className="stroke-destructive fill-none" strokeWidth="2" />
        <text x="212" y="66" className="fill-destructive" fontSize="10" fontFamily="var(--font-mono)">crack</text>
        <g className={loss ? "text-destructive" : "text-primary"} stroke="currentColor" strokeWidth="2" markerEnd={`url(#ah-${mode})`}>
          {arrows.map((x) => loss
            ? <line key={x} x1={x} y1="50" x2={x + (200 - x) * 0.6} y2="76" />
            : <line key={x} x1={200 + (x - 200) * 0.1} y1="76" x2={x} y2="50" />)}
        </g>
        <text x="8" y="166" className="fill-foreground" fontSize="12" fontFamily="var(--font-mono)">
          {loss ? "P(inside) < P(outside): inward gradient" : "P(inside) ≈ 55 psi > P(outside): outward leak"}
        </text>
        <text x="8" y="186" className="fill-muted-foreground" fontSize="10" fontFamily="var(--font-mono)">
          {loss ? "Soil water, sewer exfiltrate may enter" : "Water lost, but outside water held back"}
        </text>
      </svg>
      <figcaption className="mt-2 text-xs text-muted-foreground">{loss ? "B — Pressure loss" : "A — Normal pressure"}. Explanatory diagram, not a hydraulic model.</figcaption>
    </figure>
  );
}
