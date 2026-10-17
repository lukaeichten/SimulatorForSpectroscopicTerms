---
sidebar_position: 3
title: Sharing a simulation
description: The link format that encodes a simulation run.
---

# Sharing a simulation

Everything you see in the simulator is stored in the address of the page. Copy the address (or
press **Copy link**) and send it to someone: the link opens the same configuration, the same term
filter and the same page.

## Link format

The part after the `?` holds the parameters, separated by `&`:

| Parameter          | Meaning                                                    | Default |
| ------------------ | ---------------------------------------------------------- | ------- |
| `s`, `p`, `d`, `f` | Number of electrons in the subshell                        | `0`     |
| `term`             | Number of a selected term (`#` column); may be repeated    | none    |
| `page`             | Page of the configuration list                             | `1`     |

Parameters with their default value can be left out. Some examples:

| Link ending         | Opens                                                         |
| ------------------- | ------------------------------------------------------------- |
| `?p=2`              | p²                                                            |
| `?s=0&p=1&d=3`      | p¹ d³ (`s=0` may be left out)                                 |
| `?d=2&term=1`       | d², only the configurations that can belong to ³F             |
| `?d=2&term=1&term=3` | d², configurations that can belong to ³F or ¹G               |
| `?f=7&page=3`       | f⁷, third page of the configurations                          |

## Invalid links

If a link contains a value that cannot be used, for example `p=9`, the simulator ignores it,
shows a warning above the results and corrects the address. The same happens for term numbers
that do not exist and for pages beyond the last one (the last page is shown instead).
