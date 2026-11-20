import { useEffect, useRef, useState } from 'react';
import { LOW_PSI, readingStatus, type Reading } from '@/lib/leaklens/data';

const W = 1000, H = 360, L = 52, R = 24, T = 28, B = 46, MAX = 70;
const x = (m: number) => L + (m / 115) * (W - L - R);
const y = (p: number) => H - B - (p / MAX) * (H - T - B);

/** Values tween only between real readings during a scenario change; gaps, stale and low states always come from the source series. */
export function PressureChart({ series, replay }: { series: Reading[]; replay: string }) {
  const [shown, setShown] = useState(series);
  const [hover, setHover] = useState<Reading | null>(null);
  const prev = useRef(series);
  useEffect(() => {
    const from = prev.current; prev.current = series;
    if (from === series || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(series); return; }
    const t0 = performance.now(); let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - p, 3);
      setShown(series.map((r, i) => { const a = from[i]?.psi; return r.psi === null || a == null ? r : { ...r, psi: a + (r.psi - a) * e }; }));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [series]);

  const segs: Reading[][] = []; let cur: Reading[] = [];
  shown.forEach((r, i) => { const src = series[i]; if (!src || r.psi === null || src.stale) { if (cur.length) segs.push(cur); cur = []; } else cur.push(r); });
  if (cur.length) segs.push(cur);
  const line = (s: Reading[]) => s.map((r, i) => `${i ? 'L' : 'M'}${x(r.minute).toFixed(1)} ${y(r.psi!).toFixed(1)}`).join(' ');
  const area = (s: Reading[]) => `${line(s)} L${x(s.at(-1)!.minute)} ${y(0)} L${x(s[0]!.minute)} ${y(0)} Z`;

  return <figure className="pressure-figure">
    <svg viewBox={`0 0 ${W} ${H}`} className="pressure-svg" role="group" aria-label="Simulated pressure at sensor P-114 over two hours">
      <defs><linearGradient id="psi-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--flow-water)" stopOpacity=".22" /><stop offset="1" stopColor="var(--flow-water)" stopOpacity="0" /></linearGradient></defs>
      {[0, 20, 40, 60].map(p => <g key={p}><line x1={L} x2={W - R} y1={y(p)} y2={y(p)} className="chart-grid" /><text x={L - 14} y={y(p) + 5} textAnchor="end" className="chart-label">{p}</text></g>)}
      {[0, 30, 60, 90].map(m => <text key={m} x={x(m)} y={H - 14} textAnchor="middle" className="chart-label">{m} min</text>)}
      <line x1={L} x2={W - R} y1={y(LOW_PSI)} y2={y(LOW_PSI)} className="chart-threshold" />
      <text x={W - R} y={y(LOW_PSI) - 10} textAnchor="end" className="chart-threshold-label">20 psi threshold</text>
      <g key={replay} className="chart-draw">
        {segs.map((s, i) => <path key={`a${i}`} d={area(s)} className="chart-area" />)}
        {segs.map((s, i) => <path key={`l${i}`} d={line(s)} pathLength={1} className="chart-trace" />)}
      </g>
      {series.map((r, i) => {
        const st = readingStatus(r), v = shown[i]?.psi ?? r.psi, on = hover?.minute === r.minute;
        return <g key={r.minute} tabIndex={0} role="button" aria-label={`${r.minute} minutes, ${r.psi === null ? 'missing reading' : `${r.psi} psi`}, ${st}`} onFocus={() => setHover(r)} onBlur={() => setHover(null)} onMouseEnter={() => setHover(r)} onMouseLeave={() => setHover(null)} onClick={() => setHover(r)}>
          <rect x={x(r.minute) - 18} y={T} width="36" height={H - T - B} className="chart-hit" />
          {on && <line x1={x(r.minute)} x2={x(r.minute)} y1={T} y2={H - B} className="chart-cursor" />}
          {v === null ? <g className="chart-gap"><line x1={x(r.minute)} x2={x(r.minute)} y1={y(8)} y2={y(30)} /><text x={x(r.minute)} y={y(30) - 10} textAnchor="middle">?</text></g>
            : <circle cx={x(r.minute)} cy={y(v)} r={on ? 9 : st === 'ok' ? 4 : 6} className={`chart-point ${st}`} />}
        </g>;
      })}
    </svg>
    <figcaption>
      <span className="chart-reading" aria-live="polite">{hover ? <><b>{hover.psi ?? '?'}</b>{hover.psi === null ? ' missing' : ` psi${hover.stale ? ' · stale' : readingStatus(hover) === 'low' ? ' · below 20' : ''}`} · {hover.minute} min</> : 'Hover a reading for detail'}</span>
      <span className="chart-legend"><span><i className="legend-low" />Below 20</span><span><i className="legend-stale" />Stale</span><span><i className="legend-gap" />Missing</span></span>
    </figcaption>
  </figure>;
}
