import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Play, RotateCcw, ArrowRight, Sparkles, Check, HardHat, ShieldCheck, X, Lock } from 'lucide-react';
import { AppShell } from '@/components/leaklens/Shell';
import { NetworkCanvas } from '@/components/leaklens/NetworkCanvas';
import { PressureChart } from '@/components/leaklens/PressureChart';
import { StageHeader } from '@/components/leaklens/StageHeader';
import { FieldArt } from '@/components/leaklens/FieldArt';
import { Button } from '@/components/ui/button';
import { SEGMENTS, TARGET_SEGMENT, rankedSegments, riskBreakdown, pressureSeries, detectLowPressureEvent, type Segment } from '@/lib/leaklens/data';
import { dispatch, useLeakLens } from '@/lib/leaklens/store';
import { workflowStage, monitoringAlert } from '@/lib/leaklens/presentation';
import { draftAdvisory } from '@/lib/leaklens/ai.functions';
import type { Incident } from '@/lib/leaklens/reducer';

export const Route = createFileRoute('/ops')({
  head: () => ({ meta: [
    { title: 'Operations | Confluence demo' },
    { name: 'description', content: 'Explore Confluence’s interactive schematic water network, simulated pressure events, and human-reviewed incident response.' },
    { property: 'og:title', content: 'Operations | Confluence demo' },
    { property: 'og:description', content: 'Follow a simulated water-network incident from pipe risk through reviewed response and clearance.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }), component: Ops,
});

const pts = (f: { weight: number; value: number }) => Math.round(f.weight * f.value * 100);

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { (e.target as HTMLElement).dataset['inview'] = 'true'; io.unobserve(e.target); } }), { threshold: 0.12 });
    el.querySelectorAll('[data-reveal]').forEach(n => io.observe(n));
    return () => io.disconnect();
  });
  return ref;
}

function SegmentPanel({ seg, alert, onClose }: { seg: Segment; alert: boolean; onClose: () => void }) {
  const rb = riskBreakdown(seg);
  return <div className="segment-panel">
    <button type="button" className="panel-close" aria-label="Close details" onClick={onClose}><X /></button>
    <span className="panel-meta">{seg.area} · {seg.material}, {seg.installed}</span>
    <h3>{seg.name}</h3>
    <div className="panel-score"><strong>{rb.score}</strong><span>/ 100<br />susceptibility</span></div>
    <ul className="risk-bars">{rb.factors.map(f => <li key={f.key}><div><span>{f.label}</span><b>{pts(f)}</b></div><span className="risk-track"><span className="risk-fill" style={{ width: `${(pts(f) / 30) * 100}%` }} /></span></li>)}</ul>
    {seg.id === TARGET_SEGMENT ? <p className={`panel-sensor ${alert ? 'is-alert' : ''}`}><i />Sensor P-114 · {alert ? 'pressure event' : 'normal'}</p> : <p className="panel-sensor muted">No sensor on this segment</p>}
  </div>;
}

function Locked({ children }: { children: string }) {
  return <div className="stage-locked"><Lock /><p>{children}</p></div>;
}

