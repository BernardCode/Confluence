// Isometric line illustrations sharing the hero's pipe language. Animations are CSS, triggered by `.is-visible` on an ancestor.
const Pipe = ({ d, id }: { d: string; id?: string }) => (
  <g className="art-pipe">
    <path d={d} className="art-pipe-shell" />
    <path d={d} className="art-pipe-water" id={id} />
    <path d={d} className="art-pipe-flow" />
  </g>
);

export function SensorArt() {
  return (
    <svg
      viewBox="0 0 320 200"
      className="feature-svg sensor-art"
      role="img"
      aria-label="Enlarged monitoring sensor attached to a pipe segment"
    >
      <Pipe d="M20 150 L300 70" />
      <ellipse
        cx="20"
        cy="150"
        rx="7"
        ry="17"
        className="art-rim"
        transform="rotate(-16 20 150)"
      />
      <ellipse
        cx="300"
        cy="70"
        rx="7"
        ry="17"
        className="art-rim"
        transform="rotate(-16 300 70)"
      />
      <g transform="translate(160 110)">
        <path d="M-26 -8 a26 12 -16 0 0 52 -14" className="art-saddle" />
        <path d="M-6 -2 v-28 M6 -6 v-28" className="art-stem" />
        <path
          d="M-34 -38 L-34 -56 L0 -70 L34 -60 L34 -42 L0 -28 L-34 -38 Z M0 -28 V-46 M-34 -56 L0 -46 L34 -60"
          className="art-box"
        />
        <ellipse cx="0" cy="-60" rx="9" ry="4" className="art-indicator" />
        <ellipse cx="0" cy="-60" rx="20" ry="9" className="art-halo" />
        <circle r="3" className="art-signal-dot" />
      </g>
    </svg>
  );
}

export function PressureArt() {
  return (
    <svg
      viewBox="0 0 320 200"
      className="feature-svg pressure-art"
      role="img"
      aria-label="Schematic pressure trace showing a normal reading followed by a drop"
    >
      <Pipe d="M20 178 L300 178" />
      <path d="M20 112 H300" className="art-limit" />
      <rect
        x="168"
        y="40"
        width="62"
        height="118"
        rx="6"
        className="art-anomaly"
      />
      <path
        d="M20 70 C60 66 90 74 130 70 S160 68 172 72 C186 78 190 136 200 138 S216 134 226 104 C238 78 260 72 300 72"
        pathLength={1}
        className="art-trace"
      />
      <circle cx="200" cy="138" r="4" className="art-trace-point" />
    </svg>
  );
}

export function ResponseArt() {
  return (
    <svg
      viewBox="0 0 320 200"
      className="feature-svg response-art"
      role="img"
      aria-label="Branching diagram moving from detection to review to field response"
    >
      <Pipe d="M20 150 L110 110 L190 140 L300 90" />
      <path d="M110 110 L110 70" className="art-branch" />
      <path d="M190 140 L190 180" className="art-branch" />
      <path
        d="M20 150 L110 110 L190 140 L300 90"
        pathLength={1}
        className="art-travel"
      />
      {[
        [110, 70, "Detect"],
        [190, 180, "Review"],
        [300, 90, "Respond"],
      ].map(([x, y, label], i) => (
        <g
          key={label}
          className={`art-stage stage-${i + 1}`}
          transform={`translate(${x} ${y})`}
        >
          <path d="M-14 0 L0 -7 L14 0 L0 7 Z" className="art-node" />
          <text y={i === 1 ? 22 : -14} textAnchor="middle">
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function JunctionShowcaseArt() {
  return (
    <svg
      viewBox="0 0 520 360"
      className="feature-svg showcase-art"
      role="img"
      aria-label="Close-up of a pipe junction where a pressure disturbance reaches a sensor and produces an advisory preview"
    >
      <Pipe d="M30 280 L270 180 L490 250" />
      <Pipe d="M270 180 L270 40" />
      <ellipse
        cx="30"
        cy="280"
        rx="9"
        ry="22"
        className="art-rim"
        transform="rotate(-22 30 280)"
      />
      <ellipse
        cx="490"
        cy="250"
        rx="9"
        ry="22"
        className="art-rim"
        transform="rotate(18 490 250)"
      />
      <ellipse cx="270" cy="40" rx="22" ry="7" className="art-rim" />
      <path d="M30 280 L270 180" pathLength={1} className="art-disturbance" />
      <g transform="translate(180 218)">
        <path d="M-6 -2 v-26 M6 -6 v-26" className="art-stem" />
        <path
          d="M-30 -36 L-30 -52 L0 -64 L30 -54 L30 -38 L0 -26 Z M0 -26 V-42 M-30 -52 L0 -42 L30 -54"
          className="art-box"
        />
        <ellipse cx="0" cy="-54" rx="8" ry="3.5" className="art-indicator" />
        <ellipse cx="0" cy="-54" rx="18" ry="8" className="art-halo" />
      </g>
      <g className="art-advisory" transform="translate(310 70)">
        <rect width="180" height="64" rx="12" />
        <circle cx="20" cy="22" r="4" className="art-advisory-dot" />
        <text x="32" y="26" className="art-advisory-title">
          Advisory draft ready
        </text>
        <text x="20" y="46" className="art-advisory-meta">
          Awaiting team review
        </text>
      </g>
    </svg>
  );
}
