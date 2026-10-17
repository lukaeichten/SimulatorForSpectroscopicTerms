---
title: "0003: The URL is the single source of truth"
sidebar_label: "0003: URL as state"
---

# 0003: The URL is the single source of truth

**Status:** accepted

## Context

Users want to share a simulation with colleagues, for example a configuration with a term filter
and a specific page. The browser's back and forward buttons should step through previous
simulations.

## Decision

The whole application state (electron counts, selected terms, page) is encoded in the query
string. Every user action creates a new state, which is written to the URL with
`history.pushState` and then rendered. Loading a page and navigating through the history render
the state from the URL in the same way.

## Consequences

- Every state can be shared by copying the address; no server is needed to store it.
- There is a single rendering path, so shared links, history navigation and user actions cannot
  diverge.
- Invalid or outdated links (for example a term number that does not exist) must be handled
  gracefully: the parser corrects them and the application shows a warning.
- Term numbers in links refer to the position in the term list. If the order of the terms ever
  changes, old links would select different terms.
