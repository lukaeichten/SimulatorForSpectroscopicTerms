//! Counting microstates per `(M_L, M_S)` pair.

use crate::{HalfInteger, SubshellState};

/// The number of microstates for every pair of projections `(M_L, M_S)`.
///
/// The histogram is a dense grid spanning `-max_ml..=max_ml` and `-max_ms..=max_ms`. Histograms of
/// independent subshells are combined with [`MicrostateHistogram::convolve`], which allows counting
/// the microstates of a whole configuration without enumerating them.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MicrostateHistogram {
    /// Largest `|M_L|` that fits into the grid.
    max_ml: i32,
    /// Twice the largest `|M_S|` that fits into the grid.
    max_ms_twice: i32,
    /// Row-major counts; rows are `M_L`, columns are `M_S` in steps of ½.
    counts: Vec<u64>,
}

impl MicrostateHistogram {
    /// Returns the histogram of a configuration without electrons: a single microstate at `(0, 0)`.
    #[must_use]
    pub fn identity() -> Self {
        Self {
            max_ml: 0,
            max_ms_twice: 0,
            counts: vec![1],
        }
    }

    /// Builds the histogram of the given subshell states.
    #[must_use]
    pub fn from_states(states: &[SubshellState]) -> Self {
        let max_ml = states
            .iter()
            .map(|s| s.orbital_projection().abs())
            .max()
            .unwrap_or(0);
        let max_ms_twice = states
            .iter()
            .map(|s| s.spin_projection().twice().abs())
            .max()
            .unwrap_or(0);
        let mut histogram = Self::zeroed(max_ml, max_ms_twice);
        for state in states {
            *histogram.count_mut(state.orbital_projection(), state.spin_projection().twice()) += 1;
        }
        histogram
    }

    /// Combines the histograms of two independent sets of electrons.
    ///
    /// Every pair of microstates of `self` and `other` forms a microstate of the combined system
    /// whose projections are the sums of the individual projections.
    #[must_use]
    pub fn convolve(&self, other: &Self) -> Self {
        let mut result = Self::zeroed(
            self.max_ml + other.max_ml,
            self.max_ms_twice + other.max_ms_twice,
        );
        for (ml_a, ms_a, count_a) in self.cells() {
            for (ml_b, ms_b, count_b) in other.cells() {
                *result.count_mut(ml_a + ml_b, (ms_a + ms_b).twice()) += count_a * count_b;
            }
        }
        result
    }

    /// Returns the number of microstates with the projections `(ml, ms)`.
    #[must_use]
    pub fn count(&self, ml: i32, ms: HalfInteger) -> u64 {
        self.index(ml, ms.twice())
            .map_or(0, |index| self.counts[index])
    }

    /// Returns the total number of microstates.
    #[must_use]
    pub fn total(&self) -> u64 {
        self.counts.iter().sum()
    }

    /// Returns the largest `|M_L|` that fits into the grid.
    #[must_use]
    pub const fn max_ml(&self) -> i32 {
        self.max_ml
    }

    /// Returns the largest `|M_S|` that fits into the grid.
    #[must_use]
    pub const fn max_ms(&self) -> HalfInteger {
        HalfInteger::from_twice(self.max_ms_twice)
    }

    /// Iterates over all non-empty cells as `(M_L, M_S, count)`.
    pub fn cells(&self) -> impl Iterator<Item = (i32, HalfInteger, u64)> + '_ {
        let max_ms_twice = self.max_ms_twice;
        (-self.max_ml..=self.max_ml)
            .flat_map(move |ml| (-max_ms_twice..=max_ms_twice).map(move |ms_twice| (ml, ms_twice)))
            .zip(&self.counts)
            .filter(|&(_, &count)| count > 0)
            .map(|((ml, ms_twice), &count)| (ml, HalfInteger::from_twice(ms_twice), count))
    }

    /// Removes `count` microstates from every cell with `|M_L| <= l` and `|M_S| <= s`.
    ///
    /// # Panics
    ///
    /// Panics if one of the cells holds fewer than `count` microstates.
    pub(crate) fn remove_box(&mut self, l: i32, s: HalfInteger, count: u64) {
        for ml in -l..=l {
            for ms in (-s).range_inclusive(s) {
                let cell = self.count_mut(ml, ms.twice());
                *cell = cell
                    .checked_sub(count)
                    .expect("a term box must only cover populated cells");
            }
        }
    }

    fn zeroed(max_ml: i32, max_ms_twice: i32) -> Self {
        let rows = usize::try_from(2 * max_ml + 1).expect("max_ml is not negative");
        let columns = usize::try_from(2 * max_ms_twice + 1).expect("max_ms is not negative");
        Self {
            max_ml,
            max_ms_twice,
            counts: vec![0; rows * columns],
        }
    }

    fn width(&self) -> usize {
        usize::try_from(2 * self.max_ms_twice + 1).expect("max_ms is not negative")
    }

    fn index(&self, ml: i32, ms_twice: i32) -> Option<usize> {
        if ml.abs() > self.max_ml || ms_twice.abs() > self.max_ms_twice {
            return None;
        }
        let row = usize::try_from(ml + self.max_ml).ok()?;
        let column = usize::try_from(ms_twice + self.max_ms_twice).ok()?;
        Some(row * self.width() + column)
    }

    fn count_mut(&mut self, ml: i32, ms_twice: i32) -> &mut u64 {
        let index = self
            .index(ml, ms_twice)
            .unwrap_or_else(|| panic!("({ml}, {ms_twice}/2) lies outside the histogram"));
        &mut self.counts[index]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::SubshellKind;

    #[test]
    fn counts_single_subshell() {
        let histogram =
            MicrostateHistogram::from_states(&SubshellState::enumerate(SubshellKind::P, 2));
        assert_eq!(histogram.total(), 15);
        assert_eq!(histogram.max_ml(), 2);
        assert_eq!(histogram.max_ms(), HalfInteger::from_integer(1));
        assert_eq!(histogram.count(0, HalfInteger::ZERO), 3);
        assert_eq!(histogram.count(1, HalfInteger::from_integer(1)), 1);
        assert_eq!(histogram.count(5, HalfInteger::ZERO), 0);
    }

    #[test]
    fn convolution_multiplies_totals() {
        let p = MicrostateHistogram::from_states(&SubshellState::enumerate(SubshellKind::P, 1));
        let d = MicrostateHistogram::from_states(&SubshellState::enumerate(SubshellKind::D, 1));
        let pd = p.convolve(&d);
        assert_eq!(pd.total(), 60);
        assert_eq!(pd.count(3, HalfInteger::from_integer(1)), 1);
        assert_eq!(MicrostateHistogram::identity().convolve(&pd), pd);
    }
}
