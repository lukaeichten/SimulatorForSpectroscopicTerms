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
| `assignment`       | `TermAssignment`: which ranks of each $(M_L, M_S)$ cell belong to which term.                       |
| `filter`           | The `MicrostateFilter` trait and its implementations `AcceptAll`, `TermFilter` and `AssignedTermFilter`. |
| `microstate`       | `Microstate`: one state per subshell, its index in the enumeration and its assigned term.           |
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

## Term assignment

`TermAssignment` assigns every microstate to exactly one term (see
[decision 0006](./decisions/0006-assign-microstates-to-terms-by-rank.md) and the
[user guide](../user/method.mdx#which-microstate-belongs-to-which-term)). The **rank** of a
microstate is its zero-based position among the microstates of its cell $(M_L, M_S)$ in the
unfiltered enumeration. In every cell, the terms covering it take consecutive ranks in term order,
`count` ranks each.

For every cell of the histogram grid, the assignment stores a list of `(term index, first rank)`
entries in term order. Because every term takes at least one rank, the list is sorted both by term
index and by first rank, so `ranks(term, ml, ms)` and `term_at(ml, ms, rank)` are binary
searches.

## Listing microstates without storing them

The configurations table needs one page of possibly filtered microstates. The microstates are
the Cartesian product of the subshell states (s outermost, f innermost), so a microstate's index
is a mixed-radix number and `Simulation::microstate(index)` decodes it directly.

Filtering cannot be decoded this way. Instead, `Simulation` keeps the **suffix tables**
$H_k$: the combined table of the subshells $k, k+1, \dots$ (with $H_4$ containing a single
microstate at $(0, 0)$). A partial choice of states for the subshells before $k$, with projections
$(P_L, P_S)$ so far, is a contiguous block of the enumeration. In the cell
$c = (P_L + c_L, P_S + c_S)$ it contains $n = H_k(c_L, c_S)$ microstates, and because the block is
contiguous their ranks are exactly $B(c), \dots, B(c) + n - 1$, where $B(c)$ is the number of
microstates of cell $c$ before the block. The number of selected microstates that complete the
choice is therefore

$$
\sum_{(c_L,\, c_S)} \text{selected}\big(c,\; B(c), \dots, B(c) + H_k(c_L, c_S) - 1\big)
$$

This works because filters only look at the cell and the rank of a microstate (see the
`MicrostateFilter` trait). The walk keeps $B$ as a histogram called `before`: when it skips a
subtree it adds the subtree's shifted suffix table to `before`, and at every leaf it reads the
leaf's rank from `before` and then increments the leaf's cell. This costs no more than the walk
already does, because it iterates the same suffix table cells for every sibling. A depth-first walk over the subshells uses these counts to skip whole
subtrees that lie before the requested page or contain no selected microstate, and only descends
into subtrees that contribute to the page. The cost of a page is therefore proportional to the
page size, not to the number of microstates: the last page of s¹ p³ d⁵ f⁷ is as fast as the first.

`Simulation::microstate(index)` returns the same assigned term as the walk without walking. After
decoding the subshell positions it knows the final cell $c$; the microstates of $c$ that precede
the microstate are those that agree on the first $k$ subshells, choose an earlier state $q$ for
subshell $k$, and complete the cell with any states of the later subshells:

$$
\text{rank} = \sum_{k} \sum_{q \,<\, \text{position}_k} H_{k+1}\big(c - P_k - \text{proj}(q)\big)
$$

where $P_k$ is the sum of the projections of the states chosen for the subshells before $k$.

## Filters

```rust
pub trait MicrostateFilter {
    /// How many of the microstates of the cell (ml, ms) whose rank lies in `ranks` are selected.
    fn count_selected(&self, ml: i32, ms: HalfInteger, ranks: Range<u64>) -> u64;
}
```

| Filter               | Selects                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `AcceptAll`          | Every microstate.                                                                          |
| `TermFilter`         | The microstates inside the box of a selected term ($\lvert M_L\rvert \le L$, $\lvert M_S\rvert \le S$). |
| `AssignedTermFilter` | The microstates assigned to a selected term: the overlap of `ranks` with the terms' ranks. |

Both term filters select everything if no term is given. `AssignedTermFilter` iterates only the
selected terms, so its cost per cell is $O(\text{selected terms} \cdot \log \text{terms})$. New
filters only need to implement this trait (strategy pattern); counting and paging work for them
automatically.
