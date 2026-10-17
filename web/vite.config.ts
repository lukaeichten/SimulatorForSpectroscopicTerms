import type { ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const wasmPackage = fileURLToPath(new URL("../crates/wasm/pkg", import.meta.url));

/** Port of the documentation dev server (`npm run dev:docs` in the repository root). */
const DOCS_DEV_PORT = 3000;

export default defineConfig({
  // Relative asset URLs: the same build works on GitHub Pages (served from /<repository>/),
  // in the Docker image (served from /) and from any other sub path.
  base: "./",
  resolve: {
    alias: { "@wasm": wasmPackage },
  },
  server: {
    // In production the documentation is served from ./docs/ next to the app.
    proxy: {
      "/docs": {
        target: `http://localhost:${DOCS_DEV_PORT}`,
        ws: true,
        configure: (proxy) => {
          proxy.on("error", (_error, _request, response) => {
            if ("writeHead" in response && !response.headersSent) {
              explainMissingDocsServer(response);
            }
          });
        },
      },
    },
  },
  preview: {
    // `npm run preview` serves the assembled site, which contains the documentation itself.
    proxy: {},
  },
  build: {
    target: "es2022",
  },
  test: {
    environment: "node",
  },
});

/** Replaces the bare "502 Bad Gateway" when the documentation dev server is not reachable. */
function explainMissingDocsServer(response: ServerResponse): void {
  response.writeHead(503, { "Content-Type": "text/html; charset=utf-8", "Retry-After": "5" });
  response.end(`<!doctype html>
<meta charset="utf-8">
<meta http-equiv="refresh" content="5">
<title>Documentation not running</title>
<body style="font-family: system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1rem">
<h1>The documentation dev server is not reachable</h1>
<p>It is expected on port ${DOCS_DEV_PORT}. <code>npm run dev</code> in the repository root starts
it together with the simulator; it can take a few seconds to start. If you started only the
simulator (<code>npm run dev:web</code>), run <code>npm run dev:docs</code> as well.</p>
<p>This page reloads automatically every 5 seconds.</p>
</body>`);
}
