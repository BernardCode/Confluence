# Confluence

Confluence is a water-network monitoring demo. It shows how a utility team could connect vulnerable pipes, low-pressure events, and a human-reviewed response in one workflow.

**Live site: https://bernardcode.github.io/Confluence/**

Everything in the demo is simulated. The network, sensors, readings, and advisories are fictional, and nothing is ever sent.

## Pages

| Route   | What it is                                                                     |
| ------- | ------------------------------------------------------------------------------ |
| `/`     | Landing page with an interactive 3D pipe network                               |
| `/ops`  | Operations demo: risk map, pressure chart, and a seven-stage incident workflow |
| `/crew` | Field crew view for repairs, flushing, sampling, and clearance                 |

Demo state is kept in the browser (`localStorage`), so use the reset button in the operations view to start over.

## Stack

TanStack Start (SPA mode), React 19, TypeScript, Tailwind CSS 4, Three.js, Recharts, and shadcn/ui. Tests run on Vitest.

## Run locally

```sh
bun install
bun run dev
```

Other scripts:

```sh
bun run test        # unit and routing tests
bun run typecheck   # tsc --noEmit
bun run lint        # eslint + prettier
bun run build       # static build in dist/client
bun run preview     # serve the build locally
```

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`, which type-checks, tests, builds, and publishes `dist/client` to GitHub Pages. The site is served from `/Confluence/`, set in `vite.config.ts`. To build for a different base path, set `SITE_BASE`, for example `SITE_BASE=/ bun run build`.

The build prerenders each route to static HTML, and `postbuild` adds a `404.html` and `.nojekyll` for Pages.

## Project layout

```
src/
  routes/               pages (file-based routing)
  components/leaklens/  demo and landing components
  components/ui/        shared shadcn/ui components
  lib/leaklens/         data, reducer, store, and drafting logic (with tests)
scripts/postbuild.mjs   makes the build Pages-ready
```
