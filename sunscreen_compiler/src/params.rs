use crate::{Error, FrontendCompilation, Result, SecurityLevel};

use log::{debug, trace};

use seal::{
    BFVEvaluator, BFVScalarEncoder, BfvEncryptionParametersBuilder, Ciphertext, CoefficientModulus,
    Context as SealContext, Decryptor, Encryptor, KeyGenerator, PlainModulus,
};
use sunscreen_circuit::{Operation, SchemeType};
use sunscreen_runtime::run_program_unchecked;
pub use sunscreen_runtime::Params;

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

const LATTICE_DIMENSIONS: &[u64] = &[1024, 2048, 4096, 8192, 16384, 32768];
const BATCHING_MIN_BITS: &[u32] = &[14, 14, 16, 17, 17, 17];

/**
 * Determines the minimal parameters required to satisfy the noise constraint for
 * the given circuit and plaintext modulo and security level.
 */
pub fn determine_params<F>(
    circuit_fn: &F,
    plaintext_constraint: PlainModulusConstraint,
    security_level: SecurityLevel,
    noise_margin_bits: u32,
    scheme_type: SchemeType,
) -> Result<Params>
where
    F: Fn(&Params) -> Result<FrontendCompilation>,
{
    'order_loop: for (i, n) in LATTICE_DIMENSIONS.iter().enumerate() {
        let plaintext_modulus = match plaintext_constraint {
            PlainModulusConstraint::Raw(v) => PlainModulus::raw(v).unwrap(),
            PlainModulusConstraint::BatchingMinimum(min) => {
                let min_batching_bits = BATCHING_MIN_BITS[i];

                match PlainModulus::batching(*n, u32::max(min_batching_bits, min)) {
                    Ok(v) => v,
                    Err(e) => {
                        trace!(
                            "Can't use batching with {} bits for dimension n={}: {:#?}",
                            min_batching_bits,
                            n,
                            e
                        );
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

        let scheme = match scheme_type {
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

        let context = match SealContext::new(&scheme, true, security_level) {
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

        let encryptor =
            Encryptor::with_public_and_secret_key(&context, &public_key, &secret_key).unwrap();
        let decryptor = Decryptor::new(&context, &secret_key).unwrap();
        let encoder = BFVScalarEncoder::new();

        let coeff = CoefficientModulus::bfv_default(*n, security_level).unwrap();

        // Compile the given circuit.
        let params = Params {
            coeff_modulus: coeff.iter().map(|v| v.value()).collect(),
            lattice_dimension: *n,
            plain_modulus: plaintext_modulus.value(),
            security_level: security_level,
            scheme_type: scheme_type,
        };

        let ir = circuit_fn(&params)?.compile();

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

        let initial_noise_budget = decryptor.invariant_noise_budget(&inputs[0]).unwrap();

        trace!("Initial noise budget (n={}): {}", n, initial_noise_budget);

        let relin_keys = if ir.requires_relin_keys() {
            match keygen.create_relinearization_keys() {
                Ok(v) => Some(v),
                Err(e) => {
                    trace!("Failed to create relin keys: {:#?}", e);
                    continue;
                }
            }
        } else {
            None
        };

        let galois_keys = if ir.requires_galois_keys() {
            match keygen.create_galois_keys() {
                Ok(v) => Some(v),
                Err(e) => {
                    trace!("Failed to create galois keys: {:#?}", e);
                    continue;
                }
            }
        } else {
            None
        };

        // We already checked for errors at the start of this function. This should be
        // well-behaved.
        let outputs =
            unsafe { run_program_unchecked(&ir, &inputs, &evaluator, relin_keys, galois_keys) };

        for (i, o) in outputs.iter().enumerate() {
            let noise_budget = decryptor.invariant_noise_budget(&o).unwrap();

            trace!(
                "Output {} has {} bits of noise budget remaining",
                i,
                noise_budget
            );
            trace!(
                "Circuit consumes {} bits of noise budget.",
                initial_noise_budget - noise_budget
            );

            if noise_budget < noise_margin_bits {
                trace!(
                    "Output {} has {} bits of noise, is below {}",
                    i,
                    noise_budget,
                    noise_margin_bits
                );
                continue 'order_loop;
            }
        }

        debug!("Params n={} and c={:#?}", n, coeff);

        return Ok(params);
    }

    Err(Error::NoParams)
}
