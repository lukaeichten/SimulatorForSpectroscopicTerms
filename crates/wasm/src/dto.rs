//! Data transfer objects handed to JavaScript.
//!
//! The structs are serialized with `serde-wasm-bindgen`; the TypeScript declarations below are
//! emitted into the generated `.d.ts` file and must be kept in sync with the structs.

use serde::Serialize;
use simulator_core::{
    HalfInteger, Microstate, OrbitalOccupancy, Page, Simulation, SubshellKind, SubshellState, Term,
};
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen(typescript_custom_section)]
const TYPESCRIPT_TYPES: &str = r#"
/** Occupation of a single orbital. */
export type Occupancy = "empty" | "up" | "down" | "paired";

/** Static description of a subshell kind (s, p, d, f, ...). */
export interface SubshellKindInfo {
    symbol: string;
    azimuthal: number;
    capacity: number;
    /** Magnetic quantum numbers m_l of the orbitals, from -l to +l. */
    magneticNumbers: number[];
}

/** Number of states of one subshell of the simulated configuration. */
export interface SubshellSummary {
    symbol: string;
    electrons: number;
    capacity: number;
    states: number;
}

export interface Summary {
    subshells: SubshellSummary[];
    microstates: number;
}

/** A spectroscopic term; spins and angular momenta are exact multiples of 0.5. */
export interface TermInfo {
    orbital: number;
    spin: number;
    count: number;
    multiplicity: number;
    letter: string;
    totalAngularMomenta: number[];
    degeneracy: number;
}

export interface MicrostateInfo {
    /** One-based position in the (possibly filtered) list. */
    position: number;
    /** Zero-based index in the unfiltered enumeration. */
    index: number;
    /** Orbital occupations per subshell, each ordered from m_l = -l to +l. */
    subshells: Occupancy[][];
    ml: number;
    ms: number;
}

export interface MicrostatePage {
    items: MicrostateInfo[];
    /** Zero-based index of the returned page (clamped to the last page). */
    pageIndex: number;
    pageSize: number;
    pageCount: number;
    totalItems: number;
}
"#;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubshellKindInfo {
    symbol: char,
    azimuthal: u32,
    capacity: usize,
    magnetic_numbers: Vec<i32>,
}

impl From<SubshellKind> for SubshellKindInfo {
    fn from(kind: SubshellKind) -> Self {
        Self {
            symbol: kind.symbol(),
            azimuthal: kind.azimuthal(),
            capacity: kind.capacity(),
            magnetic_numbers: kind.magnetic_numbers().collect(),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubshellSummary {
    symbol: char,
    electrons: usize,
    capacity: usize,
    states: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    subshells: Vec<SubshellSummary>,
    microstates: u64,
}

impl From<&Simulation> for Summary {
    fn from(simulation: &Simulation) -> Self {
        Self {
            subshells: simulation
                .configuration()
                .subshells()
                .map(|(kind, electrons)| SubshellSummary {
                    symbol: kind.symbol(),
                    electrons,
                    capacity: kind.capacity(),
                    states: simulation.subshell_state_count(kind),
                })
                .collect(),
            microstates: simulation.microstate_count(),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TermInfo {
    orbital: u32,
    spin: f64,
    count: u64,
    multiplicity: u32,
    letter: String,
    total_angular_momenta: Vec<f64>,
    degeneracy: u64,
}

impl From<&Term> for TermInfo {
    fn from(term: &Term) -> Self {
        Self {
            orbital: term.orbital(),
            spin: term.spin().to_f64(),
            count: term.count(),
            multiplicity: term.multiplicity(),
            letter: term
                .letter()
                .map_or_else(|| format!("[L={}]", term.orbital()), String::from),
            total_angular_momenta: term
                .total_angular_momenta()
                .map(HalfInteger::to_f64)
                .collect(),
            degeneracy: term.degeneracy(),
        }
    }
}

#[derive(Serialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum Occupancy {
    Empty,
    Up,
    Down,
    Paired,
}

impl From<OrbitalOccupancy> for Occupancy {
    fn from(occupancy: OrbitalOccupancy) -> Self {
        match occupancy {
            OrbitalOccupancy::Empty => Self::Empty,
            OrbitalOccupancy::SpinUp => Self::Up,
            OrbitalOccupancy::SpinDown => Self::Down,
            OrbitalOccupancy::Paired => Self::Paired,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MicrostateInfo {
    position: u64,
    index: u64,
    subshells: Vec<Vec<Occupancy>>,
    ml: i32,
    ms: f64,
}

impl MicrostateInfo {
    fn new(position: u64, microstate: &Microstate) -> Self {
        Self {
            position,
            index: microstate.index(),
            subshells: microstate
                .subshells()
                .iter()
                .map(|state: &SubshellState| state.occupancies().map(Occupancy::from).collect())
                .collect(),
            ml: microstate.orbital_projection(),
            ms: microstate.spin_projection().to_f64(),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MicrostatePage {
    items: Vec<MicrostateInfo>,
    page_index: u64,
    page_size: usize,
    page_count: u64,
    total_items: u64,
}

impl From<&Page<Microstate>> for MicrostatePage {
    fn from(page: &Page<Microstate>) -> Self {
        Self {
            items: (page.offset() + 1..)
                .zip(page.items())
                .map(|(position, microstate)| MicrostateInfo::new(position, microstate))
                .collect(),
            page_index: page.index(),
            page_size: page.size(),
            page_count: page.page_count(),
            total_items: page.total_items(),
        }
    }
}
