---
sidebar_position: 8
title: Deployment
description: Publishing the site on GitHub Pages or with Docker.
---

# Deployment

The site is a set of static files in `dist/`, produced by `npm run build`. Any static web server
can serve it.

## Base path

The simulator uses relative URLs and works under any path. The documentation needs its path at
build time, taken from these environment variables:

| Variable         | Meaning                                           | Default                       |
| ---------------- | ------------------------------------------------- | ----------------------------- |
| `SITE_BASE_PATH` | Path of the simulator; the docs are at `…/docs/`  | `/`                           |
| `SITE_URL`       | Origin of the site (for the absolute URLs in the documentation's sitemap) | `https://lukaeichten.github.io` |

```bash
SITE_BASE_PATH=/SimulatorForSpectroscopicTerms/ npm run build
```

### Build cache

Docusaurus keeps a webpack cache in `docs/node_modules/.cache/` that makes repeated builds much
faster. That cache does not notice a changed `SITE_BASE_PATH` by itself: a build would then reuse
CSS from the previous build, whose asset URLs (for example the KaTeX fonts of the formulas)
point to the old path. In the browser, the formulas then fall back to other fonts and the
network tab shows `404` errors for `KaTeX_*` font files.

To prevent this, `docs/docusaurus.config.ts` contains a small plugin (`cache-per-base-path`) that
adds the base path to the cache name, so each base path gets its own cache. Builds for the root
path and for the GitHub Pages path can therefore be alternated freely. Keep this plugin when
changing the configuration. When testing a build under another path, it is still worth checking
the network tab for `404` errors. If a build looks stale, `npm run clear --workspace docs`
removes all caches.

CI, GitHub Pages and Docker builds always start without a cache and are not affected.

### Page not found

`npm run build` copies the documentation's "page not found" page to `dist/404.html`. GitHub Pages
and the nginx configuration of the Docker image serve it for every unknown URL, including
unknown paths of the simulator.

## GitHub Pages

`.github/workflows/pages.yml` builds the site with `SITE_BASE_PATH=/<repository name>/` and
deploys it on every push to `main`. Enable it once in the repository settings under
*Pages → Build and deployment → Source: GitHub Actions*.

## Docker

No prebuilt image is published, because the documentation must be built for the address it is
served from. Build the image for your own address:

```bash
docker build -t simulator-for-spectroscopic-terms .
docker run --rm -p 8080:8080 simulator-for-spectroscopic-terms
```

The `Dockerfile` has two stages:

1. **Build** (Node.js image with Rust installed through `rustup`): installs the npm workspaces
   and runs `npm run build`. Its output does not depend on the CPU architecture, so this stage
   always runs natively, even when building images for other platforms.
2. **Runtime** (`nginxinc/nginx-unprivileged`): serves `dist/` on port 8080 as a non-root user,
   with the configuration in `docker/nginx.conf`: gzip, long-term caching of the hashed assets
   of simulator and documentation, the `application/wasm` MIME type, relative redirects (so
   adding a trailing slash keeps the published port and scheme) and the 404 page.

By default the image is built for `http://localhost:8080/`. Pass the address it will be served
from as build arguments (see [Base path](#base-path)):

```bash
docker build \
  --build-arg SITE_URL=https://simulator.example.org \
  --build-arg SITE_BASE_PATH=/ \
  -t simulator-for-spectroscopic-terms .
```

The container always serves the site at its root. For a sub path such as `/simulator/`, build
with `SITE_BASE_PATH=/simulator/` and configure the reverse proxy in front of it to strip that
prefix.

The CI workflow builds the image on pushes to `main` and on pull requests to check the
`Dockerfile`, but does not publish it.
