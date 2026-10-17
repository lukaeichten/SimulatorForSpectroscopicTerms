---
sidebar_position: 7
title: Testing
description: The automated tests and the continuous integration pipeline.
---

# Testing

## Rust

```bash
cargo test --workspace
```

- **Unit tests** next to the code in each module of `crates/core/src`.
- **`crates/core/tests/textbook_terms.rs`** compares derived terms with textbook results (p², p³,
  d², d³, d⁵, s¹ p¹, p¹ d¹, …) and checks for many configurations that the terms account for every
  microstate exactly once: $\sum \text{count} \cdot (2L+1)(2S+1) = N$, where $N$ is the number of
  microstates.
- **Simulation tests** check that paging and filtering return the same microstates as a full
  enumeration, and that the largest configuration is handled without enumerating it.
- **Documentation tests**: the example in the crate documentation is compiled and run.

## Frontend

```bash
npm test
```

[Vitest](https://vitest.dev) runs:

- unit tests of the pure modules (`query.test.ts`, `format.test.ts`);
- `simulator-service.test.ts`, an integration test that loads the real WebAssembly module in
  Node.js and checks the API contract (DTO shapes, filtering, paging, error handling). It needs
  the wasm package, which `npm test` builds first.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests:

| Job    | Steps                                                                               |
| ------ | ----------------------------------------------------------------------------------- |
| Rust   | `cargo fmt --check`, clippy (native and wasm target, warnings are errors), tests    |
| Web    | `npm ci`, tests, lint, full build of simulator and documentation                    |
| Docker | Builds the Docker image without publishing it                                       |
