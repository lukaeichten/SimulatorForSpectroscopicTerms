---
sidebar_position: 6
title: Documentation
description: How this documentation site is built and how to write pages for it.
---

# Documentation (`docs/`)

This site is built with [Docusaurus](https://docusaurus.io) (see
[decision 0005](./decisions/0005-docusaurus-for-documentation.md)).

```text
docs/
├── content/
│   ├── user/              User guide (sidebar "user")
│   └── developer/         Developer guide (sidebar "developer")
│       └── decisions/     Architecture decision records
├── src/
│   ├── components/        React components for MDX pages (AppLink)
│   ├── css/custom.css     Colours shared with the simulator
│   └── pages/index.tsx    Landing page
├── static/                Files copied as they are (favicon)
├── docusaurus.config.ts
└── sidebars.ts
```

## Writing pages

- Each folder under `content/` has its own sidebar, generated from the files. Order pages with
  `sidebar_position` in the front matter.
- `.md` files are plain Markdown. Use `.mdx` only for pages that need components.
- Formulas use LaTeX syntax between `$ … $` (inline) or `$$ … $$` (block) and are rendered with
  KaTeX.
- Diagrams can be written as ` ```mermaid ` code blocks.
- Link to other pages with relative file paths (`./testing.md`); broken links fail the build.
- Link to the simulator with the `AppLink` component in `.mdx` files, which knows where the
  simulator is deployed:

  ```mdx
  import AppLink from "@site/src/components/AppLink";

  <AppLink query="p=2&term=1">p² filtered by ³P</AppLink>
  ```

The user guide is read by students, teachers and assistants. Write it without assuming knowledge
of the code, and keep [How the terms are derived](../user/method.mdx) consistent with the
implementation in the core crate.

## Base path

The documentation is served at `<site path>docs/`. Docusaurus needs this path at build time; it
is read from the environment variable `SITE_BASE_PATH` (default `/`). See
[Deployment](./deployment.md#base-path).

## Dependency security

Most `npm audit` findings come from Docusaurus's build tools, not from code shipped to visitors.
Where a patched release exists that Docusaurus does not require yet, the root `package.json`
forces it through `overrides` (KaTeX, `postcss-selector-parser`, `serialize-javascript`,
`tinypool`, and `uuid` below `sockjs`). Remove an override once Docusaurus depends on a fixed
version itself.

Do not run `npm audit fix --force`: it "fixes" the findings by downgrading Docusaurus and the
math plugins to old major versions that do not work with this configuration. Update with
`npm update` or by raising the versions in `docs/package.json`, then run `npm run build`.

The finding for `braces` has no patched release. It is only used to match file paths of this
repository during the build and in the development server, so it does not process untrusted
input.
