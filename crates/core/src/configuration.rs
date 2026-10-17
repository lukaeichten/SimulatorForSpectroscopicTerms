//! Electron configurations such as `p² d³`.

use std::error::Error;
use std::fmt;

use crate::SubshellKind;

/// The number of electrons in each subshell kind, e.g. `s⁰ p¹ d³ f⁰`.
///
/// Only one subshell of each kind is considered; closed inner shells do not contribute to the
/// terms and are therefore omitted.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default)]
pub struct ElectronConfiguration {
    electrons: [usize; SubshellKind::ALL.len()],
}

impl ElectronConfiguration {
    /// Creates a configuration from electron counts given in the order of [`SubshellKind::ALL`]
    /// (s, p, d, f).
    ///
    /// # Errors
    ///
    /// Returns [`ConfigurationError::TooManyElectrons`] if a count exceeds the subshell capacity.
    pub fn new(electrons: [usize; SubshellKind::ALL.len()]) -> Result<Self, ConfigurationError> {
        SubshellKind::ALL
            .into_iter()
            .zip(electrons)
            .try_fold(Self::default(), |configuration, (kind, count)| {
                configuration.with(kind, count)
            })
    }

    /// Returns a copy with `electrons` electrons in the subshell `kind`.
    ///
    /// # Errors
    ///
    /// Returns [`ConfigurationError::TooManyElectrons`] if `electrons` exceeds the capacity.
    pub fn with(
        mut self,
        kind: SubshellKind,
        electrons: usize,
    ) -> Result<Self, ConfigurationError> {
        if electrons > kind.capacity() {
            return Err(ConfigurationError::TooManyElectrons { kind, electrons });
        }
        self.electrons[kind.index()] = electrons;
        Ok(self)
    }

    /// Returns the number of electrons in the subshell `kind`.
    #[must_use]
    pub const fn electrons(&self, kind: SubshellKind) -> usize {
        self.electrons[kind.index()]
    }

    /// Returns the total number of electrons.
    #[must_use]
    pub fn total_electrons(&self) -> usize {
        self.electrons.iter().sum()
    }

    /// Iterates over all subshell kinds and their electron counts.
    pub fn subshells(&self) -> impl Iterator<Item = (SubshellKind, usize)> + '_ {
        SubshellKind::ALL.into_iter().zip(self.electrons)
    }
}

impl fmt::Display for ElectronConfiguration {
    /// Formats the occupied subshells, e.g. `p2 d3`. An empty configuration is formatted as `-`.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let parts: Vec<_> = self
            .subshells()
            .filter(|&(_, electrons)| electrons > 0)
            .map(|(kind, electrons)| format!("{kind}{electrons}"))
            .collect();
        if parts.is_empty() {
            write!(f, "-")
        } else {
            write!(f, "{}", parts.join(" "))
        }
    }
}

/// An invalid electron configuration.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConfigurationError {
    /// A subshell holds more electrons than its capacity.
    TooManyElectrons {
        /// The overfilled subshell.
        kind: SubshellKind,
        /// The requested number of electrons.
        electrons: usize,
    },
}

impl fmt::Display for ConfigurationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::TooManyElectrons { kind, electrons } => write!(
                f,
                "the {kind} subshell holds at most {} electrons, but {electrons} were requested",
                kind.capacity()
            ),
        }
    }
}

impl Error for ConfigurationError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_overfilled_subshells() {
        let error = ElectronConfiguration::new([0, 7, 0, 0]).unwrap_err();
        assert_eq!(
            error,
            ConfigurationError::TooManyElectrons {
                kind: SubshellKind::P,
                electrons: 7
            }
        );
        assert!(error.to_string().contains("at most 6"));
    }

    #[test]
    fn exposes_counts() {
        let configuration = ElectronConfiguration::new([1, 0, 3, 0]).unwrap();
        assert_eq!(configuration.electrons(SubshellKind::D), 3);
        assert_eq!(configuration.total_electrons(), 4);
        assert_eq!(configuration.to_string(), "s1 d3");
        assert_eq!(ElectronConfiguration::default().to_string(), "-");
    }
}
