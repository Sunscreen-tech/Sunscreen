#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

//! This crate contains the backend compiler for sunscreen FHE programs. It includes the
//! following useful operations:
//! * [`compile`] takes either an FHE program from the compiler frontend and applies a set
//! of transformations.

mod error;
/**
 * A module for performing noise estimation on FHE programs.
 */
pub mod noise_model;
mod transforms;

pub use error::*;

use sunscreen_fhe_program::FheProgram;

use transforms::transform_intermediate_representation;

/**
 * Clones the given [`FheProgram`] and compiles it.
 */
pub fn compile(ir: &FheProgram) -> FheProgram {
    let mut clone = ir.clone();

    transform_intermediate_representation(&mut clone);

    clone
}

/**
 * Consumes the given [`FheProgram`] and compiles it.
 */
pub fn compile_inplace(mut ir: FheProgram) -> FheProgram {
    transform_intermediate_representation(&mut ir);

    ir
}
