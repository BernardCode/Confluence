<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->
# AGENTS

- LeakLens demo state lives in a pure reducer (src/lib/leaklens/reducer.ts) persisted to versioned localStorage; keep rules there so tests cover them.
- AI drafting runs server-side via Lovable AI Gateway (ai.server.ts behind ai.functions.ts); never call the gateway from the browser.

- The public 3D network lives in a lazy-loaded scene with Three.js imported inside an effect; keep browser rendering isolated so SSR and existing demo routes remain unchanged.
- Scope public landing-page styling under its own page class and semantic CSS tokens to preserve the demo design system.
- Animate the actual navigation lockup from measured viewport bounds with the Web Animations API, rather than a duplicate logo, to guarantee an exact final alignment.
- Build network branches from shared centerline junctions and animate flow in shader uniforms; project sensor popups from their 3D anchors without per-frame React updates to keep geometry coherent and rendering lean.
- Hero pipe contours are view-aligned silhouettes drawn as screen-space Line2 strokes behind a depth mask, derived from the same curves as the tubes, so outlines never detach or twist at bends.
- Demo presentation derives workflow stages and monitoring alerts from the existing reducer state; guided view selection never mutates simulation state.
- The demo network canvas uses source segment coordinates with a custom Pointer Events camera written to the DOM outside React; expose only the existing P-114 pressure sensor rather than inventing readings for other segments.
- Scope product-demo tokens under `.confluence-demo` so shared Confluence branding does not alter the public landing page or its motion.
