import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  ArrowRight,
  Camera,
  ShieldCheck,
  Wrench,
  Waves,
  LockKeyhole,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/leaklens/Shell";
import { FieldArt } from "@/components/leaklens/FieldArt";
import { Button } from "@/components/ui/button";
import { dispatch, useLeakLens } from "@/lib/leaklens/store";
import type { SampleResult } from "@/lib/leaklens/reducer";

export const Route = createFileRoute("/crew")({
  head: () => ({
    meta: [
      { title: "Field Crew | Confluence demo" },
      {
        name: "description",
        content:
          "Confluence Crew 3 simulated work order: ordered repairs, flushing, samples, and operator-reviewed clearance.",
      },
      { property: "og:title", content: "Field Crew | Confluence demo" },
      {
        property: "og:description",
        content:
          "Follow a simulated field repair and sampling workflow with clear-sample progress and human clearance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Crew,
});

const TASKS = {
  isolate: "Isolate segment",
  repair: "Complete repair",
  flush: "Flush the line",
} as const;
const DONE_TOAST = {
  isolate: "Segment isolated.",
  repair: "Repair complete.",
  flush: "Flushing complete.",
} as const;

function Crew() {
  const s = useLeakLens();
  const inc = s.incident;
  const [id, setId] = useState("");
  const assigned =
    inc &&
    ["crew_assigned", "clearance_eligible", "cleared"].includes(inc.status);
  function sample(result: SampleResult) {
    if (!inc) return;
    const duplicate = inc.samples.some(
      (x) => x.id.toLowerCase() === id.trim().toLowerCase(),
    );
    dispatch({ type: "RECORD_SAMPLE", id, result });
    if (!duplicate) {
      setId("");
      toast[result === "clear" ? "success" : "warning"](
        result === "clear"
          ? "Clear sample recorded."
          : "Failed sample recorded. Flush and resample.",
      );
    }
  }
  const keys = ["isolate", "repair", "flush"] as const;
  const blocked = (k: (typeof keys)[number]) =>
    !inc
      ? true
      : k === "repair"
        ? !inc.checklist.isolate
        : k === "flush"
          ? !inc.checklist.repair
          : false;
  const next = inc
    ? keys.find((k) => !inc.checklist[k] && !blocked(k))
    : undefined;
  const canSample = !!inc && inc.checklist.repair && !inc.needsFlush;
  const status =
    !inc || !assigned
      ? "Awaiting assignment"
      : inc.status === "cleared"
        ? "Incident cleared"
        : inc.status === "clearance_eligible"
          ? "Waiting for operator clearance"
          : next
            ? TASKS[next]
            : inc.needsFlush
              ? "Flush before the next sample"
              : "Take the next sample";

  return (
    <AppShell role="crew">
      <main className="crew-stage">
        <header className="crew-hero">
          <h1>
            Crew 3<span className="headline-period">.</span>
          </h1>
          <p>{status}</p>
        </header>
        {s.lastError && (
          <p role="alert" className="demo-error">
            {s.lastError}
          </p>
        )}
        {!assigned || !inc ? (
          <div className="stage-locked crew-locked">
            <LockKeyhole />
            <p>Operations must approve the advisory and assign Crew 3.</p>
            <Button asChild size="lg" className="cta-large">
              <Link to="/ops">
                Go to Operations <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <section className="crew-site">
              <span className="crew-meta">Low Terrace · S-114</span>
              <h2>Arroyo Ave 400–600</h2>
              <FieldArt incident={inc} />
            </section>
            {inc.status === "cleared" ? (
              <div className="clearance-layout is-done">
                <ShieldCheck className="clearance-icon" />
                <h2 className="section-title">Response complete.</h2>
                <p className="metric-note">Operator clearance recorded.</p>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="cta-large"
                >
                  <Link to="/ops">
                    Back to Operations <ArrowRight />
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <section className="crew-block">
                  <div className="crew-block-head">
                    <h2>Repair</h2>
                    <span>
                      {Object.values(inc.checklist).filter(Boolean).length} / 3
                    </span>
                  </div>
                  {keys.map((k) => {
                    const done = inc.checklist[k],
                      locked = blocked(k);
                    const Icon =
                      k === "isolate"
                        ? LockKeyhole
                        : k === "repair"
                          ? Wrench
                          : Waves;
                    return (
                      <button
                        type="button"
                        key={k}
                        className="crew-task"
                        data-done={done}
                        data-current={next === k}
                        disabled={done || locked}
                        onClick={() => {
                          dispatch({ type: "CHECK", item: k });
                          toast.success(DONE_TOAST[k]);
                        }}
                      >
                        <span className="crew-task-icon">
                          {done ? <Check /> : <Icon />}
                        </span>
                        <span className="crew-task-label">
                          <strong>{TASKS[k]}</strong>
                          {!done && locked && (
                            <small>
                              {k === "repair"
                                ? "After isolation"
                                : "After repair"}
                            </small>
                          )}
                          {k === "flush" && !done && inc.samples.length > 0 && (
                            <small>Required before retesting</small>
                          )}
                        </span>
                        {next === k && <ArrowRight />}
                      </button>
                    );
                  })}
                </section>
                <section className="crew-block">
                  <div className="crew-block-head">
                    <h2>Samples</h2>
                    <span>{inc.samples.length} taken</span>
                  </div>
                  <div className="crew-streak">
                    <div className="metric-xl">
                      <strong>{inc.clearStreak}</strong>
                      <span>/ 2 clear in a row</span>
                    </div>
                    <div className="streak-dots">
                      {[1, 2].map((n) => (
                        <span key={n} data-on={inc.clearStreak >= n} />
                      ))}
                    </div>
                  </div>
                  {!canSample && (
                    <p
                      className={`crew-hint ${inc.needsFlush && inc.checklist.repair ? "is-alert" : ""}`}
                    >
                      {!inc.checklist.repair
                        ? "Repair and flush before sampling."
                        : "Flush before the next sample."}
                    </p>
                  )}
                  {inc.status === "clearance_eligible" && (
                    <p className="crew-hint">
                      Conditions met. The operator must approve clearance.
                    </p>
                  )}
                  <label className="demo-field">
                    <span>Sample ID</span>
                    <input
                      aria-label="Sample ID"
                      value={id}
                      onChange={(e) => setId(e.target.value)}
                      placeholder="SP-114-1-A"
                      disabled={!canSample}
                    />
                  </label>
                  <div className="sample-actions">
                    <Button
                      size="lg"
                      disabled={!id.trim() || !canSample}
                      onClick={() => sample("clear")}
                    >
                      <Check />
                      Clear
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      disabled={!id.trim() || !canSample}
                      onClick={() => sample("fail")}
                    >
                      Failed
                    </Button>
                  </div>
                  {inc.samples.length > 0 && (
                    <ul className="sample-list">
                      {[...inc.samples].reverse().map((x) => (
                        <li key={x.id}>
                          <span>{x.id}</span>
                          <strong data-result={x.result}>
                            {x.result === "clear" ? "Clear" : "Failed"}
                          </strong>
                        </li>
                      ))}
                    </ul>
                  )}
                  {inc.status === "clearance_eligible" && (
                    <Button asChild size="lg" className="cta-large w-full mt-6">
                      <Link to="/ops">
                        Request operator clearance <ArrowRight />
                      </Link>
                    </Button>
                  )}
                </section>
                <details className="quiet-details">
                  <summary>
                    <Camera />
                    Field photos · {inc.photos.length}
                  </summary>
                  <label className="demo-field">
                    <span>Attach photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          dispatch({ type: "ADD_PHOTO", name: file.name });
                          toast.success("Photo name recorded locally.");
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {inc.photos.length > 0 && (
                    <ul>
                      {inc.photos.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  )}
                  <p>
                    Only the file name is saved on this device. No photo is
                    uploaded.
                  </p>
                </details>
              </>
            )}
            <details className="quiet-details">
              <summary>Work order history · {s.timeline.length}</summary>
              <ol className="incident-timeline">
                {s.timeline.map((t) => (
                  <li key={t.seq}>
                    <span>{t.seq}</span>
                    {t.label}
                  </li>
                ))}
              </ol>
            </details>
          </>
        )}
      </main>
    </AppShell>
  );
}
