---
title: "0006: Assign microstates to terms by their rank within a cell"
sidebar_label: "0006: Assigning microstates to terms"
---

# 0006: Assign microstates to terms by their rank within a cell

**Status:** accepted

## Context

Teachers asked to see *which* microstates make up which term, as in the hand-made tables used in
class, where every microstate is coloured with exactly one term. The existing term filter lists
every microstate inside a term's box ($|M_L| \le L$, $|M_S| \le S$). Boxes of different terms
overlap, so it cannot answer this: for s¹ p¹ it lists 12 microstates for ³P and 6 for ¹P, although
the terms have 9 and 3 states.

Physically, the states of a term are combinations of the microstates of a cell $(M_L, M_S)$, so
any choice of microstates within a cell is equally valid. The choice must still be fixed, so that
the same link shows the same assignment, and it must not slow down paging
([0004](./0004-count-microstates-with-histograms.md)).

## Decision

- The **rank** of a microstate is its zero-based position among the microstates of its cell, in
  the order of the unfiltered enumeration. In every cell, the terms covering it take consecutive
  ranks in the order of the term list (descending $S$, then descending $L$), `count` ranks each
  (`TermAssignment`).
- `MicrostateFilter` counts selected microstates per cell and range of ranks
  (`count_selected(ml, ms, ranks)`) instead of accepting or rejecting a whole cell. The box filter
  (`TermFilter`) stays available; `AssignedTermFilter` selects by assignment.
- The depth-first walk keeps a histogram `before` with the number of already passed microstates
  per cell, which gives the ranks of every subtree. Random access computes the rank from the
  suffix histograms.

## Consequences

- The assignment is deterministic and therefore shareable by link; every term with count $k$ gets
  exactly $k$ microstates in each cell of its box.
- Paging keeps its cost: the walk iterates the same histogram cells as before, and the assigned
  filter only looks at the selected terms.
- The assignment is a representative bookkeeping choice, not the physical states of the terms.
  The user documentation says so explicitly.
- Links with selected terms created before this decision now show the exact assignment;
  `match=box` restores the earlier list.
