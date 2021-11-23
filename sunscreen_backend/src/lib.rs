mod error;
mod transforms;

pub use error::*;

use transforms::transform_intermediate_represenation;

use log::{debug, trace};
use seal::{
    BFVEvaluator, BFVScalarEncoder, BfvEncryptionParametersBuilder, Ciphertext, CoefficientModulus,
    Context, Decryptor, Encryptor, KeyGenerator, Modulus, PlainModulus, SchemeType, SecurityLevel,
};
use sunscreen_ir::{IntermediateRepresentation, Operation};
use sunscreen_runtime::run_program_unchecked;

const LATTICE_DIMENSIONS: &[u64] = &[1 << 10, 1 << 11, 1 << 12, 1 << 13, 1 << 14, 1 << 15];

#[derive(Debug, Clone, PartialEq)]
pub struct Params {
    lattice_dimension: u64,
    coeff_modulus: Vec<Modulus>,
    plain_modulus: Modulus,
}

#[derive(Debug, Clone, Copy, PartialEq)]
/**
 * A constraint on the plaintext
 */
pub enum PlainModulusConstraint {
    /**
     * If you aren't using batching, use this. The inner value represents the exact
     * plaintext modulus you wish to use.
     */
    Raw(u64),

    /**
     * Specifies a minimal requested number of bits in the prime number generated in the
     * prime modulus. This is only a minimum, if the parameters require more, you will receive
     * a larger plain modulus.
     *
     * # Remarks
     * You can set this to 0 if all your values will be `2^14-1` or less.
     */
    BatchingMinimum(u32),
}

/**
 * Determines the minimal parameters required to satisfy the noise constraint for
 * the given circuit and plaintext modulo and security level..
 *
 */
pub fn determine_params(
    ir: &IntermediateRepresentation,
    plaintext_constraint: PlainModulusConstraint,
    security_level: SecurityLevel,
    noise_margin_bits: u32,
) -> Result<Params> {
    // Don't even try if there are complication errors.
    ir.validate()?;

    'order_loop: for n in LATTICE_DIMENSIONS {
        let plaintext_modulus = match plaintext_constraint {
            PlainModulusConstraint::Raw(v) => PlainModulus::raw(v).unwrap(),
            PlainModulusConstraint::BatchingMinimum(min) => {
                let bits = f64::log2(*n as f64) as u32 + 4;

                match PlainModulus::batching(*n, u32::max(bits, min)) {
                    Ok(v) => v,
                    Err(e) => {
                        trace!("Can't use batching with {} bits for dimension n={}: {:#?}", bits, n, e);
                        continue;
                    }
                }
            }
        };

        trace!(
            "Trying to build scheme with \\lambda={:#?} p={} n={} c=default(\\lambda, n).",
            security_level,
            plaintext_modulus.value(),
            n
        );

        let plaintext_modulus = plaintext_modulus.clone();

        let scheme = match ir.scheme {
            SchemeType::Bfv => {
                let scheme_result = BfvEncryptionParametersBuilder::new()
                    .set_plain_modulus(plaintext_modulus.clone())
                    .set_poly_modulus_degree(*n)
                    .set_coefficient_modulus(
                        CoefficientModulus::bfv_default(*n, security_level).unwrap(),
                    )
                    .build();

                let scheme = match scheme_result {
                    Ok(v) => v,
                    Err(e) => {
                        trace!(
                            "Failed to create scheme for lattice dimension {}: {:#?}",
                            n,
                            e
                        );
                        continue;
                    }
                };

                scheme
            }
            _ => {
                unimplemented!();
            }
        };

        trace!("Successfully created parameters.");

        let context = match Context::new(&scheme, true, security_level) {
            Err(e) => {
                trace!(
                    "Failed to create context for lattice dimension {}: {:#?}",
                    n,
                    e
                );
                continue;
            }
            Ok(c) => c,
        };

        trace!("Successfully created context.");

        let keygen = KeyGenerator::new(&context).unwrap();
        let public_key = keygen.create_public_key();
        let secret_key = keygen.secret_key();
        let relin_keys = match keygen.create_relinearization_keys() {
            Ok(v) => v,
            Err(e) => {
                trace!("Failed to create relin keys: {:#?}", e);
                continue;
            }
        };

        let encryptor =
            Encryptor::with_public_and_secret_key(&context, &public_key, &secret_key).unwrap();
        let decryptor = Decryptor::new(&context, &secret_key).unwrap();
        let encoder = BFVScalarEncoder::new();

        let num_inputs = ir
            .graph
            .node_weights()
            .filter(|n| match n.operation {
                Operation::InputCiphertext(_) => true,
                _ => false,
            })
            .count();

        let evaluator = match ir.scheme {
            SchemeType::Bfv => BFVEvaluator::new(&context).unwrap(),
            _ => unimplemented!(),
        };

        // From a noise standpoint, it doesn't matter what is in the plaintext or if the output
        // is meaningful or not. Just run a bunch of 0 values through the circuit and measure the
        // noise.
        let inputs = (0..num_inputs)
            .map(|_| encoder.encode_unsigned(0).unwrap())
            .map(|p| encryptor.encrypt(&p).unwrap())
            .collect::<Vec<Ciphertext>>();

        // We already checked for errors at the start of this function. This should be
        // well-behaved.
        let outputs = unsafe { run_program_unchecked(ir, &inputs, &evaluator, Some(relin_keys)) };

        for (i, o) in outputs.iter().enumerate() {
            let noise = decryptor.invariant_noise_budget(&o).unwrap();

            if noise < noise_margin_bits {
                trace!(
                    "Output {} has {} bits of noise, which exceeds {}",
                    i,
                    noise,
                    noise_margin_bits
                );
                continue 'order_loop;
            }
        }

        let coeff = CoefficientModulus::bfv_default(*n, security_level).unwrap();

        debug!("Params n={} and c={:#?}", n, coeff);

        return Ok(Params {
            coeff_modulus: coeff,
            lattice_dimension: *n,
            plain_modulus: plaintext_modulus,
        });
    }

    Err(Error::NoParams)
}

