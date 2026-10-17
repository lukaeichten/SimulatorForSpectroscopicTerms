//! Spectroscopic terms (Russell–Saunders / LS coupling) and their derivation.

use std::fmt;

use crate::{HalfInteger, MicrostateHistogram};

/// Spectroscopic letters for `L = 0, 1, 2, …` (`J` is skipped by convention).
const TERM_LETTERS: [char; 21] = [
    'S', 'P', 'D', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'Q', 'R', 'T', 'U', 'V', 'W', 'X',
    'Y', 'Z',
];

/// A spectroscopic term `^{2S+1}L`, occurring `count` times in a configuration.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Term {
    orbital: u32,
    spin: HalfInteger,
    count: u64,
}

impl Term {
    /// Creates a term with total orbital angular momentum `orbital` (`L`), total spin `spin` (`S`)
    /// that occurs `count` times.
    ///
    /// # Panics
    ///
    /// Panics if `spin` is negative.
    #[must_use]
    pub fn new(orbital: u32, spin: HalfInteger, count: u64) -> Self {
        assert!(
            spin >= HalfInteger::ZERO,
            "the total spin must not be negative"
        );
        Self {
            orbital,
            spin,
            count,
        }
    }

    /// Returns the total orbital angular momentum quantum number `L`.
    #[must_use]
    pub const fn orbital(&self) -> u32 {
        self.orbital
    }

    /// Returns the total spin quantum number `S`.
    #[must_use]
    pub const fn spin(&self) -> HalfInteger {
        self.spin
    }

    /// Returns how often the term occurs in the configuration.
    #[must_use]
    pub const fn count(&self) -> u64 {
        self.count
    }

    /// Returns the spin multiplicity `2S + 1`.
    #[must_use]
    pub const fn multiplicity(&self) -> u32 {
        self.spin.twice().unsigned_abs() + 1
    }

    /// Returns the spectroscopic letter of `L`, or `None` if `L` is larger than 20.
    #[must_use]
    pub fn letter(&self) -> Option<char> {
        TERM_LETTERS.get(self.orbital as usize).copied()
    }

    /// Returns the possible total angular momenta `J` from `|L - S|` to `L + S`, ascending.
    pub fn total_angular_momenta(&self) -> impl Iterator<Item = HalfInteger> {
        let l = HalfInteger::from_integer(self.orbital.cast_signed());
        (l - self.spin).abs().range_inclusive(l + self.spin)
    }

    /// Returns the number of microstates of a single occurrence: `(2L + 1)(2S + 1)`.
    #[must_use]
    pub fn degeneracy(&self) -> u64 {
        u64::from(2 * self.orbital + 1) * u64::from(self.multiplicity())
    }

    /// Returns `true` if a microstate with the projections `(ml, ms)` can belong to this term,
    /// i.e. `|M_L| <= L` and `|M_S| <= S`.
    #[must_use]
    pub fn admits(&self, ml: i32, ms: HalfInteger) -> bool {
        ml.unsigned_abs() <= self.orbital && ms.abs() <= self.spin
    }

    /// Derives all terms of a configuration from the `(M_L, M_S)` histogram of its microstates.
    ///
    /// Repeatedly takes the cell with the largest `M_S` and, among those, the largest `M_L` that
    /// still holds microstates. Each such cell starts a term with `S = M_S` and `L = M_L`, which
    /// accounts for one microstate in every cell with `|M_L| <= L` and `|M_S| <= S`. The terms are
    /// returned in that order: descending `S`, then descending `L`.
    #[must_use]
    pub fn derive_all(histogram: &MicrostateHistogram) -> Vec<Self> {
        let mut remaining = histogram.clone();
        let lowest_spin = HalfInteger::from_twice(histogram.max_ms().twice() % 2);
        let spins: Vec<_> = lowest_spin.range_inclusive(histogram.max_ms()).collect();

        let mut terms = Vec::new();
        for &spin in spins.iter().rev() {
            for orbital in (0..=histogram.max_ml()).rev() {
                let count = remaining.count(orbital, spin);
                if count > 0 {
                    remaining.remove_box(orbital, spin, count);
                    terms.push(Self::new(orbital.unsigned_abs(), spin, count));
                }
            }
        }
        debug_assert_eq!(remaining.total(), 0, "every microstate belongs to a term");
        terms
    }
}

impl fmt::Display for Term {
    /// Formats the term like `2D` (multiplicity followed by the letter), or `2[L=21]` for letters
    /// beyond `Z`.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self.letter() {
            Some(letter) => write!(f, "{}{letter}", self.multiplicity()),
            None => write!(f, "{}[L={}]", self.multiplicity(), self.orbital),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn describes_a_term() {
        let term = Term::new(2, HalfInteger::from_twice(3), 1);
        assert_eq!(term.to_string(), "4D");
        assert_eq!(term.multiplicity(), 4);
        assert_eq!(term.degeneracy(), 20);
        let j: Vec<_> = term
            .total_angular_momenta()
            .map(HalfInteger::twice)
            .collect();
        assert_eq!(j, [1, 3, 5, 7]);
        assert!(term.admits(-2, HalfInteger::from_twice(-3)));
        assert!(!term.admits(3, HalfInteger::ZERO));
    }

    #[test]
    fn letters_skip_j() {
        assert_eq!(Term::new(7, HalfInteger::ZERO, 1).letter(), Some('K'));
        assert_eq!(Term::new(21, HalfInteger::ZERO, 1).to_string(), "1[L=21]");
    }
}
