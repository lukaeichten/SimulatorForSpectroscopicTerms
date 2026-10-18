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

## Git hook

A pre-commit hook, managed by [Lefthook](https://lefthook.dev) and configured in `lefthook.yml`,
checks the staged files before each commit. It only runs fast checks (about two seconds), in
parallel:

| Check    | Files                                  | Fix                                |
| -------- | -------------------------------------- | ---------------------------------- |
| rustfmt  | staged `*.rs`                          | `cargo fmt --all`                  |
| Prettier | staged files in `web/`                 | `npm run format --workspace web`   |
| ESLint   | staged `*.ts` and `*.js` in `web/`     | fix the reported problems          |

The checks only report problems and never change files; fix them, stage the changes and commit
again. Clippy, the tests and the builds take longer and run in
[continuous integration](#continuous-integration) instead.

`npm install` and `npm ci` install the hook automatically (the root `package.json` allows
Lefthook's install script under `allowScripts`). In CI and in the Docker build the installation
is skipped. Further commands:

```bash
npx lefthook install                         # (re)install the hook manually
npx lefthook run pre-commit --all-files      # run the checks on all files
git commit --no-verify                       # skip the hook once
```

The hook uses the local Rust toolchain. If it is older than the latest stable release used in
CI, newer clippy lints only show up in CI; `rustup update stable` keeps them in sync.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests:

| Job    | Steps                                                                               |
| ------ | ----------------------------------------------------------------------------------- |
| Rust   | `cargo fmt --check`, clippy (native and wasm target, warnings are errors), tests    |
| Web    | `npm ci`, tests, lint, full build of simulator and documentation                    |
| Docker | Builds the Docker image without publishing it                                       |
