//! The simulation of a single electron configuration.

use crate::{
    ElectronConfiguration, HalfInteger, Microstate, MicrostateFilter, MicrostateHistogram, Page,
    PageRequest, SubshellKind, SubshellState, Term, TermAssignment,
};

/// A subshell state together with its precomputed projections.
#[derive(Debug, Clone, Copy)]
struct ProjectedState {
    state: SubshellState,
    ml: i32,
    ms: HalfInteger,
}

/// All results for one electron configuration: the subshell states, the terms and the microstates.
///
/// The microstates are the Cartesian product of the subshell states (s outermost, f innermost).
/// They are never materialized as a whole; instead, [`Simulation::microstates`] walks the product
/// on demand and skips groups of microstates using histograms of the remaining subshells.
///
/// Every microstate is assigned to exactly one term (see [`TermAssignment`]). The assignment
/// depends on the rank of a microstate within its cell `(M_L, M_S)`, so both the walk and the
/// random access keep track of that rank.
#[derive(Debug, Clone)]
pub struct Simulation {
    configuration: ElectronConfiguration,
    /// The states of each subshell, in the order of [`SubshellKind::ALL`].
    states: Vec<Vec<ProjectedState>>,
    /// `suffix_histograms[k]` combines the subshells `k..`; the last entry is the identity.
    suffix_histograms: Vec<MicrostateHistogram>,
    /// `suffix_sizes[k]` is the number of microstates of the subshells `k..`.
    suffix_sizes: Vec<u64>,
    terms: Vec<Term>,
    assignment: TermAssignment,
}

impl Simulation {
    /// Simulates the given electron configuration.
    #[must_use]
    pub fn new(configuration: ElectronConfiguration) -> Self {
        let states: Vec<Vec<ProjectedState>> = configuration
            .subshells()
            .map(|(kind, electrons)| {
                SubshellState::enumerate(kind, electrons)
                    .into_iter()
                    .map(|state| ProjectedState {
                        state,
                        ml: state.orbital_projection(),
                        ms: state.spin_projection(),
                    })
                    .collect()
            })
            .collect();

        let mut histogram = MicrostateHistogram::identity();
        let mut size = 1u64;
        let mut suffix_histograms = vec![histogram.clone()];
        let mut suffix_sizes = vec![size];
        for subshell in states.iter().rev() {
            let plain: Vec<_> = subshell.iter().map(|s| s.state).collect();
            histogram = MicrostateHistogram::from_states(&plain).convolve(&histogram);
            size *= subshell.len() as u64;
            suffix_histograms.push(histogram.clone());
            suffix_sizes.push(size);
        }
        suffix_histograms.reverse();
        suffix_sizes.reverse();

        let terms = Term::derive_all(&suffix_histograms[0]);
        let assignment = TermAssignment::new(&suffix_histograms[0], &terms);
        Self {
            configuration,
            states,
            suffix_histograms,
            suffix_sizes,
            terms,
            assignment,
        }
    }

    /// Returns the simulated configuration.
    #[must_use]
    pub const fn configuration(&self) -> &ElectronConfiguration {
        &self.configuration
    }

    /// Returns the number of states of the subshell `kind`, i.e. `C(capacity, electrons)`.
    #[must_use]
    pub fn subshell_state_count(&self, kind: SubshellKind) -> u64 {
        self.states[kind.index()].len() as u64
    }

    /// Returns the total number of microstates of the configuration.
    #[must_use]
    pub fn microstate_count(&self) -> u64 {
        self.suffix_sizes[0]
    }

    /// Returns the number of microstates per `(M_L, M_S)`.
    #[must_use]
    pub fn histogram(&self) -> &MicrostateHistogram {
        &self.suffix_histograms[0]
    }

    /// Returns the terms of the configuration, ordered by descending `S`, then descending `L`.
    #[must_use]
    pub fn terms(&self) -> &[Term] {
        &self.terms
    }

