mod error;
mod transforms;

pub use error::*;

use transforms::transform_intermediate_represenation;

use seal::Modulus;
use sunscreen_ir::IntermediateRepresentation;


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

/**
 * Clones the given [`IntermediateRepresentation`] and compiles it.
 */
pub fn compile(
    ir: &IntermediateRepresentation,
) -> IntermediateRepresentation {
    let mut clone = ir.clone();

    transform_intermediate_represenation(&mut clone);

    clone
}

/**
 * Consumes the given [`IntermediateRepresentation`] and compiles it.
 */
pub fn compile_inplace(
    mut ir: IntermediateRepresentation,
) -> IntermediateRepresentation {
    transform_intermediate_represenation(&mut ir);

    ir
}