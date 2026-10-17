# Simulator for spectroscopic terms

[![Simulator](https://img.shields.io/badge/simulator-online-4338ca)](https://lukaeichten.github.io/SimulatorForSpectroscopicTerms/)
[![Documentation](https://img.shields.io/badge/docs-user%20%26%20developer%20guide-0f766e)](https://lukaeichten.github.io/SimulatorForSpectroscopicTerms/docs/)
[![CI](https://github.com/lukaeichten/SimulatorForSpectroscopicTerms/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/lukaeichten/SimulatorForSpectroscopicTerms/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/lukaeichten/SimulatorForSpectroscopicTerms/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/lukaeichten/SimulatorForSpectroscopicTerms/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-WebAssembly-b7410e?logo=rust)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Vite-3178c6?logo=typescript&logoColor=white)](https://vite.dev)

The simulator derives the Russell–Saunders term symbols of an electron configuration (for example
p² or d³) by listing all of its microstates. It runs entirely in the browser: the computation is
written in Rust and compiled to WebAssembly, so the site is static and needs no backend.

- **Simulator:** <https://lukaeichten.github.io/SimulatorForSpectroscopicTerms/>
- **User guide:** <https://lukaeichten.github.io/SimulatorForSpectroscopicTerms/docs/user/introduction/>
  (including how the terms are derived)
- **Developer guide:** <https://lukaeichten.github.io/SimulatorForSpectroscopicTerms/docs/developer/overview/>

The documentation sources are in [`docs/content/`](docs/content).

## Quick start

Requirements: [Rust](https://rustup.rs) (via `rustup`) and [Node.js](https://nodejs.org) 22.12 or
newer.

```sh
npm ci
npm run dev        # simulator on http://localhost:5173, documentation on /docs
npm test
cargo test --workspace
```

## Docker

```sh
docker build -t simulator-for-spectroscopic-terms .
docker run --rm -p 8080:8080 simulator-for-spectroscopic-terms
```

The simulator is then available on <http://localhost:8080/> and the documentation on
<http://localhost:8080/docs/>. To host it under your own address, pass `SITE_URL` (and
`SITE_BASE_PATH` for a sub path) as build arguments; see the
[deployment guide](https://lukaeichten.github.io/SimulatorForSpectroscopicTerms/docs/developer/deployment/).

## License

[MIT](LICENSE)