    /// Returns the assignment of the microstates to [`Simulation::terms`].
    #[must_use]
    pub const fn assignment(&self) -> &TermAssignment {
        &self.assignment
    }

    /// Returns the number of microstates selected by `filter`.
    #[must_use]
    pub fn count_matching(&self, filter: &dyn MicrostateFilter) -> u64 {
        self.histogram()
            .cells()
            .map(|(ml, ms, count)| filter.count_selected(ml, ms, 0..count))
            .sum()
    }

    /// Returns the microstate at `index` of the unfiltered enumeration, if it exists.
    ///
    /// # Panics
    ///
    /// Panics only if the term assignment does not cover every microstate, which would be a bug.
    #[must_use]
    pub fn microstate(&self, index: u64) -> Option<Microstate> {
        if index >= self.microstate_count() {
            return None;
        }
        let positions = self
            .states
            .iter()
            .zip(&self.suffix_sizes[1..])
            .map(|(states, &block)| usize::try_from((index / block) % states.len() as u64).ok())
            .collect::<Option<Vec<_>>>()?;
        let chosen: Vec<_> = self
            .states
            .iter()
            .zip(&positions)
            .map(|(states, &position)| states[position])
            .collect();

        let ml = chosen.iter().map(|state| state.ml).sum();
        let ms = chosen
            .iter()
            .fold(HalfInteger::ZERO, |sum, state| sum + state.ms);
        let rank = self.rank_in_cell(&positions, ml, ms);
        let term = self
            .assignment
            .term_at(ml, ms, rank)
            .expect("every microstate is assigned to a term");
        let subshells = chosen.iter().map(|state| state.state).collect();
        Some(Microstate::new(index, subshells, term))
    }

    /// Returns at most `limit` microstates selected by `filter`, skipping the first `offset`
    /// selected ones. The microstates keep the order of the unfiltered enumeration.
    #[must_use]
    pub fn microstates(
        &self,
        filter: &dyn MicrostateFilter,
        offset: u64,
        limit: usize,
    ) -> Vec<Microstate> {
        let mut walker = Walker {
            simulation: self,
            filter,
            skip: offset,
            limit,
            path: Vec::with_capacity(self.states.len()),
            before: self.histogram().zeroed_like(),
            found: Vec::with_capacity(limit.min(4096)),
        };
        walker.visit(0, 0, HalfInteger::ZERO, 0);
        walker.found
    }

    /// Returns one page of the microstates selected by `filter`.
    ///
    /// A request beyond the last page returns the last page instead.
    #[must_use]
    pub fn page(&self, filter: &dyn MicrostateFilter, request: PageRequest) -> Page<Microstate> {
        let total = self.count_matching(filter);
        let request = request.clamped(total);
        let items = self.microstates(filter, request.offset(), request.size());
        Page::new(items, request, total)
    }

    /// Counts the selected microstates whose first `level` subshells have the projections
    /// `(ml, ms)` in total, using the histogram of the remaining subshells.
    ///
    /// `before` holds, per cell, the number of microstates that precede this group in the
    /// enumeration. Because the group is a contiguous block of the enumeration, its microstates
    /// in a cell `c` have exactly the ranks `before(c)..before(c) + n`.
    fn count_matching_below(
        &self,
        filter: &dyn MicrostateFilter,
        level: usize,
        ml: i32,
        ms: HalfInteger,
        before: &MicrostateHistogram,
    ) -> u64 {
        self.suffix_histograms[level]
            .cells()
            .map(|(rest_ml, rest_ms, count)| {
                let (cell_ml, cell_ms) = (ml + rest_ml, ms + rest_ms);
                let start = before.count(cell_ml, cell_ms);
                filter.count_selected(cell_ml, cell_ms, start..start + count)
            })
            .sum()
    }

