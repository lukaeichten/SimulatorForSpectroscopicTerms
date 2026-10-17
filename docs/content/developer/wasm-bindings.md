---
sidebar_position: 4
title: WebAssembly bindings
description: The simulator-wasm crate that exposes the core to JavaScript.
---

# WebAssembly bindings (`simulator-wasm`)

`crates/wasm` is a thin adapter around the core crate, built with
[wasm-bindgen](https://github.com/wasm-bindgen/wasm-bindgen) and
[wasm-pack](https://github.com/wasm-bindgen/wasm-pack). It contains no simulation logic.

## API

| Export                                               | Returns                                                  |
| ---------------------------------------------------- | -------------------------------------------------------- |
| `subshellKinds()`                                    | The supported subshells (symbol, $l$, capacity, $m_l$ values). |
| `new Simulator(electrons: Uint32Array)`              | A simulation; throws if a subshell is overfilled.        |
| `simulator.summary()`                                | States per subshell and the total number of microstates. |
| `simulator.terms()`                                  | All terms.                                               |
| `simulator.microstatePage(termIndices, page, size)`  | One page of microstates, filtered by zero-based term indices. |
| `simulator.free()`                                   | Releases the WebAssembly memory of the simulation.       |

## Data transfer objects

`src/dto.rs` converts the core types into structs that `serde-wasm-bindgen` serializes into
plain JavaScript objects with camelCase keys. Half-integers become JavaScript numbers, which
represent multiples of ½ exactly.

The TypeScript declarations of these objects are written in a `typescript_custom_section` in
`dto.rs` and emitted into the generated `.d.ts` file; the exported functions reference them with
`unchecked_return_type`. The frontend is therefore type checked against the Rust API. When you
change a DTO, update its declaration in the same file.

## Building

```bash
npm run wasm --workspace web       # release build
npm run wasm:dev --workspace web   # debug build (faster to compile)
```

Both write the package to `crates/wasm/pkg/` (ignored by git), which the frontend imports through
the `@wasm` alias.
