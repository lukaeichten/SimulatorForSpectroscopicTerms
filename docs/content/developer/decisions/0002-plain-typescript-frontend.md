---
title: "0002: Plain TypeScript frontend with Vite and Bootstrap"
sidebar_label: "0002: Plain TypeScript frontend"
---

# 0002: Plain TypeScript frontend with Vite and Bootstrap

**Status:** accepted

## Context

The user interface consists of one form and three tables. It must be easy to understand for
contributors with different backgrounds and should not need regular framework migrations.

## Decision

The frontend uses TypeScript without a UI framework, bundled with Vite and styled with Bootstrap.
The code is split into a controller (`App`), passive view classes, a facade over the wasm module
and pure modules for the query string and formatting.

## Consequences

- Few dependencies and a small bundle; the code only uses standard DOM APIs.
- The structure (controller, views with callbacks, service facade) gives the separation a
  framework would provide, without its learning curve.
- Views re-render their whole content. This is fast enough for pages of 1000 rows; a much larger
  or more interactive interface might justify a framework later.
