---
title: "0001: Rust core compiled to WebAssembly"
sidebar_label: "0001: Rust core in WebAssembly"
---

# 0001: Rust core compiled to WebAssembly

**Status:** accepted

## Context

The simulator is pure computation: it enumerates and counts microstates. It should run without a
backend so that it can be hosted as a static site (GitHub Pages) and self-hosted with a trivial
container. Large configurations have tens of millions of microstates, so the computation must be
fast.

## Decision

The simulation is written in Rust as a library without dependencies (`simulator-core`) and
compiled to WebAssembly through a separate adapter crate (`simulator-wasm`) with wasm-bindgen.

## Consequences

- The site is static; the browser does all the work and no data leaves the user's device.
- Rust gives near-native speed in the browser, exact integer arithmetic and a strong type system.
- The core can be tested natively with `cargo test`, independent of the browser.
- Keeping all wasm-specific code in the adapter keeps the core reusable, for example for a
  command-line tool.
- Contributors need a Rust toolchain in addition to Node.js; `rust-toolchain.toml` and the
  `wasm-pack` npm dependency keep the setup to `rustup` and `npm ci`.
