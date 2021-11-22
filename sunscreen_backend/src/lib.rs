mod error;
mod transforms;

pub use error::*;

use seal::Modulus;
use sunscreen_ir::IntermediateRepresentation;
use sunscreen_runtime::run_program_unchecked;

/**
 * Determines the minimal parameters required to satisfy the noise constraint for
 * the given circuit and plaintext modulo.
 *
 */
pub fn determine_params(
    ir: &IntermediateRepresentation,
    plaintext_modulus: Modulus,
    noise_margin_bits: u32,
) {
}
