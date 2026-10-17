//! Exact arithmetic on multiples of ½, as used by spin quantum numbers.

use std::fmt;
use std::ops::{Add, Neg, Sub};

/// A number that is an integer multiple of ½, e.g. a spin `S`, a projection `M_S` or a total
/// angular momentum `J`.
///
/// The value is stored as twice its magnitude so that all arithmetic stays exact.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Default)]
pub struct HalfInteger {
    twice: i32,
}

impl HalfInteger {
    /// The value `0`.
    pub const ZERO: Self = Self::from_twice(0);
    /// The value `½`.
    pub const HALF: Self = Self::from_twice(1);

    /// Creates the half-integer `twice / 2`.
    #[must_use]
    pub const fn from_twice(twice: i32) -> Self {
        Self { twice }
    }

    /// Creates the half-integer equal to the integer `value`.
    #[must_use]
    pub const fn from_integer(value: i32) -> Self {
        Self { twice: 2 * value }
    }

    /// Returns twice the value, which is always an integer.
    #[must_use]
    pub const fn twice(self) -> i32 {
        self.twice
    }

    /// Returns `true` if the value is an integer (as opposed to an odd multiple of ½).
    #[must_use]
    pub const fn is_integer(self) -> bool {
        self.twice % 2 == 0
    }

    /// Returns the absolute value.
    #[must_use]
    pub const fn abs(self) -> Self {
        Self::from_twice(self.twice.abs())
    }

    /// Returns the value as a floating point number. The conversion is exact.
    #[must_use]
    pub fn to_f64(self) -> f64 {
        f64::from(self.twice) / 2.0
    }

    /// Iterates from `self` to `end` (both inclusive) in steps of 1.
    ///
    /// The iterator is empty if `end < self`.
    pub fn range_inclusive(self, end: Self) -> impl Iterator<Item = Self> {
        (self.twice..=end.twice).step_by(2).map(Self::from_twice)
    }
}

impl From<i32> for HalfInteger {
    fn from(value: i32) -> Self {
        Self::from_integer(value)
    }
}

impl Add for HalfInteger {
    type Output = Self;

    fn add(self, rhs: Self) -> Self {
        Self::from_twice(self.twice + rhs.twice)
    }
}

impl Sub for HalfInteger {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self {
        Self::from_twice(self.twice - rhs.twice)
    }
}

impl Neg for HalfInteger {
    type Output = Self;

    fn neg(self) -> Self {
        Self::from_twice(-self.twice)
    }
}

impl fmt::Display for HalfInteger {
    /// Formats integers as `3` and odd multiples of ½ as fractions like `-3/2`.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.is_integer() {
            write!(f, "{}", self.twice / 2)
        } else {
            write!(f, "{}/2", self.twice)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn arithmetic_is_exact() {
        let a = HalfInteger::from_twice(3);
        let b = HalfInteger::HALF;
        assert_eq!(a + b, HalfInteger::from_integer(2));
        assert_eq!(a - b, HalfInteger::from_integer(1));
        assert_eq!(-a, HalfInteger::from_twice(-3));
        assert_eq!((-a).abs(), a);
    }

    #[test]
    fn displays_fractions() {
        assert_eq!(HalfInteger::from_twice(3).to_string(), "3/2");
        assert_eq!(HalfInteger::from_twice(-1).to_string(), "-1/2");
        assert_eq!(HalfInteger::from_integer(-2).to_string(), "-2");
        assert_eq!(HalfInteger::ZERO.to_string(), "0");
    }

    #[test]
    fn inclusive_range_steps_by_one() {
        let values: Vec<_> = HalfInteger::from_twice(1)
            .range_inclusive(HalfInteger::from_twice(5))
            .map(HalfInteger::twice)
            .collect();
        assert_eq!(values, [1, 3, 5]);
        assert_eq!(
            HalfInteger::HALF.range_inclusive(HalfInteger::ZERO).count(),
            0
        );
    }
}
