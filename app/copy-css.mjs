// The site's CSS lives at the repository root so the static pages keep using
// it; Vite's root is app/, so copy it in before every build.
import { copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
for (const file of ["style.css", "themes.css"]) {
  copyFileSync(join(here, "..", file), join(here, "src", file));
  console.log(`copied ${file}`);
}
