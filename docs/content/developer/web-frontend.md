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
    ├── colour.ts               Conversions between hex colours and OKLCH
    ├── dom.ts                  el(), fragment(), byId() helpers
    ├── format.ts               Half-integers, term symbols, numbers, occupation arrows
    ├── layout.ts               Sticky layout support
    ├── term-colours.ts         One distinct colour per term (farthest-point selection)
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
  readonly view: TermView;               // "filter" (default) or "colour"
  readonly match: TermMatch;             // "exact" (default) or "box"; ignored in the colour view
  readonly page: number;                 // one-based
}
```

Besides parsing and formatting, the module offers pure state transitions: `toggleTerm` (resets the
page in the filter view, keeps it in the colour view), `setView` and `setMatch` (both reset the
page) and `restrictTerms`.

The parameters are described in the [user guide](../user/sharing-links.md). Parsing never fails:
invalid values fall back to their defaults and are reported as problems, which `App` shows as
warnings. Formatting omits default values, so links stay short. The subshell parameters are
derived from `subshellKinds()`, so a new subshell in the core crate needs no change here.

## Views

| View                  | Element                         | Callbacks                    |
| --------------------- | ------------------------------- | ---------------------------- |
| `ConfigurationForm`   | Input fields, Simulate, Copy link | `onSimulate`, `onShare`    |
| `PossibilitiesView`   | Possibilities table             |                              |
| `TermsView`           | Terms table with colour swatches, Clear selection | `onToggle`, `onClear` |
| `TermDisplayControls` | Filter/Colour buttons, box switch, Terms footer text | `onViewChange`, `onMatchChange` |
| `ConfigurationsView`  | Configurations table with Term column and row tint, pages | page change |
| `PaginationControls`  | Page buttons (used twice)       | page change                  |
| `NoticesView`         | Warnings and errors             |                              |

Views build their DOM with `el()` from `ui/dom.ts` instead of HTML strings, so no value needs
escaping.

## Styling

`styles.css` defines a small set of design tokens (`--app-primary`, `--app-accent`,
`--app-surface`, …) for light and dark mode and maps Bootstrap's variables onto them. Use the
tokens instead of literal colours. The documentation uses the same palette in
`docs/src/css/custom.css`.

Term colours are generated, not defined as tokens, because a configuration can have up to 133
terms. `ui/term-colours.ts` picks them by greedy farthest-point selection in OKLab
(`ui/colour.ts` converts between hex and OKLCH): each term gets, from a grid of candidates,
the colour farthest from all colours taken before, starting with the theme colours. Hues within
30° of the primary and accent colours of both themes are excluded; a test checks that the
excluded colours match `styles.css`. `applyTermColour` in `ui/format.ts` sets the result as the
CSS variable `--term-colour` on the swatches in the term list and on the tinted rows
(`tr.term-tint`), through the CSSOM so that a Content Security Policy cannot block it. See
[decision 0007](./decisions/0007-generate-term-colours-by-farthest-point-selection.md) for
the alternatives that were compared. The tint is set through Bootstrap's `--bs-table-bg-state`, which takes
precedence over the table stripes; `--term-tint-strength` is higher in dark mode.

The colour scheme follows `prefers-color-scheme` through Bootstrap's `data-bs-theme` attribute,
set by a small inline script in `index.html` before the first paint.

On wide screens the configurations card is `position: sticky` and limited to the viewport height,
so it stays visible next to long term lists. Its offset depends on the height of the sticky
toolbar, which can wrap; `ui/layout.ts` keeps the CSS variable `--sticky-offset` in sync with a
`ResizeObserver`.
