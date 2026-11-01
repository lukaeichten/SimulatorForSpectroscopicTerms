---
sidebar_position: 3
title: Sharing a simulation
description: The link format that encodes a simulation run.
---

# Sharing a simulation

Everything you see in the simulator is stored in the address of the page. Copy the address (or
press **Copy link**) and send it to someone: the link opens the same configuration, the same term
selection, the same view and the same page.

## Link format

The part after the `?` holds the parameters, separated by `&`:

| Parameter          | Meaning                                                                  | Default  |
| ------------------ | ------------------------------------------------------------------------ | -------- |
| `s`, `p`, `d`, `f` | Number of electrons in the subshell                                      | `0`      |
| `term`             | Number of a selected term (`#` column); may be repeated                  | none     |
| `view`             | `filter`: list only the selected terms; `colour`: colour rows by term    | `filter` |
| `match`            | `exact`: assigned microstates; `box`: every microstate that can belong   | `exact`  |
| `page`             | Page of the configuration list                                           | `1`      |

`match` only has an effect in the filter view.

Parameters with their default value can be left out. Some examples:

| Link ending                  | Opens                                                    |
| ---------------------------- | -------------------------------------------------------- |
| `?p=2`                       | p²                                                       |
| `?s=0&p=1&d=3`               | p¹ d³ (`s=0` may be left out)                            |
| `?s=1&p=1&term=1`            | s¹ p¹, only the 9 configurations assigned to ³P          |
| `?s=1&p=1&term=1&match=box`  | s¹ p¹, all 12 configurations that can belong to ³P       |
| `?s=1&p=1&view=colour`       | s¹ p¹, every configuration coloured by its term          |
| `?d=2&term=1&term=3`         | d², configurations assigned to ³F or ¹G                  |
| `?f=7&page=3`                | f⁷, third page of the configurations                     |

Links that select terms but were created before the colour view existed (such as `?d=2&term=1`)
now list the configurations assigned to the terms. Add `&match=box` to get the earlier list of
every configuration that can belong to them.

## Invalid links

If a link contains a value that cannot be used, for example `p=9`, the simulator ignores it,
shows a warning above the results and corrects the address. The same happens for term numbers
that do not exist, for unknown `view` and `match` values, and for pages beyond the last one (the
last page is shown instead).
