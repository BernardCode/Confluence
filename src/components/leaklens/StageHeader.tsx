import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export const STAGES = [
  {
    name: "Pipe risk",
    lede: "Illustrative susceptibility across six fictional segments.",
  },
  {
    name: "Monitoring",
    lede: "Sensor P-114 on Arroyo Avenue, read every five minutes.",
  },
  { name: "Detection", lede: "A simulated main break on Arroyo Avenue." },
  {
    name: "Human review",
    lede: "Edit and approve the advisory and sampling plan.",
  },
  {
    name: "Field work",
    lede: "Crew 3 isolates, repairs and flushes the segment.",
  },
  {
    name: "Sampling",
    lede: "A failed sample requires flushing and retesting.",
  },
  {
    name: "Clearance",
    lede: "Two consecutive clear samples, then operator approval.",
  },
];

/** Large stage title with a drawn connecting line. Viewing a stage never changes simulation state. */
export function StageHeader({
  view,
  stage,
  complete,
  onView,
  actions,
}: {
  view: number;
  stage: number;
  complete: boolean;
  onView: (n: number) => void;
  actions?: ReactNode;
}) {
  const info = STAGES[view - 1] ?? STAGES[0]!;
  const done = (i: number) => complete || i < stage;
  return (
    <section className="stage-header" aria-label="Simulated response stages">
      <div className="stage-title-row">
        <div className="stage-title" key={view} aria-live="polite">
          <h1>
            {info.name}
            <span className="headline-period">.</span>
          </h1>
          <p>{info.lede}</p>
        </div>
        {actions && <div className="stage-actions">{actions}</div>}
      </div>
      <svg
        className="stage-line"
        viewBox="0 0 1200 48"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 30 C 220 30 300 10 520 16 S 860 44 1200 22"
          className="stage-line-base"
        />
        <path
          key={view}
          d="M0 30 C 220 30 300 10 520 16 S 860 44 1200 22"
          className="stage-line-draw"
          pathLength={1}
          style={{
            ["--to" as string]: `${1 - ((view - 1) / 6) * 0.86 - 0.14}`,
          }}
        />
      </svg>
      <nav className="stage-nav" aria-label="Stages">
        <button
          type="button"
          className="stage-step-btn"
          aria-label="Previous stage"
          disabled={view <= 1}
          onClick={() => onView(view - 1)}
        >
          <ChevronLeft />
        </button>
        <ol>
          {STAGES.map((s, i) => (
            <li key={s.name}>
              <button
                type="button"
                aria-current={view === i + 1 ? "step" : undefined}
                data-state={
                  done(i + 1)
                    ? "complete"
                    : i + 1 === stage
                      ? "active"
                      : "pending"
                }
                onClick={() => onView(i + 1)}
              >
                <i />
                {s.name}
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="stage-step-btn"
          aria-label="Next stage"
          disabled={view >= 7}
          onClick={() => onView(view + 1)}
        >
          <ChevronRight />
        </button>
      </nav>
    </section>
  );
}