function Ops() {
  const s = useLeakLens();
  const inc = s.incident;
  const [sel, setSel] = useState(TARGET_SEGMENT);
  const [hovered, setHovered] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [focus, setFocus] = useState(0);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(1);
  const [resetOpen, setResetOpen] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const active = monitoringAlert(inc);
  const stage = workflowStage(inc);
  const scenario = !!inc;
  const series = useMemo(() => pressureSeries(scenario), [scenario]);
  const event = useMemo(() => detectLowPressureEvent(series), [series]);
  const prevStage = useRef(stage);
  useEffect(() => {
    // A fresh scenario lands on Detection so the pressure drop is seen before review.
    setView(prevStage.current === 1 && stage === 4 ? 3 : stage);
    prevStage.current = stage;
  }, [stage]);
  const seg = SEGMENTS.find(x => x.id === sel) ?? SEGMENTS[0]!;
  const select = (id: string) => { setSel(id); setPanelOpen(true); };
  const focusSeg = (id: string) => { select(id); setFocus(f => f + 1); };

  async function aiDraft() {
    if (!inc || !event) return;
    setBusy(true); setReviewed(false);
    try {
      const r = await draftAdvisory({ data: { segment: 'Arroyo Ave 400–600', area: 'Low Terrace', minPsi: event.minPsi, durationMin: event.end - event.start + 5, notes } });
      if (r.ok) { dispatch({ type: 'EDIT_DRAFT', advisory: r.advisory, samplingPlan: r.samplingPlan || inc.samplingPlan }); toast.success('Draft ready for human review.'); }
      else toast.error(r.error);
    } catch { toast.error('AI draft unavailable. You can still edit the draft manually.'); }
    finally { setBusy(false); }
  }
  function runScenario() { setReviewed(false); dispatch({ type: 'RUN_SCENARIO' }); focusSeg(TARGET_SEGMENT); }

  const revealRef = useReveal();
  const latest = series.at(-1)?.psi ?? null;
  const actions = <>
    <Button variant="ghost" size="icon" className="icon-quiet" aria-label="Reset demo" title="Reset demo" onClick={() => setResetOpen(true)}><RotateCcw /></Button>
    {!inc && <Button size="lg" className="cta-large" onClick={runScenario}><Play />Run main-break scenario</Button>}
    {inc && <span className={`incident-chip ${active ? 'is-alert' : ''}`}><i />{active ? 'Incident active' : 'Monitoring normal'}</span>}
  </>;

  const pressureBlock = (side: React.ReactNode) => <div className="pressure-layout" data-reveal>
    <div className="pressure-side">{side}</div>
    <PressureChart series={series} replay={`${view}-${scenario}`} />
  </div>;

  return <AppShell role="ops">
    <main className="ops-stage" ref={revealRef}>
      <StageHeader view={view} stage={stage} complete={inc?.status === 'cleared'} onView={setView} actions={actions} />
      {resetOpen && <div className="reset-confirm" role="alertdialog" aria-label="Confirm demo reset"><span>Reset the demo? Simulated work and samples will be removed.</span><div><Button variant="outline" onClick={() => setResetOpen(false)}>Keep work</Button><Button variant="destructive" onClick={() => { dispatch({ type: 'RESET' }); setNotes(''); setReviewed(false); setPanelOpen(false); setResetOpen(false); toast.success('Demo reset.'); }}>Reset simulation</Button></div></div>}
      {s.lastError && <p role="alert" className="demo-error">{s.lastError}</p>}

      <NetworkCanvas selected={sel} hovered={hovered} alert={active} panelOpen={panelOpen} focusSignal={focus}
        onSelect={select} onHover={setHovered} onSensor={() => { select(TARGET_SEGMENT); setView(active ? 3 : 2); }}
        panel={<SegmentPanel seg={seg} alert={active} onClose={() => setPanelOpen(false)} />} />

      <section className="stage-body" key={view}>
        {view === 1 && <div className="risk-layout" data-reveal>
          <h2 className="section-title">Highest risk first</h2>
          <ol className="ranked-list">{rankedSegments().map(({ seg: x, score }) => <li key={x.id}>
            <button type="button" className="ranked-row" aria-current={panelOpen && sel === x.id} data-alert={active && x.id === TARGET_SEGMENT} onClick={() => focusSeg(x.id)} onMouseEnter={() => setHovered(x.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(x.id)} onBlur={() => setHovered(null)}>
              <span className="rank-name"><strong>{x.name}</strong><small>{x.area} · {x.material}</small></span>
              <span className="rank-score">{score}</span>
              <span className="rank-track"><span style={{ width: `${score}%` }} /></span>
            </button></li>)}</ol>
          <details className="quiet-details"><summary>How scores are calculated</summary><table><thead><tr><th>Factor</th><th>Weight</th><th>{seg.name}</th><th>Points</th></tr></thead><tbody>{riskBreakdown(seg).factors.map(f => <tr key={f.key}><td>{f.label}<small>{f.note}</small></td><td>{f.weight}</td><td>{f.value}</td><td>{pts(f)}</td></tr>)}</tbody></table><p>Score = Σ weight × value × 100. Illustrative, not a calibrated prediction.</p></details>
        </div>}

        {view === 2 && pressureBlock(<>
          <div className="metric-xl"><strong>{latest ?? '—'}</strong><span>psi</span></div>
          <p className="metric-caption">Latest reading · P-114</p>
          {active && event && <p className="metric-note is-alert">Event minimum {event.minPsi} psi</p>}
          <p className="metric-note">Exactly 20 psi is not counted as low. Missing and stale readings never count as recovery.</p>
        </>)}

        {view === 3 && pressureBlock(!inc ? <>
          <div className="metric-xl"><strong>{latest}</strong><span>psi</span></div>
          <p className="metric-caption">No event detected</p>
          <Button size="lg" className="cta-large mt-8" onClick={runScenario}><Play />Run main-break scenario</Button>
        </> : <>
          <div className={`metric-xl ${active ? 'is-alert' : ''}`}><strong>{event?.minPsi}</strong><span>psi</span></div>
          <p className="metric-caption">Event minimum · {event?.start}–{event?.end} min</p>
          <p className="metric-note">Three or more valid readings below 20 psi triggered a simulated incident on Arroyo Ave 400–600.</p>
          {inc.status === 'detected' && <Button size="lg" className="cta-large mt-8" onClick={() => setView(4)}>Review advisory <ArrowRight /></Button>}
        </>)}

        {view === 4 && (!inc ? <Locked>Run the main-break scenario to draft an advisory.</Locked> : <ReviewStage inc={inc} notes={notes} setNotes={setNotes} busy={busy} aiDraft={aiDraft} reviewed={reviewed} setReviewed={setReviewed} />)}

        {view === 5 && (!inc || inc.status === 'detected' ? <Locked>Field work starts after the advisory is approved.</Locked> : <div className="field-layout" data-reveal>
          <FieldArt incident={inc} />
          <div>
            {inc.status === 'approved' ? <><h2 className="section-title">Crew 3 is ready.</h2><Button size="lg" className="cta-large" onClick={() => { dispatch({ type: 'ASSIGN_CREW' }); toast.success('Crew 3 assigned.'); }}><HardHat />Assign Crew 3</Button></> : <>
              <ul className="big-checklist">{(['isolate', 'repair', 'flush'] as const).map(k => <li key={k} data-done={inc.checklist[k]}><span>{inc.checklist[k] ? <Check /> : null}</span>{{ isolate: 'Isolate segment', repair: 'Complete repair', flush: 'Flush before sampling' }[k]}</li>)}</ul>
              {inc.status === 'crew_assigned' && <Button asChild size="lg" variant="outline" className="cta-large"><Link to="/crew">Open Crew 3 work order <ArrowRight /></Link></Button>}
            </>}
          </div>
        </div>)}

        {view === 6 && (!inc || !['crew_assigned', 'clearance_eligible', 'cleared'].includes(inc.status) ? <Locked>Sampling begins once Crew 3 is in the field.</Locked> : <div className="field-layout" data-reveal>
          <div>
            <div className="metric-xl"><strong>{inc.clearStreak}</strong><span>/ 2 clear</span></div>
            <p className="metric-caption">Consecutive clear samples</p>
            <div className="streak-dots">{[1, 2].map(n => <span key={n} data-on={inc.clearStreak >= n} />)}</div>
            {inc.samples.length > 0 ? <ul className="sample-list">{[...inc.samples].reverse().map(x => <li key={x.id}><span>{x.id}</span><strong data-result={x.result}>{x.result === 'clear' ? 'Clear' : 'Failed'}</strong></li>)}</ul> : <p className="metric-note">No samples recorded yet.</p>}
            {inc.status === 'crew_assigned' && <Button asChild size="lg" variant="outline" className="cta-large mt-6"><Link to="/crew">Record samples as Crew 3 <ArrowRight /></Link></Button>}
          </div>
          <FieldArt incident={inc} />
        </div>)}

        {view === 7 && (!inc || (inc.status !== 'clearance_eligible' && inc.status !== 'cleared') ? <Locked>Clearance needs two consecutive clear samples after repair and flushing.</Locked> : inc.status === 'clearance_eligible' ? <div className="clearance-layout" data-reveal>
          <ShieldCheck className="clearance-icon" />
          <h2 className="section-title">Ready for operator clearance.</h2>
          <p className="metric-note">Repair, flushing and two consecutive clear samples recorded.</p>
          <Button size="lg" className="cta-large" onClick={() => { dispatch({ type: 'APPROVE_CLEARANCE' }); toast.success('Simulated clearance approved. Monitoring normal.'); }}><ShieldCheck />Approve clearance</Button>
          <p className="fine-print">Illustrative demo conditions, not regulatory certification.</p>
        </div> : <div className="clearance-layout is-done" data-reveal>
          <ShieldCheck className="clearance-icon" />
          <h2 className="section-title">Back to monitoring.</h2>
          <p className="metric-note">Operator-approved clearance recorded. No real notice was issued.</p>
          <Button size="lg" variant="outline" className="cta-large" onClick={() => setView(1)}>Explore the network <ArrowRight /></Button>
        </div>)}
      </section>

      {inc && <details className="quiet-details history"><summary>Incident history · {s.timeline.length} events</summary><ol className="incident-timeline">{s.timeline.map(t => <li key={t.seq}><span>{t.seq}</span>{t.label}</li>)}</ol>
        {inc.status !== 'detected' && <><h4>Approved advisory</h4><p className="whitespace-pre-wrap">{inc.advisory}</p><h4>Sampling plan</h4><p className="whitespace-pre-wrap">{inc.samplingPlan}</p></>}</details>}
      <details className="quiet-details"><summary>Simulation limits</summary><p>Fictional network and readings. Low pressure at a leaking pipe can allow outside water to enter. This schematic is not a validated hydraulic model. Risk weights, the strictly-below-20 psi trigger and the two-clear-sample rule are illustrative and require utility and regulator review. No real notices or equipment controls.</p></details>
    </main>
  </AppShell>;
}

function ReviewStage({ inc, notes, setNotes, busy, aiDraft, reviewed, setReviewed }: { inc: Incident; notes: string; setNotes: (v: string) => void; busy: boolean; aiDraft: () => void; reviewed: boolean; setReviewed: (v: boolean) => void }) {
  const editable = inc.status === 'detected';
  return <div className="review-layout" data-reveal>
    {editable && <div className="ai-row">
      <label className="demo-field grow"><span>Notes for AI <small>optional</small></span><input value={notes} onChange={e => setNotes(e.target.value)} maxLength={500} placeholder="e.g. school on block 500" /></label>
      <Button size="lg" variant="outline" className="cta-large" onClick={aiDraft} disabled={busy}><Sparkles className={busy ? 'ai-busy' : ''} />{busy ? 'Preparing draft…' : 'Draft with Lovable AI'}</Button>
    </div>}
    <div className="draft-grid">
      <label className="demo-field"><span>Advisory</span><textarea aria-label="Advisory draft" disabled={!editable} value={inc.advisory} rows={9} onChange={e => { setReviewed(false); dispatch({ type: 'EDIT_DRAFT', advisory: e.target.value, samplingPlan: inc.samplingPlan }); }} /></label>
      <label className="demo-field"><span>Sampling plan</span><textarea aria-label="Sampling plan" disabled={!editable} value={inc.samplingPlan} rows={9} onChange={e => { setReviewed(false); dispatch({ type: 'EDIT_DRAFT', advisory: inc.advisory, samplingPlan: e.target.value }); }} /></label>
    </div>
    {editable ? <div className="approve-row">
      <label className="review-check"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />I have reviewed and edited both drafts.</label>
      <Button size="lg" className="cta-large" disabled={!reviewed || !inc.advisory.trim() || busy} onClick={() => { dispatch({ type: 'APPROVE_NOTICE' }); toast.success('Advisory approved. Nothing sent.'); }}><Check />Approve advisory</Button>
    </div> : <p className="metric-note"><Check className="approved-check" /> Approved by the operator. Simulated only, nothing was sent.</p>}
  </div>;
}
