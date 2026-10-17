//! WebAssembly bindings of the spectroscopic term simulator.
//!
//! This crate is a thin adapter: it converts between JavaScript values and the types of
//! [`simulator_core`] and contains no simulation logic itself.

mod dto;

use serde::Serialize;
use simulator_core::{ElectronConfiguration, PageRequest, Simulation, SubshellKind, TermFilter};
use wasm_bindgen::prelude::*;

use crate::dto::{MicrostatePage, SubshellKindInfo, Summary, TermInfo};

/// Installs a panic hook that logs Rust panics to the browser console.
#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
}

/// Returns the supported subshell kinds in ascending order of `l`.
///
/// # Errors
///
/// Fails only if the result cannot be converted to a JavaScript value.
#[wasm_bindgen(js_name = subshellKinds, unchecked_return_type = "SubshellKindInfo[]")]
pub fn subshell_kinds() -> Result<JsValue, JsError> {
    let kinds: Vec<_> = SubshellKind::ALL
        .into_iter()
        .map(SubshellKindInfo::from)
        .collect();
    to_js(&kinds)
}

/// The simulation of one electron configuration.
#[wasm_bindgen]
pub struct Simulator {
    simulation: Simulation,
}

#[wasm_bindgen]
impl Simulator {
    /// Simulates the configuration with the given electron counts, ordered like
    /// [`subshell_kinds`].
    ///
    /// # Errors
    ///
    /// Fails if the number of counts does not match the number of subshell kinds or if a
    /// subshell is overfilled.
    #[wasm_bindgen(constructor)]
    pub fn new(electrons: &[u32]) -> Result<Simulator, JsError> {
        let counts: [u32; SubshellKind::ALL.len()] = electrons.try_into().map_err(|_| {
            JsError::new(&format!(
                "expected {} electron counts, got {}",
                SubshellKind::ALL.len(),
                electrons.len()
            ))
        })?;
        let configuration = ElectronConfiguration::new(counts.map(|count| count as usize))?;
        Ok(Self {
            simulation: Simulation::new(configuration),
        })
    }

    /// Returns the number of states per subshell and the total number of microstates.
    ///
    /// # Errors
    ///
    /// Fails only if the result cannot be converted to a JavaScript value.
    #[wasm_bindgen(unchecked_return_type = "Summary")]
    pub fn summary(&self) -> Result<JsValue, JsError> {
        to_js(&Summary::from(&self.simulation))
    }

    /// Returns the terms of the configuration.
    ///
    /// # Errors
    ///
    /// Fails only if the result cannot be converted to a JavaScript value.
    #[wasm_bindgen(unchecked_return_type = "TermInfo[]")]
    pub fn terms(&self) -> Result<JsValue, JsError> {
        let terms: Vec<_> = self.simulation.terms().iter().map(TermInfo::from).collect();
        to_js(&terms)
    }

    /// Returns one page of microstates.
    ///
    /// `term_indices` are zero-based indices into [`Simulator::terms`]; if given, only the
    /// microstates that may belong to one of these terms are listed. A page index beyond the
    /// last page returns the last page.
    ///
    /// # Errors
    ///
    /// Fails if a term index is out of range or the page size is zero.
    #[wasm_bindgen(js_name = microstatePage, unchecked_return_type = "MicrostatePage")]
    pub fn microstate_page(
        &self,
        term_indices: &[u32],
        page_index: u32,
        page_size: u32,
    ) -> Result<JsValue, JsError> {
        let terms = self.simulation.terms();
        let selected = term_indices
            .iter()
            .map(|&index| {
                terms
                    .get(index as usize)
                    .copied()
                    .ok_or_else(|| JsError::new(&format!("there is no term with index {index}")))
            })
            .collect::<Result<Vec<_>, _>>()?;
        if page_size == 0 {
            return Err(JsError::new("the page size must be positive"));
        }

        let request = PageRequest::new(u64::from(page_index), page_size as usize);
        let page = self.simulation.page(&TermFilter::new(selected), request);
        to_js(&MicrostatePage::from(&page))
    }
}

fn to_js<T: Serialize + ?Sized>(value: &T) -> Result<JsValue, JsError> {
    value
        .serialize(&serde_wasm_bindgen::Serializer::json_compatible())
        .map_err(|error| JsError::new(&error.to_string()))
}
