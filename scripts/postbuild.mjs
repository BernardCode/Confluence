// Makes the prerendered TanStack Start output (dist/client) ready for GitHub Pages.
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = "dist/client";
const home = join(out, "index.html");
if (!existsSync(home))
  throw new Error(`${home} not found. Did the build succeed?`);

// Pages serves 404.html for unknown URLs; the client router then shows the app's not-found page.
copyFileSync(home, join(out, "404.html"));
writeFileSync(join(out, ".nojekyll"), "");
console.log("postbuild: wrote 404.html, .nojekyll");
