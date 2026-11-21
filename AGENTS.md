# AGENTS

- LeakLens demo state lives in a pure reducer (src/lib/leaklens/reducer.ts) persisted to versioned localStorage; keep rules there so tests cover them.
- The site is a static SPA on GitHub Pages (no server). Advisory drafting is template-based in src/lib/leaklens/draft.ts; do not add server functions or secrets.

- The public 3D network lives in a lazy-loaded scene with Three.js imported inside an effect; keep browser rendering isolated so SSR and existing demo routes remain unchanged.
- Scope public landing-page styling under its own page class and semantic CSS tokens to preserve the demo design system.
- Animate the actual navigation lockup from measured viewport bounds with the Web Animations API, rather than a duplicate logo, to guarantee an exact final alignment.
- Build network branches from shared centerline junctions and animate flow in shader uniforms; project sensor popups from their 3D anchors without per-frame React updates to keep geometry coherent and rendering lean.
- Hero pipe contours are view-aligned silhouettes drawn as screen-space Line2 strokes behind a depth mask, derived from the same curves as the tubes, so outlines never detach or twist at bends.
- Demo presentation derives workflow stages and monitoring alerts from the existing reducer state; guided view selection never mutates simulation state.
- The demo network canvas uses source segment coordinates with a custom Pointer Events camera written to the DOM outside React; expose only the existing P-114 pressure sensor rather than inventing readings for other segments.
- Scope product-demo tokens under `.confluence-demo` so shared Confluence branding does not alter the public landing page or its motion.
