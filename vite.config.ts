// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// The site is published as a static SPA on GitHub Pages at /Confluence/.
const base = process.env["SITE_BASE"] ?? "/Confluence/";

export default defineConfig({
  nitro: false,
  tanstackStart: {
    prerender: { enabled: true, crawlLinks: true, failOnError: true },
  },
  vite: { base },
});
