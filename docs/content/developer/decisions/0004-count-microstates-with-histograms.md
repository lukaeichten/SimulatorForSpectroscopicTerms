---
title: "0004: Count microstates with histograms instead of enumerating them"
sidebar_label: "0004: Counting with histograms"
---

# 0004: Count microstates with histograms instead of enumerating them

**Status:** accepted

## Context

The largest supported configuration, s¹ p³ d⁵ f⁷, has 34 594 560 microstates. Storing them, or
even iterating over all of them for every page or filter change, would make the simulator slow
and memory hungry in the browser.

## Decision

The microstate table of each subshell is computed separately and the tables are combined by
convolution. The terms are derived from the combined table. Pages of microstates are produced by a
depth-first walk that uses the tables of the remaining subshells to skip whole groups of
microstates (see [Core crate](../core-crate.md)). Filters are therefore restricted to properties
of $(M_L, M_S)$.

## Consequences

- Simulations and pages are computed in milliseconds, independent of the number of microstates,
  and memory use stays small.
- Filters that need other properties of a microstate (for example the occupation of a specific
  orbital) cannot use the skipping and would need a different approach.
