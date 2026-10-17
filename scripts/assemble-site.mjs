// Combines the simulator (web/dist) and the documentation (docs/build) into one static site in
// dist/, with the documentation under dist/docs/. The documentation's "page not found" page is
// also copied to dist/404.html, where GitHub Pages and the nginx configuration look for it (its
// links are absolute, so it works at any path).
import { cpSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const parts = [
  { from: "web/dist", to: "dist" },
  { from: "docs/build", to: "dist/docs" },
];

rmSync(`${root}dist`, { recursive: true, force: true });
for (const { from, to } of parts) {
  if (!existsSync(`${root}${from}`)) {
    throw new Error(`${from} is missing; build the workspaces first.`);
  }
  cpSync(`${root}${from}`, `${root}${to}`, { recursive: true });
}
cpSync(`${root}dist/docs/404.html`, `${root}dist/404.html`);
console.log("Site assembled in dist/");
