---
sidebar_position: 5
title: Web frontend
description: Structure of the TypeScript frontend, its state handling and styling.
---

# Web frontend (`web/`)

The frontend is plain TypeScript bundled with [Vite](https://vite.dev) and styled with
[Bootstrap](https://getbootstrap.com). It has no UI framework (see
[decision 0002](./decisions/0002-plain-typescript-frontend.md)).

```text
web/src/
├── main.ts                     Entry point: loads the wasm module, starts the App
├── app.ts                      Controller: URL ⇄ simulator ⇄ views
├── config.ts                   Settings such as the page size
├── styles.css                  Design tokens and component styles
├── simulation/
│   ├── query.ts                Query string encoding (pure functions)
│   └── simulator-service.ts    Facade over the WebAssembly module
└── ui/
    ├── dom.ts                  el(), fragment(), byId() helpers
    ├── format.ts               Half-integers, term symbols, numbers, occupation arrows
    ├── layout.ts               Sticky layout support
    └── views/                  One class per part of the page
```

## Application flow

`App` is the only class that knows all parts. It parses the URL, asks `SimulatorService` for
results and passes them to the views. Views are passive: they render the data they get and
report user actions through callbacks passed to their constructor. Every action creates a new
`SimulationQuery`, which `App` renders and writes to the URL with `history.pushState`. Loading a
URL, and the browser's back and forward buttons, go through the same `render` method.

## Query string

`simulation/query.ts` converts between the URL and `SimulationQuery`:

```ts
interface SimulationQuery {
  readonly electrons: readonly number[]; // per subshell, in the order of subshellKinds()
  readonly terms: readonly number[];     // one-based term numbers, ascending
  readonly page: number;                 // one-based
}
```

The parameters are described in the [user guide](../user/sharing-links.md). Parsing never fails:
invalid values fall back to their defaults and are reported as problems, which `App` shows as
warnings. Formatting omits default values, so links stay short. The subshell parameters are
derived from `subshellKinds()`, so a new subshell in the core crate needs no change here.

## Views

| View                  | Element                         | Callbacks                    |
| --------------------- | ------------------------------- | ---------------------------- |
| `ConfigurationForm`   | Input fields, Simulate, Copy link | `onSimulate`, `onShare`    |
| `PossibilitiesView`   | Possibilities table             |                              |
| `TermsView`           | Terms table, Clear filter       | `onToggle`, `onClear`        |
| `ConfigurationsView`  | Configurations table and pages  | page change                  |
| `PaginationControls`  | Page buttons (used twice)       | page change                  |
| `NoticesView`         | Warnings and errors             |                              |

Views build their DOM with `el()` from `ui/dom.ts` instead of HTML strings, so no value needs
escaping.

## Styling

`styles.css` defines a small set of design tokens (`--app-primary`, `--app-accent`,
`--app-surface`, …) for light and dark mode and maps Bootstrap's variables onto them. Use the
tokens instead of literal colours. The documentation uses the same palette in
`docs/src/css/custom.css`.

The colour scheme follows `prefers-color-scheme` through Bootstrap's `data-bs-theme` attribute,
set by a small inline script in `index.html` before the first paint.

On wide screens the configurations card is `position: sticky` and limited to the viewport height,
so it stays visible next to long term lists. Its offset depends on the height of the sticky
toolbar, which can wrap; `ui/layout.ts` keeps the CSS variable `--sticky-offset` in sync with a
`ResizeObserver`.