    /// Returns the rank of the microstate with the given subshell `positions` within its cell
    /// `(ml, ms)`.
    ///
    /// The microstates of the cell that precede it are exactly those that agree on the first
    /// `level` subshells, choose an earlier state `q` at `level`, and complete the cell with any
    /// remaining subshells. Counting them per level from the suffix histograms avoids the walk.
    fn rank_in_cell(&self, positions: &[usize], ml: i32, ms: HalfInteger) -> u64 {
        let (mut prefix_ml, mut prefix_ms) = (0, HalfInteger::ZERO);
        let mut rank = 0;
        for (level, (states, &position)) in self.states.iter().zip(positions).enumerate() {
            let rest = &self.suffix_histograms[level + 1];
            rank += states[..position]
                .iter()
                .map(|earlier| rest.count(ml - prefix_ml - earlier.ml, ms - prefix_ms - earlier.ms))
                .sum::<u64>();
            prefix_ml += states[position].ml;
            prefix_ms = prefix_ms + states[position].ms;
        }
        rank
    }
}

/// Depth-first walk over the microstates that collects one window of the selected ones.
struct Walker<'a> {
    simulation: &'a Simulation,
    filter: &'a dyn MicrostateFilter,
    /// Selected microstates that still have to be skipped.
    skip: u64,
    limit: usize,
    /// The subshell states chosen on the way down.
    path: Vec<SubshellState>,
    /// Per cell, the number of microstates that precede the current position of the walk, i.e.
    /// the rank the next microstate of that cell will have.
    before: MicrostateHistogram,
    found: Vec<Microstate>,
}