/**
 * Clones the given [`IntermediateRepresentation`] and compiles it.
 */
pub fn compile(ir: &IntermediateRepresentation) -> IntermediateRepresentation {
    let mut clone = ir.clone();

    transform_intermediate_represenation(&mut clone);

    clone
}

/**
 * Consumes the given [`IntermediateRepresentation`] and compiles it.
 */
pub fn compile_inplace(mut ir: IntermediateRepresentation) -> IntermediateRepresentation {
    transform_intermediate_represenation(&mut ir);

    ir
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_params_add_reduction() {
        let _ = env_logger::try_init();

        let mut ir = IntermediateRepresentation::new(SchemeType::Bfv);

        let a = ir.append_input_ciphertext(0);
        let b = ir.append_input_ciphertext(1);
        let c = ir.append_input_ciphertext(0);
        let d = ir.append_input_ciphertext(1);
        let e = ir.append_input_ciphertext(0);
        let f = ir.append_input_ciphertext(1);
        let g = ir.append_input_ciphertext(0);
        let h = ir.append_input_ciphertext(1);

        let a_0 = ir.append_add(a, b);
        let a_1 = ir.append_add(c, d);
        let a_2 = ir.append_add(e, f);
        let a_3 = ir.append_add(g, h);

        let a_0_0 = ir.append_add(a_0, a_1);
        let a_1_0 = ir.append_add(a_2, a_3);

        let res = ir.append_add(a_0_0, a_1_0);

        ir.append_output_ciphertext(res);

        let params = determine_params(
            &ir,
            PlainModulusConstraint::BatchingMinimum(0),
            SecurityLevel::TC128,
            20,
        ).unwrap();

        let expected_degree = 4096;

        assert_eq!(
            params,
            Params {
                lattice_dimension: expected_degree,
                coeff_modulus: CoefficientModulus::bfv_default(expected_degree, SecurityLevel::TC128).unwrap(),
                plain_modulus: PlainModulus::raw(40961).unwrap(),
            }
        );
    }
}
