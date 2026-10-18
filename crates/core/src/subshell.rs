//! Subshells (s, p, d, f) and the microstates of a single subshell.

use std::fmt;

use crate::HalfInteger;

/// The kind of a subshell, determined by its azimuthal quantum number `l`.
///
/// To support another subshell (e.g. `g`), add a variant here and extend [`SubshellKind::ALL`];
/// the rest of the simulator is generic over the subshell kinds.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum SubshellKind {
    /// `l = 0`
    S,
    /// `l = 1`
    P,
    /// `l = 2`
    D,
    /// `l = 3`
    F,
}

impl SubshellKind {
    /// All supported subshell kinds in ascending order of `l`.
    pub const ALL: [Self; 4] = [Self::S, Self::P, Self::D, Self::F];

    /// Returns the azimuthal quantum number `l`.
    #[must_use]
    pub const fn azimuthal(self) -> u32 {
        match self {
            Self::S => 0,
            Self::P => 1,
            Self::D => 2,
            Self::F => 3,
        }
    }

    /// Returns the number of orbitals (`2l + 1`), one per magnetic quantum number `m_l`.
    #[must_use]
    pub const fn orbital_count(self) -> usize {
        2 * self.azimuthal() as usize + 1
    }

    /// Returns the maximum number of electrons (`2(2l + 1)`).
    #[must_use]
    pub const fn capacity(self) -> usize {
        2 * self.orbital_count()
    }

    /// Returns the spectroscopic letter of the subshell.
    #[must_use]
    pub const fn symbol(self) -> char {
        match self {
            Self::S => 's',
            Self::P => 'p',
            Self::D => 'd',
            Self::F => 'f',
        }
    }

    /// Returns the magnetic quantum numbers `m_l` of the orbitals, from `-l` to `+l`.
    pub fn magnetic_numbers(self) -> impl Iterator<Item = i32> {
        let l = self.azimuthal().cast_signed();
        -l..=l
    }

    /// Returns the position of the kind in [`SubshellKind::ALL`].
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }
}

impl fmt::Display for SubshellKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.symbol())
    }
}

/// The occupation of a single orbital.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum OrbitalOccupancy {
    /// No electron.
    Empty,
    /// One electron with `m_s = +½`.
    SpinUp,
    /// One electron with `m_s = -½`.
    SpinDown,
    /// Two electrons with opposite spins.
    Paired,
}

impl OrbitalOccupancy {
    /// Returns the number of electrons in the orbital.
    #[must_use]
    pub const fn electrons(self) -> u32 {
        match self {
            Self::Empty => 0,
            Self::SpinUp | Self::SpinDown => 1,
            Self::Paired => 2,
        }
    }

    /// Returns the total spin projection `m_s` of the orbital.
    #[must_use]
    pub const fn spin_projection(self) -> HalfInteger {
        match self {
            Self::Empty | Self::Paired => HalfInteger::ZERO,
            Self::SpinUp => HalfInteger::HALF,
            Self::SpinDown => HalfInteger::from_twice(-1),
        }
    }
}

/// One microstate of a single subshell: which spin orbitals are occupied.
///
/// Internally the state is a bit pattern with two bits per orbital. The orbitals are ordered from
/// the most significant bits (`m_l = -l`) to the least significant bits (`m_l = +l`); within an
/// orbital, the higher bit is the spin-up and the lower bit the spin-down electron.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct SubshellState {
    kind: SubshellKind,
    bits: u32,
}

impl SubshellState {
    /// Enumerates all states of `electrons` electrons in a subshell of the given kind.
    ///
    /// The states are ordered by descending bit pattern, i.e. electrons are placed as early as
    /// possible (lowest `m_l`, spin up first). Returns no states if `electrons` exceeds the
    /// capacity.
    #[must_use]
    pub fn enumerate(kind: SubshellKind, electrons: usize) -> Vec<Self> {
        let all_bits = (1u32 << kind.capacity()) - 1;
        (0..=all_bits)
            .rev()
            .filter(|bits| bits.count_ones() as usize == electrons)
            .map(|bits| Self { kind, bits })
            .collect()
    }

    /// Returns the kind of the subshell.
    #[must_use]
    pub const fn kind(self) -> SubshellKind {
        self.kind
    }

    /// Returns the number of electrons in the subshell.
    #[must_use]
    pub const fn electrons(self) -> u32 {
        self.bits.count_ones()
    }

    /// Returns the occupation of the orbital at `index` (`0` is `m_l = -l`).
    ///
    /// # Panics
    ///
    /// Panics if `index` is not smaller than the orbital count of the subshell.
    #[must_use]
    pub fn occupancy(self, index: usize) -> OrbitalOccupancy {
        let orbital_count = self.kind.orbital_count();
        assert!(index < orbital_count, "orbital index {index} out of range");
        let shift = 2 * (orbital_count - 1 - index);
        match (self.bits >> shift) & 0b11 {
            0b00 => OrbitalOccupancy::Empty,
            0b01 => OrbitalOccupancy::SpinDown,
            0b10 => OrbitalOccupancy::SpinUp,
            _ => OrbitalOccupancy::Paired,
        }
    }

    /// Returns the occupations of all orbitals, ordered from `m_l = -l` to `m_l = +l`.
    pub fn occupancies(self) -> impl Iterator<Item = OrbitalOccupancy> {
        (0..self.kind.orbital_count()).map(move |index| self.occupancy(index))
    }

    /// Returns the total orbital angular momentum projection `M_L` of the subshell.
    #[must_use]
    pub fn orbital_projection(self) -> i32 {
        self.kind
            .magnetic_numbers()
            .zip(self.occupancies())
            .map(|(ml, occupancy)| ml * occupancy.electrons().cast_signed())
            .sum()
    }

    /// Returns the total spin projection `M_S` of the subshell.
    #[must_use]
    pub fn spin_projection(self) -> HalfInteger {
        self.occupancies()
            .map(OrbitalOccupancy::spin_projection)
            .fold(HalfInteger::ZERO, |sum, ms| sum + ms)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use OrbitalOccupancy::{Empty, Paired, SpinDown, SpinUp};

    #[test]
    fn kinds_have_expected_sizes() {
        let capacities: Vec<_> = SubshellKind::ALL.iter().map(|k| k.capacity()).collect();
        assert_eq!(capacities, [2, 6, 10, 14]);
        assert_eq!(
            SubshellKind::D.magnetic_numbers().collect::<Vec<_>>(),
            [-2, -1, 0, 1, 2]
        );
    }

    #[test]
    fn enumerates_binomial_number_of_states() {
        assert_eq!(SubshellState::enumerate(SubshellKind::P, 2).len(), 15);
        assert_eq!(SubshellState::enumerate(SubshellKind::F, 7).len(), 3432);
        assert_eq!(SubshellState::enumerate(SubshellKind::S, 0).len(), 1);
        assert_eq!(SubshellState::enumerate(SubshellKind::S, 3), Vec::new());
    }

    #[test]
    fn first_state_fills_lowest_ml_spin_up_first() {
        let states = SubshellState::enumerate(SubshellKind::P, 3);
        let first: Vec<_> = states[0].occupancies().collect();
        assert_eq!(first, [Paired, SpinUp, Empty]);
        assert_eq!(states[0].orbital_projection(), -2);
        assert_eq!(states[0].spin_projection(), HalfInteger::HALF);

        let last: Vec<_> = states.last().unwrap().occupancies().collect();
        assert_eq!(last, [Empty, SpinDown, Paired]);
    }
}
