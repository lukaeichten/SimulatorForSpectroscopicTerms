//! Simulator for spectroscopic terms.
//!
//! Given an electron configuration such as `p² d¹`, the simulator enumerates every microstate
//! (every way to place the electrons into spin orbitals), counts them per pair of projections
//! `(M_L, M_S)` and derives the Russell–Saunders terms `^{2S+1}L_J` of the configuration.
//!
//! The crate is pure Rust without I/O so it can be used natively, in tests and compiled to
//! WebAssembly (see the `simulator-wasm` crate).
//!
//! ```
//! use simulator_core::{ElectronConfiguration, Simulation};
//!
//! let configuration = ElectronConfiguration::new([0, 2, 0, 0]).unwrap();
//! let simulation = Simulation::new(configuration);
//! let terms: Vec<String> = simulation.terms().iter().map(ToString::to_string).collect();
//! assert_eq!(terms, ["3P", "1D", "1S"]);
//! assert_eq!(simulation.microstate_count(), 15);
//! ```

mod configuration;
mod filter;
mod half_integer;
mod histogram;
mod microstate;
mod pagination;
mod simulation;
mod subshell;
mod term;

pub use configuration::{ConfigurationError, ElectronConfiguration};
pub use filter::{AcceptAll, MicrostateFilter, TermFilter};
pub use half_integer::HalfInteger;
pub use histogram::MicrostateHistogram;
pub use microstate::Microstate;
pub use pagination::{Page, PageRequest};
pub use simulation::Simulation;
pub use subshell::{OrbitalOccupancy, SubshellKind, SubshellState};
pub use term::Term;
