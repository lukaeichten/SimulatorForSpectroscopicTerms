---
title: "0005: Docusaurus documentation served under /docs"
sidebar_label: "0005: Docusaurus documentation"
---

# 0005: Docusaurus documentation served under /docs

**Status:** accepted

## Context

The documentation has two audiences: students, teachers and assistants who use the simulator
(including the scientific method, which is exam material) and developers who maintain it. A
single README was becoming too long for both. The method needs mathematical formulas.

## Decision

The documentation is a Docusaurus site in `docs/` with one sidebar per audience, KaTeX for
formulas and Mermaid for diagrams. It is built together with the simulator into one static site
and served under `docs/`. The repository uses npm workspaces (`web`, `docs`) so that one
`npm ci` and one `npm run build` cover both.

## Consequences

- Users find the documentation next to the simulator, also on self-hosted instances, and it
  matches the deployed version.
- Docusaurus is widely used, supports versioning and search plugins, and pages are plain
  Markdown.
- The documentation adds React and Docusaurus as build-time dependencies; the simulator itself
  does not load them.
- Docusaurus needs the deployment path at build time (`SITE_BASE_PATH`).