impl Walker<'_> {
    fn is_full(&self) -> bool {
        self.found.len() >= self.limit
    }

    fn visit(&mut self, level: usize, ml: i32, ms: HalfInteger, index: u64) {
        let simulation = self.simulation;
        let Some(states) = simulation.states.get(level) else {
            // Leaf: only reached for selected microstates.
            let rank = self.before.count(ml, ms);
            if self.skip > 0 {
                self.skip -= 1;
            } else {
                let term = simulation
                    .assignment
                    .term_at(ml, ms, rank)
                    .expect("every microstate is assigned to a term");
                self.found
                    .push(Microstate::new(index, self.path.clone(), term));
            }
            self.before.increment(ml, ms);
            return;
        };

        let block = simulation.suffix_sizes[level + 1];
        for (position, projected) in states.iter().enumerate() {
            if self.is_full() {
                return;
            }
            let (child_ml, child_ms) = (ml + projected.ml, ms + projected.ms);
            let selected = simulation.count_matching_below(
                self.filter,
                level + 1,
                child_ml,
                child_ms,
                &self.before,
            );
            if selected <= self.skip {
                // Nothing selected, or the whole subtree lies before the requested window. Its
                // microstates still precede the following ones, so they count towards the ranks.
                self.skip -= selected;
                self.before.add_shifted(
                    &simulation.suffix_histograms[level + 1],
                    child_ml,
                    child_ms,
                );
                continue;
            }
            self.path.push(projected.state);
            self.visit(
                level + 1,
                child_ml,
                child_ms,
                index + position as u64 * block,
            );
            self.path.pop();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{AcceptAll, AssignedTermFilter, TermFilter};

    fn simulate(electrons: [usize; 4]) -> Simulation {
        Simulation::new(ElectronConfiguration::new(electrons).unwrap())
    }

    #[test]
    fn counts_microstates() {
        let simulation = simulate([1, 2, 1, 0]);
        assert_eq!(simulation.subshell_state_count(SubshellKind::P), 15);
        assert_eq!(simulation.microstate_count(), 2 * 15 * 10);
        assert_eq!(simulation.count_matching(&AcceptAll), 300);
        assert_eq!(simulation.histogram().total(), 300);
    }

    #[test]
    fn walking_matches_random_access() {
        let simulation = simulate([1, 2, 1, 0]);
        let all = simulation.microstates(&AcceptAll, 0, usize::MAX);
        assert_eq!(all.len(), 300);
        for (index, microstate) in all.iter().enumerate() {
            assert_eq!(
                Some(microstate),
                simulation.microstate(index as u64).as_ref()
            );
        }
        let window = simulation.microstates(&AcceptAll, 123, 7);
        assert_eq!(window, all[123..130]);
    }

    #[test]
    fn filtered_windows_are_consistent() {
        let simulation = simulate([0, 2, 2, 0]);
        let term = simulation.terms()[1];
        let filter = TermFilter::new([term]);
        let selected: Vec<_> = simulation
            .microstates(&AcceptAll, 0, usize::MAX)
            .into_iter()
            .filter(|m| term.admits(m.orbital_projection(), m.spin_projection()))
            .collect();
        assert_eq!(simulation.count_matching(&filter), selected.len() as u64);

        let page = simulation.page(&filter, PageRequest::new(1, 50));
        assert_eq!(page.items(), &selected[50..100]);
        assert_eq!(page.page_count(), (selected.len() as u64).div_ceil(50));
    }

    #[test]
    fn assigned_windows_are_consistent() {
        let simulation = simulate([0, 2, 2, 0]);
        let chosen = [0, 2];
        let filter = AssignedTermFilter::new(simulation.assignment(), chosen);
        let selected: Vec<_> = simulation
            .microstates(&AcceptAll, 0, usize::MAX)
            .into_iter()
            .filter(|m| chosen.contains(&m.term()))
            .collect();
        let expected: u64 = chosen
            .iter()
            .map(|&index| {
                let term = simulation.terms()[index];
                term.count() * term.degeneracy()
            })
            .sum();
        assert_eq!(selected.len() as u64, expected);
        assert_eq!(simulation.count_matching(&filter), expected);

        for request in [PageRequest::new(0, 50), PageRequest::new(3, 50)] {
            let page = simulation.page(&filter, request);
            let start = usize::try_from(page.offset()).unwrap();
            assert_eq!(page.items(), &selected[start..start + page.items().len()]);
        }
        assert_eq!(
            simulation.microstates(&filter, 0, usize::MAX),
            selected,
            "a single window must cover every selected microstate"
        );
    }

    #[test]
    fn pages_beyond_the_end_are_clamped() {
        let simulation = simulate([0, 2, 0, 0]);
        let page = simulation.page(&AcceptAll, PageRequest::new(10, 10));
        assert_eq!(page.index(), 1);
        assert_eq!(page.items().len(), 5);
    }

    #[test]
    fn largest_configuration_is_not_enumerated() {
        // 34 594 560 microstates: must stay fast because nothing is materialized.
        let simulation = simulate([1, 3, 5, 7]);
        assert_eq!(simulation.microstate_count(), 2 * 20 * 252 * 3432);
        let total: u64 = simulation
            .terms()
            .iter()
            .map(|t| t.count() * t.degeneracy())
            .sum();
        assert_eq!(total, simulation.microstate_count());
        let last = simulation.page(&AcceptAll, PageRequest::new(u64::MAX / 2000, 1000));
        assert_eq!(
            last.items().last().unwrap().index(),
            simulation.microstate_count() - 1
        );
    }

    #[test]
    fn largest_configuration_is_filtered_by_assignment_without_enumeration() {
        let simulation = simulate([1, 3, 5, 7]);
        let middle = simulation.terms().len() / 2;
        let term = simulation.terms()[middle];
        let filter = AssignedTermFilter::new(simulation.assignment(), [middle]);
        assert_eq!(
            simulation.count_matching(&filter),
            term.count() * term.degeneracy()
        );

        let last = simulation.page(&filter, PageRequest::new(u64::MAX / 2000, 1000));
        assert!(last.items().iter().all(|m| m.term() == middle));
        let final_item = last.items().last().unwrap();
        assert_eq!(
            simulation.microstate(final_item.index()).as_ref(),
            Some(final_item)
        );
    }
}
