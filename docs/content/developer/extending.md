---
sidebar_position: 9
title: Extending
description: Where to start for common extensions.
---

# Extending the simulator

## A new subshell (for example g)

1. Add a variant to `SubshellKind` in `crates/core/src/subshell.rs` and extend `ALL` and the
   `match` arms.
2. Update the arrays of electron counts in the tests.

The frontend builds its input fields, table columns and query parameters from `subshellKinds()`,
so it needs no change. `SubshellState::enumerate` scans all $2^\text{capacity}$ bit patterns; this
is cheap for g ($2^{18}$), but much larger subshells would need a combination generator.

## A new filter

Implement `MicrostateFilter` in the core crate, add a way to construct it to
`crates/wasm/src/lib.rs` and a matching query parameter in `web/src/simulation/query.ts`. Counting
and paging work for every filter that only depends on $(M_L, M_S)$.

## A new view

Add a class under `web/src/ui/views/`, give it a container in `web/index.html`, create it in the
`App` constructor and render it in `App.render`.

## A new query parameter

Extend `SimulationQuery`, `parseQuery` and `formatQuery` in `web/src/simulation/query.ts` together
with their tests, and document it in the [user guide](../user/sharing-links.md).

## A new decision

Record decisions that shape the architecture as a new file in
[`decisions/`](./decisions/0001-rust-core-compiled-to-webassembly.md), numbered consecutively.
