//! The exclusive assignment of microstates to terms.

use std::ops::Range;

use crate::{HalfInteger, MicrostateHistogram, Term};

/// The first rank within a cell that belongs to a term.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct TermStart {
    term: usize,
    start: u64,
}

/// The assignment of microstates to terms: in every cell `(M_L, M_S)`, the ranks
/// `0..count(cell)` are handed out to the terms covering the cell, in term order, `count` ranks
/// per term. See the user guide for why any choice within a cell is valid.
///
/// The rank of a microstate is its zero-based position among the microstates of its cell in the
/// order of the unfiltered enumeration.
#[derive(Debug, Clone)]
pub struct TermAssignment {
    /// The number of microstates per cell; also maps a cell to its position in `starts`.
    histogram: MicrostateHistogram,
    /// For every grid cell, the terms covering it in term order. Because each term takes at
    /// least one rank, the entries are sorted both by term index and by start rank, which
    /// allows binary searches by either.
    starts: Vec<Vec<TermStart>>,
}

impl TermAssignment {
    /// Builds the assignment for the terms derived from `histogram` (in the order of
    /// [`Term::derive_all`]).
    pub(crate) fn new(histogram: &MicrostateHistogram, terms: &[Term]) -> Self {
        let mut starts = vec![Vec::new(); histogram.cell_count()];
        for (ml, ms, count) in histogram.cells() {
            let cell = &mut starts[histogram
                .cell_index(ml, ms)
                .expect("cells() only yields cells of the grid")];
            let mut offset = 0;
            for (term_index, term) in terms.iter().enumerate() {
                if term.admits(ml, ms) {
                    cell.push(TermStart {
                        term: term_index,
                        start: offset,
                    });
                    offset += term.count();
                }
            }
            debug_assert_eq!(
                offset, count,
                "the terms must cover the cell ({ml}, {ms}) exactly"
            );
        }
        Self {
            histogram: histogram.clone(),
            starts,
        }
    }

    /// Returns the ranks within the cell `(ml, ms)` assigned to the term with index `term`
    /// (empty if the cell lies outside the term's box or the term does not exist).
    #[must_use]
    pub fn ranks(&self, term: usize, ml: i32, ms: HalfInteger) -> Range<u64> {
        let Some(starts) = self.cell(ml, ms) else {
            return 0..0;
        };
        match starts.binary_search_by_key(&term, |entry| entry.term) {
            Ok(position) => {
                let end = starts
                    .get(position + 1)
                    .map_or_else(|| self.histogram.count(ml, ms), |next| next.start);
                starts[position].start..end
            }
            Err(_) => 0..0,
        }
    }

    /// Returns the index of the term to which the microstate with the given rank in the cell
    /// `(ml, ms)` is assigned, or `None` if the cell holds fewer microstates.
    #[must_use]
    pub fn term_at(&self, ml: i32, ms: HalfInteger, rank: u64) -> Option<usize> {
        if rank >= self.histogram.count(ml, ms) {
            return None;
        }
        let starts = self.cell(ml, ms)?;
        let following = starts.partition_point(|entry| entry.start <= rank);
        Some(starts[following.checked_sub(1)?].term)
    }

    fn cell(&self, ml: i32, ms: HalfInteger) -> Option<&[TermStart]> {
        let index = self.histogram.cell_index(ml, ms)?;
        Some(&self.starts[index])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{SubshellKind, SubshellState};

    /// The assignment of s¹ p¹, whose terms are ³P (index 0) and ¹P (index 1).
    fn s1_p1() -> (MicrostateHistogram, Vec<Term>, TermAssignment) {
        let histogram =
            MicrostateHistogram::from_states(&SubshellState::enumerate(SubshellKind::S, 1))
                .convolve(&MicrostateHistogram::from_states(
                    &SubshellState::enumerate(SubshellKind::P, 1),
                ));
        let terms = Term::derive_all(&histogram);
        let assignment = TermAssignment::new(&histogram, &terms);
        (histogram, terms, assignment)
    }

    #[test]
    fn every_term_takes_one_rank_per_cell_of_its_box() {
        let (histogram, terms, assignment) = s1_p1();
        assert_eq!(
            terms.iter().map(ToString::to_string).collect::<Vec<_>>(),
            ["3P", "1P"]
        );
        for (term_index, term) in terms.iter().enumerate() {
            for (ml, ms, _) in histogram.cells() {
                let ranks = assignment.ranks(term_index, ml, ms);
                assert_eq!(ranks.end - ranks.start, u64::from(term.admits(ml, ms)));
            }
        }
        let covered_cells = |term| {
            histogram
                .cells()
                .filter(|&(ml, ms, _)| !assignment.ranks(term, ml, ms).is_empty())
                .count()
        };
        assert_eq!(covered_cells(0), 9);
        assert_eq!(covered_cells(1), 3);
    }

    #[test]
    fn ranks_of_a_cell_are_disjoint_and_complete() {
        let (histogram, terms, assignment) = s1_p1();
        for (ml, ms, count) in histogram.cells() {
            let mut ranges: Vec<_> = (0..terms.len())
                .map(|term| assignment.ranks(term, ml, ms))
                .filter(|ranks| !ranks.is_empty())
                .collect();
            ranges.sort_by_key(|ranks| ranks.start);
            let mut next = 0;
            for ranks in ranges {
                assert_eq!(ranks.start, next);
                next = ranks.end;
            }
            assert_eq!(next, count);
        }
    }

    #[test]
    fn term_at_matches_ranks() {
        let (histogram, terms, assignment) = s1_p1();
        for (ml, ms, count) in histogram.cells() {
            for rank in 0..count {
                let term = assignment.term_at(ml, ms, rank).unwrap();
                assert!(assignment.ranks(term, ml, ms).contains(&rank));
            }
            assert_eq!(assignment.term_at(ml, ms, count), None);
        }
        assert_eq!(assignment.term_at(5, HalfInteger::ZERO, 0), None);
        assert_eq!(assignment.ranks(terms.len(), 0, HalfInteger::ZERO), 0..0);
    }

    #[test]
    fn shared_cells_are_handed_out_in_term_order() {
        let (_, _, assignment) = s1_p1();
        assert_eq!(assignment.ranks(0, 0, HalfInteger::ZERO), 0..1);
        assert_eq!(assignment.ranks(1, 0, HalfInteger::ZERO), 1..2);
        assert_eq!(assignment.ranks(1, 1, HalfInteger::from_integer(1)), 0..0);
    }
}
