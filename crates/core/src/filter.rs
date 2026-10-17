//! Filters that select microstates by their projections `(M_L, M_S)`.

use crate::{HalfInteger, Term};

/// Decides which microstates are listed.
///
/// Filters only look at the projections `(M_L, M_S)` of a microstate. This allows the simulator to
/// count matching microstates from histograms and to skip whole groups of microstates while
/// paging, instead of testing every microstate individually.
pub trait MicrostateFilter {
    /// Returns `true` if microstates with the projections `(ml, ms)` are selected.
    fn accepts(&self, ml: i32, ms: HalfInteger) -> bool;
}

/// Selects every microstate.
#[derive(Debug, Clone, Copy, Default)]
pub struct AcceptAll;

impl MicrostateFilter for AcceptAll {
    fn accepts(&self, _ml: i32, _ms: HalfInteger) -> bool {
        true
    }
}

/// Selects the microstates that may belong to at least one of the given terms.
///
/// A microstate may belong to a term `^{2S+1}L` if `|M_L| <= L` and `|M_S| <= S`. An empty filter
/// selects every microstate.
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
}

impl MicrostateFilter for TermFilter {
    fn accepts(&self, ml: i32, ms: HalfInteger) -> bool {
        self.terms.is_empty() || self.terms.iter().any(|term| term.admits(ml, ms))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn term_filter_accepts_union_of_boxes() {
        let filter = TermFilter::new([
            Term::new(2, HalfInteger::ZERO, 1),
            Term::new(0, HalfInteger::from_integer(1), 1),
        ]);
        assert!(filter.accepts(-2, HalfInteger::ZERO));
        assert!(filter.accepts(0, HalfInteger::from_integer(-1)));
        assert!(!filter.accepts(1, HalfInteger::from_integer(1)));
        assert!(TermFilter::default().accepts(5, HalfInteger::from_integer(3)));
    }
}
