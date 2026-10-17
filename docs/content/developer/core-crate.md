---
sidebar_position: 3
title: Core crate
description: The simulation logic in simulator-core and the algorithms it uses.
---

# Core crate (`simulator-core`)

`crates/core` contains the complete simulation. It has no dependencies and performs no I/O, so it
can be tested natively and compiled to WebAssembly unchanged.

```rust
use simulator_core::{ElectronConfiguration, Simulation};

let configuration = ElectronConfiguration::new([0, 2, 0, 0])?; // s, p, d, f
let simulation = Simulation::new(configuration);
assert_eq!(simulation.microstate_count(), 15);
let terms: Vec<String> = simulation.terms().iter().map(ToString::to_string).collect();
assert_eq!(terms, ["3P", "1D", "1S"]);
```

## Modules

| Module             | Contents                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `half_integer`     | `HalfInteger`: exact multiples of ½ (spins, $M_S$, $J$), stored as twice their value.               |
| `subshell`         | `SubshellKind` (s, p, d, f), `OrbitalOccupancy` and `SubshellState`, the microstates of one subshell. |
| `configuration`    | `ElectronConfiguration` with validation (`ConfigurationError`).                                     |
| `histogram`        | `MicrostateHistogram`: the microstate table, i.e. counts per $(M_L, M_S)$.                          |
| `term`             | `Term` and the term derivation (`Term::derive_all`).                                                 |
| `filter`           | The `MicrostateFilter` trait and its implementations `AcceptAll` and `TermFilter`.                  |
| `microstate`       | `Microstate`: one state per subshell plus its index in the enumeration.                             |
| `pagination`       | `PageRequest` and `Page`.                                                                            |
| `simulation`       | `Simulation`: the facade that ties everything together.                                             |

## Subshell states

A `SubshellState` stores the occupied spin orbitals of one subshell as a bit pattern with two bits
per orbital. The orbitals run from the most significant bits ($m_l = -l$) to the least significant
bits ($m_l = +l$); within an orbital the higher bit is spin up. `SubshellState::enumerate` returns
all patterns with the requested number of set bits in descending numeric order. This places the
electrons in the lowest $m_l$ and spin up first, which is the order users see in the
configurations table.

## The microstate table

The [microstate table method](../user/method.mdx) needs the number of microstates per
$(M_L, M_S)$. Listing all microstates would be too slow for large configurations (s¹ p³ d⁵ f⁷ has
34 594 560), so the table is built per subshell and the tables are combined.

The microstates of different subshells are independent: every state of one subshell can be
combined with every state of another, and the projections add up. The combined table is
therefore the discrete convolution of the individual tables:

$$
H_{A \cup B}(M_L, M_S) = \sum_{(a_L,\, a_S)} H_A(a_L, a_S)\; H_B(M_L - a_L,\, M_S - a_S)
$$

`MicrostateHistogram::convolve` implements this on a dense grid. The largest subshell table (f⁷)
has 3432 states but only a few hundred non-empty cells, so building the table of any configuration
takes milliseconds.

## Term derivation

`Term::derive_all` implements the procedure from the user guide on the full table: it walks
$M_S$ from the largest value down and, for each, $M_L$ from the largest value down. Whenever a
cell $(L, S)$ still holds $k > 0$ microstates, it records the term $^{2S+1}L$ with count $k$ and
removes $k$ from every cell with $|M_L| \le L$ and $|M_S| \le S$. A debug assertion checks that
the table is empty afterwards.

## Listing microstates without storing them

The configurations table needs one page of possibly filtered microstates. The microstates are
the Cartesian product of the subshell states (s outermost, f innermost), so a microstate's index
is a mixed-radix number and `Simulation::microstate(index)` decodes it directly.

Filtering cannot be decoded this way. Instead, `Simulation` keeps the **suffix tables**
$H_k$: the combined table of the subshells $k, k+1, \dots$ (with $H_4$ containing a single
microstate at $(0, 0)$). For a partial choice of states for the subshells before $k$, with
projections $(P_L, P_S)$ so far, the number of selected microstates that complete it is

$$
\sum_{(c_L,\, c_S)} H_k(c_L, c_S) \cdot [\text{filter accepts } (P_L + c_L,\, P_S + c_S)]
$$

This works because filters only look at the projections of a microstate (see the
`MicrostateFilter` trait). A depth-first walk over the subshells uses these counts to skip whole
subtrees that lie before the requested page or contain no selected microstate, and only descends
into subtrees that contribute to the page. The cost of a page is therefore proportional to the
page size, not to the number of microstates: the last page of s¹ p³ d⁵ f⁷ is as fast as the first.

## Filters

```rust
pub trait MicrostateFilter {
    fn accepts(&self, ml: i32, ms: HalfInteger) -> bool;
}
```

`TermFilter` accepts the microstates inside the box of at least one selected term
($|M_L| \le L$, $|M_S| \le S$); without terms it accepts everything. New filters only need to
implement this trait (strategy pattern); counting and paging work for them automatically.
