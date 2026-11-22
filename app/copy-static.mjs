// The React build produces app/dist, but the site is bigger than the landing
// page: downloads, the docs tree, the shared assets, the vendored Three.js and
// the install script are all still static files. Copy them into dist so a
// GitHub Pages deploy serves the whole site, not just the landing page.
import { cpSync, copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "app", "dist");

mkdirSync(out, { recursive: true });

for (const entry of ["assets", "docs", "vendor"]) {
  cpSync(join(root, entry), join(out, entry), { recursive: true });
  console.log(`copied ${entry}/`);
}

for (const file of [
  "downloads.html",
  "downloads.js",
  "install.sh",
  // shared by the static pages, which reference these at the site root
  "fx.js",
  "theme.js",
  "themes.js",
  "style.css",
  "themes.css",
]) {
  copyFileSync(join(root, file), join(out, file));
  console.log(`copied ${file}`);
}
