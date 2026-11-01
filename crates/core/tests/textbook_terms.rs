//! Checks derived terms against well-known textbook results.

use std::collections::HashMap;

use simulator_core::{AcceptAll, ElectronConfiguration, HalfInteger, Simulation, SubshellKind};

/// Formats the terms of a configuration like `3P 1D 2x2D` (count prefix only if above one).
fn terms(electrons: [usize; 4]) -> String {
    let simulation = Simulation::new(ElectronConfiguration::new(electrons).unwrap());
    simulation
        .terms()
        .iter()
        .map(|t| {
            if t.count() > 1 {
                format!("{}x{t}", t.count())
            } else {
                t.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[test]
fn single_subshells() {
    assert_eq!(terms([0, 0, 0, 0]), "1S");
    assert_eq!(terms([1, 0, 0, 0]), "2S");
    assert_eq!(terms([0, 1, 0, 0]), "2P");
    assert_eq!(terms([0, 2, 0, 0]), "3P 1D 1S");
    assert_eq!(terms([0, 3, 0, 0]), "4S 2D 2P");
    assert_eq!(terms([0, 0, 2, 0]), "3F 3P 1G 1D 1S");
    assert_eq!(terms([0, 0, 3, 0]), "4F 4P 2H 2G 2F 2x2D 2P");
    assert_eq!(
        terms([0, 0, 5, 0]),
        "6S 4G 4F 4D 4P 2I 2H 2x2G 2x2F 3x2D 2P 2S"
    );
}

#[test]
fn mixed_subshells() {
    assert_eq!(terms([1, 1, 0, 0]), "3P 1P");
    assert_eq!(terms([0, 1, 1, 0]), "3F 3D 3P 1F 1D 1P");
}

#[test]
fn every_microstate_belongs_to_exactly_one_term() {
    for s in 0..=2 {
        for p in 0..=6 {
            for d in 0..=10 {
                for f in [0, 1, 2, 7, 13] {
                    let configuration = ElectronConfiguration::new([s, p, d, f]).unwrap();
                    let simulation = Simulation::new(configuration);
                    let covered: u64 = simulation
                        .terms()
                        .iter()
                        .map(|t| t.count() * t.degeneracy())
                        .sum();
                    assert_eq!(covered, simulation.microstate_count(), "{configuration}");
                }
            }
        }
    }
}

#[test]
fn half_filled_f_shell_ground_term() {
    let simulation = Simulation::new(
        ElectronConfiguration::default()
            .with(SubshellKind::F, 7)
            .unwrap(),
    );
    assert_eq!(simulation.terms()[0].to_string(), "8S");
    assert_eq!(simulation.microstate_count(), 3432);
}

#[test]
fn assignment_gives_each_term_count_microstates_per_cell() {
    for electrons in [
        [1, 1, 0, 0],
        [0, 2, 0, 0],
        [0, 3, 0, 0],
        [0, 0, 2, 0],
        [0, 0, 3, 0],
        [0, 0, 5, 0],
        [1, 2, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 3],
    ] {
        let simulation = Simulation::new(ElectronConfiguration::new(electrons).unwrap());
        let mut tally: HashMap<(usize, i32, HalfInteger), u64> = HashMap::new();
        for microstate in simulation.microstates(&AcceptAll, 0, usize::MAX) {
            let key = (
                microstate.term(),
                microstate.orbital_projection(),
                microstate.spin_projection(),
            );
            *tally.entry(key).or_default() += 1;
        }
        for (index, term) in simulation.terms().iter().enumerate() {
            for (ml, ms, _) in simulation.histogram().cells() {
                let expected = if term.admits(ml, ms) { term.count() } else { 0 };
                let actual = tally.get(&(index, ml, ms)).copied().unwrap_or(0);
                assert_eq!(actual, expected, "{electrons:?}, {term} at ({ml}, {ms})");
            }
        }
    }
}

#[test]
fn s1_p1_assigns_nine_microstates_to_3p_and_three_to_1p() {
    let simulation = Simulation::new(ElectronConfiguration::new([1, 1, 0, 0]).unwrap());
    let terms: Vec<_> = simulation.terms().iter().map(ToString::to_string).collect();
    assert_eq!(terms, ["3P", "1P"]);
    let microstates = simulation.microstates(&AcceptAll, 0, usize::MAX);
    assert_eq!(microstates.iter().filter(|m| m.term() == 0).count(), 9);
    assert_eq!(microstates.iter().filter(|m| m.term() == 1).count(), 3);
}
