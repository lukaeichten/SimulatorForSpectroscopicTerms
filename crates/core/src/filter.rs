//! Filters that select microstates by their cell `(M_L, M_S)` and their rank within it.

use std::ops::Range;

use crate::{HalfInteger, Term, TermAssignment};

/// Decides which microstates are listed.
///
/// The microstates with the same projections `(M_L, M_S)` form a cell. Within a cell, every
/// microstate has a rank: its zero-based position among the microstates of the cell in the order
/// of the unfiltered enumeration. A filter may only depend on the cell and the rank. This allows
/// the simulator to count selected microstates from histograms and to skip whole groups of
/// microstates while paging.
pub trait MicrostateFilter {
    /// Returns how many of the microstates of the cell `(ml, ms)` whose rank lies in `ranks` are
    /// selected.
    fn count_selected(&self, ml: i32, ms: HalfInteger, ranks: Range<u64>) -> u64;
}

/// Selects every microstate.
#[derive(Debug, Clone, Copy, Default)]
pub struct AcceptAll;

impl MicrostateFilter for AcceptAll {
    fn count_selected(&self, _ml: i32, _ms: HalfInteger, ranks: Range<u64>) -> u64 {
        range_length(&ranks)
    }
}

/// Selects the microstates inside the box of at least one of the given terms, i.e. every
/// microstate that can belong to one of them.
///
/// A microstate lies inside the box of a term `^{2S+1}L` if `|M_L| <= L` and `|M_S| <= S`. Boxes
/// of different terms overlap, so a microstate can be selected for several terms; use
/// [`AssignedTermFilter`] for an exclusive selection. An empty filter selects every microstate.
#[derive(Debug, Clone, Default)]
pub struct TermFilter {
    terms: Vec<Term>,
}

impl TermFilter {
    /// Creates a filter for the given terms.
    #[must_use]
    pub fn new(terms: impl IntoIterator<Item = Term>) -> Self {
        Self {
            terms: terms.into_iter().collect(),
        }
    }

    fn accepts(&self, ml: i32, ms: HalfInteger) -> bool {
        self.terms.is_empty() || self.terms.iter().any(|term| term.admits(ml, ms))
    }
}

impl MicrostateFilter for TermFilter {
    fn count_selected(&self, ml: i32, ms: HalfInteger, ranks: Range<u64>) -> u64 {
        if self.accepts(ml, ms) {
            range_length(&ranks)
        } else {
            0
        }
    }
}

/// Selects the microstates assigned to at least one of the given terms (see [`TermAssignment`]).
/// An empty filter selects every microstate.
#[derive(Debug, Clone)]
pub struct AssignedTermFilter<'a> {
    assignment: &'a TermAssignment,
    /// Zero-based term indices, ascending and unique.
    terms: Vec<usize>,
}

impl<'a> AssignedTermFilter<'a> {
    /// Creates a filter for the terms with the given zero-based indices into
    /// [`crate::Simulation::terms`]. Indices without a term select nothing.
    #[must_use]
    pub fn new(assignment: &'a TermAssignment, terms: impl IntoIterator<Item = usize>) -> Self {
        let mut terms: Vec<_> = terms.into_iter().collect();
        terms.sort_unstable();
        // A duplicate would count the microstates of its term twice.
        terms.dedup();
        Self { assignment, terms }
    }
}

impl MicrostateFilter for AssignedTermFilter<'_> {
    fn count_selected(&self, ml: i32, ms: HalfInteger, ranks: Range<u64>) -> u64 {
        if self.terms.is_empty() {
            return range_length(&ranks);
        }
        // Iterating the selected terms (instead of all terms of the cell) keeps this cheap in the
        // paging hot loop; the ranges of different terms are disjoint, so the overlaps add up.
        self.terms
            .iter()
            .map(|&term| {
                let assigned = self.assignment.ranks(term, ml, ms);
                range_length(&(assigned.start.max(ranks.start)..assigned.end.min(ranks.end)))
            })
            .sum()
    }
}

/// Returns the number of ranks in `ranks`, treating reversed ranges as empty.
fn range_length(ranks: &Range<u64>) -> u64 {
    ranks.end.saturating_sub(ranks.start)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{ElectronConfiguration, Simulation};

    #[test]
    fn term_filter_selects_union_of_boxes() {
        let filter = TermFilter::new([
            Term::new(2, HalfInteger::ZERO, 1),
            Term::new(0, HalfInteger::from_integer(1), 1),
        ]);
        assert_eq!(filter.count_selected(-2, HalfInteger::ZERO, 0..3), 3);
        assert_eq!(
            filter.count_selected(0, HalfInteger::from_integer(-1), 1..3),
            2
        );
        assert_eq!(
            filter.count_selected(1, HalfInteger::from_integer(1), 0..3),
            0
        );
        assert_eq!(
            TermFilter::default().count_selected(5, HalfInteger::from_integer(3), 0..4),
            4
        );
    }

    #[test]
    fn assigned_term_filter_counts_overlapping_ranks() {
        // s¹ p¹: in the cell (0, 0), rank 0 belongs to ³P (index 0) and rank 1 to ¹P (index 1).
        let simulation = Simulation::new(ElectronConfiguration::new([1, 1, 0, 0]).unwrap());
        let assignment = simulation.assignment();
        let zero = HalfInteger::ZERO;

        let triplet = AssignedTermFilter::new(assignment, [0]);
        assert_eq!(triplet.count_selected(0, zero, 0..2), 1);
        assert_eq!(triplet.count_selected(0, zero, 1..2), 0);
        assert_eq!(
            triplet.count_selected(1, HalfInteger::from_integer(1), 0..1),
            1
        );

        let singlet = AssignedTermFilter::new(assignment, [1, 1]);
        assert_eq!(singlet.count_selected(0, zero, 0..2), 1);
        assert_eq!(singlet.count_selected(0, zero, 0..1), 0);
        assert_eq!(
            singlet.count_selected(1, HalfInteger::from_integer(1), 0..1),
            0
        );

        let both = AssignedTermFilter::new(assignment, [1, 0]);
        assert_eq!(both.count_selected(0, zero, 0..2), 2);

        let everything = AssignedTermFilter::new(assignment, []);
        assert_eq!(everything.count_selected(0, zero, 0..2), 2);

        let missing = AssignedTermFilter::new(assignment, [7]);
        assert_eq!(missing.count_selected(0, zero, 0..2), 0);
    }
}
