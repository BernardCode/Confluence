import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Plus, Minus, Scan } from 'lucide-react';
import { SEGMENTS, riskBreakdown } from '@/lib/leaklens/data';

const W = 760, H = 500;
const BW = 640, BH = 400, BCX = 390, BCY = 272; // drawn bounds incl. sensor and stroke
const SENSOR: [number, number] = [178, 300];
const JUNCTIONS: [number, number][] = [[260, 300], [300, 260], [460, 260], [560, 200]];
type Cam = { x: number; y: number; k: number };
type Pt = { x: number; y: number };

export function midpoint(path: [number, number][]): [number, number] {
  const lens = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i]![0], p[1] - path[i]![1]));
  let half = lens.reduce((a, b) => a + b, 0) / 2;
  for (let i = 0; i < lens.length; i++) {
    const l = lens[i]!;
    if (half <= l) { const a = path[i]!, b = path[i + 1]!, t = half / l; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
    half -= l;
  }
  return path[0] ?? [0, 0];
}
const pts = (p: [number, number][]) => p.map(q => q.join(',')).join(' ');

type Props = {
  selected: string; hovered: string | null; alert: boolean; panelOpen: boolean; panel: ReactNode; focusSignal: number;
  onSelect: (id: string) => void; onHover: (id: string | null) => void; onSensor: () => void;
};

