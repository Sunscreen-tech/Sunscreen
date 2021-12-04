#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

//! This crate contains the backend compiler for sunscreen circuits. It includes the
//! following useful operations:
//! * [`compile`] takes either a circuit from the compiler frontend and applies a set
//! of transformations.

mod error;
mod transforms;

pub use error::*;

use sunscreen_circuit::Circuit;

use transforms::transform_intermediate_represenation;

/**
 * Clones the given [`Circuit`] and compiles it.
 */
pub fn compile(ir: &Circuit) -> Circuit {
    let mut clone = ir.clone();

    transform_intermediate_represenation(&mut clone);

    clone
}

/**
 * Consumes the given [`Circuit`] and compiles it.
 */
pub fn compile_inplace(mut ir: Circuit) -> Circuit {
    transform_intermediate_represenation(&mut ir);

    ir
}
