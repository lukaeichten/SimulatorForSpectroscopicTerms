//! The simulation of a single electron configuration.

use crate::{
    ElectronConfiguration, HalfInteger, Microstate, MicrostateFilter, MicrostateHistogram, Page,
    PageRequest, SubshellKind, SubshellState, Term,
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
        Self {
            configuration,
            states,
            suffix_histograms,
            suffix_sizes,
            terms,
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

    /// Returns the number of microstates selected by `filter`.
    #[must_use]
    pub fn count_matching(&self, filter: &dyn MicrostateFilter) -> u64 {
        self.count_matching_below(filter, 0, 0, HalfInteger::ZERO)
    }

    /// Returns the microstate at `index` of the unfiltered enumeration, if it exists.
    #[must_use]
    pub fn microstate(&self, index: u64) -> Option<Microstate> {
        if index >= self.microstate_count() {
            return None;
        }
        let subshells = self
            .states
            .iter()
            .zip(&self.suffix_sizes[1..])
            .map(|(states, &block)| {
                let position = (index / block) % states.len() as u64;
                Some(states.get(usize::try_from(position).ok()?)?.state)
            })
            .collect::<Option<_>>()?;
        Some(Microstate::new(index, subshells))
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
    fn count_matching_below(
        &self,
        filter: &dyn MicrostateFilter,
        level: usize,
        ml: i32,
        ms: HalfInteger,
    ) -> u64 {
        self.suffix_histograms[level]
            .cells()
            .filter(|&(rest_ml, rest_ms, _)| filter.accepts(ml + rest_ml, ms + rest_ms))
            .map(|(_, _, count)| count)
            .sum()
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
            if self.skip > 0 {
                self.skip -= 1;
            } else {
                self.found.push(Microstate::new(index, self.path.clone()));
            }
            return;
        };

        let block = simulation.suffix_sizes[level + 1];
        for (position, projected) in states.iter().enumerate() {
            if self.is_full() {
                return;
            }
            let (child_ml, child_ms) = (ml + projected.ml, ms + projected.ms);
            let selected =
                simulation.count_matching_below(self.filter, level + 1, child_ml, child_ms);
            if selected <= self.skip {
                // Nothing selected, or the whole subtree lies before the requested window.
                self.skip -= selected;
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
    use crate::{AcceptAll, TermFilter};

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
        let filter = TermFilter::new([simulation.terms()[1]]);
        let selected: Vec<_> = simulation
            .microstates(&AcceptAll, 0, usize::MAX)
            .into_iter()
            .filter(|m| filter.accepts(m.orbital_projection(), m.spin_projection()))
            .collect();
        assert_eq!(simulation.count_matching(&filter), selected.len() as u64);

        let page = simulation.page(&filter, PageRequest::new(1, 50));
        assert_eq!(page.items(), &selected[50..100]);
        assert_eq!(page.page_count(), (selected.len() as u64).div_ceil(50));
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
}