/** Borderless network canvas. Camera updates bypass React so dragging stays at frame rate. */
export function NetworkCanvas({ selected, hovered, alert, panelOpen, panel, focusSignal, onSelect, onHover, onSensor }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const group = useRef<SVGGElement>(null);
  const cam = useRef<Cam>({ x: 0, y: 0, k: 1 });
  const home = useRef<Cam>({ x: 0, y: 0, k: 1 });
  const size = useRef({ w: 0, h: 0 });
  const raf = useRef<number | null>(null);
  const reduced = useRef(false);
  const narrow = useRef(false);
  const engaged = useRef(false);
  const pointers = useRef(new Map<number, Pt>());
  const gesture = useRef<{ start: Pt; moved: boolean; seg: string | null; sensor: boolean; samples: { x: number; y: number; t: number }[]; pinch?: { d: number; mid: Pt } | undefined } | null>(null);

  const clamp = useCallback((c: Cam): Cam => {
    const { w, h } = size.current, b = home.current.k;
    const k = Math.min(b * 3.2, Math.max(b * 0.7, c.k));
    return { k, x: Math.min(w * 0.75, Math.max(w * 0.25 - W * k, c.x)), y: Math.min(h * 0.75, Math.max(h * 0.25 - H * k, c.y)) };
  }, []);

  const apply = useCallback(() => {
    const c = cam.current, el = wrap.current;
    group.current?.setAttribute('transform', `translate(${c.x} ${c.y}) scale(${c.k})`);
    if (!el) return;
    const { w, h } = size.current;
    el.querySelectorAll<HTMLElement>('[data-anchor]').forEach(o => {
      const [ax = 0, ay = 0] = (o.dataset['anchor'] ?? '').split(',').map(Number);
      const sx = c.x + ax * c.k, sy = c.y + ay * c.k;
      if (o.dataset['kind'] === 'panel') {
        if (narrow.current) { o.style.left = ''; o.style.top = ''; o.style.transformOrigin = '50% 0'; return; }
        const pw = o.offsetWidth, ph = o.offsetHeight;
        const right = sx + 40 + pw < w - 20;
        const left = Math.max(20, Math.min(w - pw - 20, right ? sx + 40 : sx - 40 - pw));
        const top = Math.max(20, Math.min(h - ph - 20, sy - ph / 2));
        o.style.left = `${left}px`; o.style.top = `${top}px`; o.style.transformOrigin = `${sx - left}px ${sy - top}px`;
      } else { o.style.left = `${sx}px`; o.style.top = `${sy}px`; }
    });
  }, []);

  const stop = () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = null; };

  // Critically damped spring (~0.38s response) toward a target camera.
  const animateTo = useCallback((target: Cam) => {
    stop();
    const t = clamp(target);
    if (reduced.current) { cam.current = t; apply(); return; }
    const v = { x: 0, y: 0, k: 0 }, w0 = (2 * Math.PI) / 0.38;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000); last = now;
      const c = { ...cam.current };
      (['x', 'y', 'k'] as const).forEach(key => { const a = w0 * w0 * (t[key] - c[key]) - 2 * w0 * v[key]; v[key] += a * dt; c[key] += v[key] * dt; });
      cam.current = c; apply();
      if (Math.abs(t.x - c.x) + Math.abs(t.y - c.y) < 0.3 && Math.abs(t.k - c.k) < 0.0005) { cam.current = t; apply(); raf.current = null; return; }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [apply, clamp]);

  const glide = useCallback((vx: number, vy: number) => {
    stop();
    if (reduced.current) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000); last = now;
      const c = cam.current;
      cam.current = clamp({ ...c, x: c.x + vx * dt, y: c.y + vy * dt });
      const decay = Math.exp(-dt * 6); vx *= decay; vy *= decay;
      apply();
      raf.current = Math.hypot(vx, vy) > 12 ? requestAnimationFrame(step) : null;
    };
    raf.current = requestAnimationFrame(step);
  }, [apply, clamp]);

  const zoomAt = useCallback((p: Pt, factor: number) => {
    const c = cam.current;
    const k = clamp({ ...c, k: c.k * factor }).k, r = k / c.k;
    cam.current = clamp({ k, x: p.x - (p.x - c.x) * r, y: p.y - (p.y - c.y) * r });
    apply();
  }, [apply, clamp]);

  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = wrap.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fit = () => {
      const w = el.clientWidth, h = el.clientHeight;
      narrow.current = w < 720;
      // Fit the drawn network bounds (not the padded viewBox) so the default view is ~1.6x larger.
      const k = Math.min(w / BW, h / BH) * (narrow.current ? 0.9 : 0.96);
      size.current = { w, h };
      home.current = { k, x: w / 2 - BCX * k, y: h / 2 - BCY * k };
      cam.current = home.current; apply();
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && !engaged.current) return; // never trap page scrolling until the user engages the map
      e.preventDefault(); stop();
      zoomAt(local(e), Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0022)));
    };
    const leave = () => { engaged.current = false; el.dataset['engaged'] = 'false'; };
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('pointerleave', leave);
    return () => { ro.disconnect(); el.removeEventListener('wheel', wheel); el.removeEventListener('pointerleave', leave); stop(); };
  }, [apply, zoomAt]);

  useLayoutEffect(() => { apply(); });

  useEffect(() => {
    if (!focusSignal) return;
    const seg = SEGMENTS.find(s => s.id === selected); if (!seg) return;
    const [mx, my] = midpoint(seg.path), { w, h } = size.current;
    const k = Math.max(cam.current.k, home.current.k * 1.1);
    animateTo({ k, x: w * (narrow.current ? 0.5 : 0.3) - mx * k, y: h * 0.5 - my * k });
  }, [focusSignal, selected, animateTo]);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('.canvas-ui')) return;
    stop();
    engaged.current = true; wrap.current!.dataset['engaged'] = 'true';
    wrap.current!.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 1) {
      const t = e.target as Element;
      gesture.current = { start: p, moved: false, seg: t.closest<SVGElement>('[data-seg]')?.dataset['seg'] ?? null, sensor: !!t.closest('[data-sensor]'), samples: [{ ...p, t: performance.now() }] };
    } else if (gesture.current) {
      const [a, b] = [...pointers.current.values()] as [Pt, Pt];
      gesture.current.moved = true;
      gesture.current.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current, prev = pointers.current.get(e.pointerId);
    if (!g || !prev) return;
    const p = local(e); pointers.current.set(e.pointerId, p);
    if (pointers.current.size >= 2 && g.pinch) {
      const [a, b] = [...pointers.current.values()] as [Pt, Pt];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      cam.current = clamp({ ...cam.current, x: cam.current.x + mid.x - g.pinch.mid.x, y: cam.current.y + mid.y - g.pinch.mid.y });
      zoomAt(mid, d / (g.pinch.d || d));
      g.pinch = { d, mid };
      return;
    }
    if (!g.moved && Math.hypot(p.x - g.start.x, p.y - g.start.y) < 5) return;
    if (!g.moved) { g.moved = true; wrap.current!.dataset['dragging'] = 'true'; onHover(null); }
    cam.current = clamp({ ...cam.current, x: cam.current.x + p.x - prev.x, y: cam.current.y + p.y - prev.y });
    apply();
    const now = performance.now();
    g.samples.push({ ...p, t: now });
    g.samples = g.samples.filter(s => now - s.t < 90);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointers.current.delete(e.pointerId)) return;
    const g = gesture.current;
    if (!g) return;
    if (pointers.current.size > 0) { if (g.pinch) g.pinch = undefined; const [rest] = [...pointers.current.values()]; if (rest) g.start = rest; return; }
    wrap.current!.dataset['dragging'] = 'false';
    gesture.current = null;
    if (!g.moved) { if (g.seg) onSelect(g.seg); else if (g.sensor) onSensor(); return; }
    const first = g.samples[0], last = g.samples.at(-1);
    if (first && last && last.t - first.t > 8 && e.type === 'pointerup') {
      const dt = (last.t - first.t) / 1000, cap = 2400;
      glide(Math.max(-cap, Math.min(cap, (last.x - first.x) / dt)), Math.max(-cap, Math.min(cap, (last.y - first.y) / dt)));
    }
  };

  const zoomCenter = (f: number) => { const { w, h } = size.current, c = cam.current; const k = c.k * f; animateTo({ k, x: w / 2 - (w / 2 - c.x) * (k / c.k), y: h / 2 - (h / 2 - c.y) * (k / c.k) }); };
  const sel = SEGMENTS.find(s => s.id === selected);
  const hov = SEGMENTS.find(s => s.id === hovered);
  const key = (id: string) => (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(id); } };

  return <div ref={wrap} className="network-canvas" data-alert={alert} data-panel={panelOpen} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
    <svg className="canvas-svg" role="group" aria-label="Interactive schematic water network, simulated data. Drag to pan, pinch or Control and scroll to zoom.">
      <defs>
        <radialGradient id="sensor-glow"><stop offset="0" stopColor="var(--demo-alert)" stopOpacity=".55" /><stop offset="1" stopColor="var(--demo-alert)" stopOpacity="0" /></radialGradient>
      </defs>
      <g ref={group}>
        {SEGMENTS.map(s => <polyline key={s.id} points={pts(s.path)} className="pipe-outline" />)}
        {SEGMENTS.map(s => <polyline key={s.id} points={pts(s.path)} className="pipe-water" />)}
        {SEGMENTS.map(s => {
          const isAlert = alert && s.id === 'S-114';
          return <g key={s.id} data-seg={s.id} className="pipe-seg" tabIndex={0} role="button" aria-pressed={selected === s.id} aria-label={`${s.name}, ${s.area}, risk ${riskBreakdown(s).score} of 100`}
            data-selected={selected === s.id && panelOpen} data-hovered={hovered === s.id} data-alert={isAlert}
            onPointerEnter={() => { if (!gesture.current?.moved) onHover(s.id); }} onPointerLeave={() => onHover(null)} onKeyDown={key(s.id)} onFocus={() => onHover(s.id)} onBlur={() => onHover(null)}>
            <polyline points={pts(s.path)} className="pipe-glow" />
            <polyline points={pts(s.path)} className="pipe-shine" />
            <polyline points={pts(s.path)} className="pipe-flow" />
            <polyline points={pts(s.path)} className="pipe-flow pipe-flow-soft" />
            {isAlert && <polyline points={pts([...s.path].reverse())} className="pipe-signal" pathLength={1} />}
            <polyline points={pts(s.path)} className="pipe-hit" />
          </g>;
        })}
        {JUNCTIONS.map(([x, y]) => <g key={`${x}-${y}`} className="pipe-junction"><circle cx={x} cy={y} r="13" /><circle cx={x} cy={y} r="6.5" /></g>)}
        <g transform="translate(120 160)" className="pipe-terminal"><circle r="10" /><circle r="4" /></g>
        <g data-sensor className="canvas-sensor" data-alert={alert} transform={`translate(${SENSOR[0]} ${SENSOR[1]})`} tabIndex={0} role="button" aria-label="Pressure sensor P-114 on Arroyo Avenue" onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSensor(); } }}>
          <circle r="54" cy="-58" className="sensor-halo" fill="url(#sensor-glow)" />
          <path d="M-5 -10 V-34 M5 -10 V-34" className="sensor-stem" />
          <path d="M-26 -38 V-60 L0 -71 L26 -61 V-39 L0 -28 Z M-26 -60 L0 -49 L26 -61 M0 -49 V-28" className="sensor-body" />
          <ellipse cy="-61" rx="8" ry="4" className="sensor-led" />
          <ellipse cy="-61" rx="20" ry="10" className="sensor-ring" />
        </g>
      </g>
    </svg>
    {hov && hov.id !== (panelOpen ? selected : '') && <div className="canvas-tip" data-anchor={midpoint(hov.path).join(',')}><strong>{hov.name}</strong><span>Risk {riskBreakdown(hov).score}</span></div>}
    {alert && <div className="canvas-alert canvas-ui" data-anchor={`${SENSOR[0]},${SENSOR[1] - 78}`}><button type="button" onClick={onSensor}><i />Pressure drop at P-114</button></div>}
    <div className="canvas-panel canvas-ui" data-kind="panel" data-open={panelOpen && !!sel} data-anchor={sel ? midpoint(sel.path).join(',') : '0,0'} aria-hidden={!panelOpen}>{panel}</div>
    <div className="canvas-tools canvas-ui">
      <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => zoomCenter(1.35)}><Plus /></button>
      <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => zoomCenter(1 / 1.35)}><Minus /></button>
      <button type="button" aria-label="Reset network view" title="Reset view" onClick={() => animateTo(home.current)}><Scan /></button>
    </div>
    <p className="canvas-hint">Drag to pan · click, then scroll to zoom</p>
  </div>;
}
