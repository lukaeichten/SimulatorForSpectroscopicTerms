//! Microstates of a whole electron configuration.

use crate::{HalfInteger, SubshellState};

/// One microstate of an electron configuration: a state for every subshell.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Microstate {
    /// Position of the microstate in the enumeration of all microstates (zero based).
    index: u64,
    subshells: Vec<SubshellState>,
}

impl Microstate {
    pub(crate) fn new(index: u64, subshells: Vec<SubshellState>) -> Self {
        Self { index, subshells }
    }

    /// Returns the position of the microstate in the (unfiltered) enumeration of all microstates
    /// of its configuration, starting at `0`.
    #[must_use]
    pub const fn index(&self) -> u64 {
        self.index
    }

    /// Returns the states of the subshells, in the order of [`crate::SubshellKind::ALL`].
    #[must_use]
    pub fn subshells(&self) -> &[SubshellState] {
        &self.subshells
    }

    /// Returns the total orbital angular momentum projection `M_L`.
    #[must_use]
    pub fn orbital_projection(&self) -> i32 {
        self.subshells.iter().map(|s| s.orbital_projection()).sum()
    }

    /// Returns the total spin projection `M_S`.
    #[must_use]
    pub fn spin_projection(&self) -> HalfInteger {
        self.subshells
            .iter()
            .fold(HalfInteger::ZERO, |sum, s| sum + s.spin_projection())
    }
}
