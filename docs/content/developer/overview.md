---
sidebar_position: 1
title: Overview
description: Setting up the development environment and the layout of the repository.
---

# Developer guide

The simulator is a static website: a Rust library compiled to WebAssembly does the computation,
a TypeScript frontend renders the results, and this Docusaurus site documents both. There is no
backend.

## Requirements

- [Rust](https://rustup.rs) via `rustup`. The toolchain version, the `wasm32-unknown-unknown`
  target, `rustfmt` and `clippy` are installed automatically from `rust-toolchain.toml`.
- [Node.js](https://nodejs.org) 22.12 or newer. `wasm-pack` is an npm dependency and needs no
  separate installation.

## Getting started

```bash
npm ci              # installs the dependencies of all npm workspaces and the Git hook
npm run dev         # simulator on http://localhost:5173 (builds the wasm package first)
```

`npm run dev` starts two dev servers: the simulator (Vite, port 5173) and the documentation
(Docusaurus, port 3000). The simulator's dev server forwards `/docs` to the documentation dev
server, so the *Documentation* link works on port 5173. Use `npm run dev:web` or
`npm run dev:docs` to start only one of them. After changing Rust code, run
`npm run wasm:dev --workspace web` (or restart `npm run dev`) to rebuild the WebAssembly package.

`npm ci` also installs a pre-commit hook that checks the formatting and lint of the staged
files; see [Git hook](./testing.md#git-hook).

## Commands

Run from the repository root:

| Command             | Description                                                                  |
| ------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`       | Simulator and documentation dev servers with hot reload                      |
| `npm run dev:web`   | Only the simulator dev server                                                |
| `npm run dev:docs`  | Only the documentation dev server (http://localhost:3000/docs/)              |
| `npm run build`     | Release build of simulator and documentation into `dist/`                    |
| `npm run preview`   | Serves `dist/` locally                                                       |
| `npm test`          | Frontend unit tests and WebAssembly integration tests (Vitest)               |
| `npm run lint`      | ESLint and Prettier for the frontend, type check of the documentation        |
| `cargo test --workspace` | Rust unit, integration and documentation tests                          |
| `cargo clippy --workspace --all-targets -- -D warnings` | Rust lints                              |
| `cargo fmt --all`   | Formats the Rust code                                                         |

## Repository layout

```text
.
├── crates/
│   ├── core/            Simulation logic (pure Rust, no dependencies)
│   └── wasm/            WebAssembly bindings (wasm-bindgen)
├── web/                 Simulator frontend (TypeScript, Vite, Bootstrap)
├── docs/                This documentation (Docusaurus)
│   ├── content/user/        User guide
│   └── content/developer/   Developer guide and decision records
├── scripts/             Assembly of the final static site
├── docker/              nginx configuration of the Docker image
├── Dockerfile
├── Cargo.toml           Rust workspace
├── lefthook.yml         Pre-commit hook
├── package.json         npm workspaces (web, docs)
└── rust-toolchain.toml
```

The following pages describe the [architecture](./architecture.md), the
[core crate](./core-crate.md), the [WebAssembly bindings](./wasm-bindings.md), the
[web frontend](./web-frontend.md) and [the documentation](./documentation.md), followed by
[testing](./testing.md), [deployment](./deployment.md), [extending](./extending.md) and the
[decision records](./decisions/0001-rust-core-compiled-to-webassembly.md).
