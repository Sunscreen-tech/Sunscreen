use crate::{Error, FheProgramFn, Result, SecurityLevel};

use log::{debug, trace};

use seal_fhe::{
    BfvEncryptionParametersBuilder, CoefficientModulus, Context, KeyGenerator, Modulus,
    PlainModulus,
};
use sunscreen_backend::noise_model::{
    noise_budget_to_noise, predict_noise, MeasuredModel, NoiseModel, TargetNoiseLevel,
};
use sunscreen_fhe_program::{FheProgram, Operation, SchemeType};
pub use sunscreen_runtime::Params;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
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
 * Returns a plaintext modulus that satisfies the given
 * PlainModulusConstraint and lattice dimension.
 *
 * # Remarks
 * Particularly with batching, the constraint may not be satisfiable with
 * the given lattice dimension. In such cases, this function returns
 * [`Error::UnsatisfiableConstraint`].
 */
fn plaintext_constraint_to_modulus(
    constraint: PlainModulusConstraint,
    lattice_dimension_index: usize,
) -> Result<seal_fhe::Modulus> {
    let lattice_dimension = LATTICE_DIMENSIONS[lattice_dimension_index];

    let plaintext_modulus = match constraint {
        PlainModulusConstraint::Raw(v) => PlainModulus::raw(v).unwrap(),
        PlainModulusConstraint::BatchingMinimum(min) => {
            let min_batching_bits = BATCHING_MIN_BITS[lattice_dimension_index];

            match PlainModulus::batching(lattice_dimension, u32::max(min_batching_bits, min)) {
                Ok(v) => v,
                Err(e) => {
                    trace!(
                        "Can't use batching with {} bits for dimension n={}: {:#?}",
                        min_batching_bits,
                        lattice_dimension,
                        e
                    );
                    return Err(Error::UnsatisfiableConstraint);
                }
            }
        }
    };

    Ok(plaintext_modulus)
}

/**
 * Verifies the keys required by the fhe_program can be created
 * with the given parameter set.
 */
fn can_make_required_keys(fhe_program: &FheProgram, params: &Params) -> Result<bool> {
    let plain_modulus = PlainModulus::raw(params.plain_modulus)?;
    let modulus_chain = params
        .coeff_modulus
        .iter()
        .map(|x| Modulus::new(*x).map_err(Error::from))
        .collect::<Result<Vec<Modulus>>>()?;

    let enc_params = BfvEncryptionParametersBuilder::new()
        .set_plain_modulus(plain_modulus)
        .set_coefficient_modulus(modulus_chain)
        .set_poly_modulus_degree(params.lattice_dimension)
        .build()?;

    let context = Context::new(&enc_params, true, params.security_level).unwrap();

    let keygen = KeyGenerator::new(&context).unwrap();

    let create_galois = if fhe_program.requires_galois_keys() {
        match keygen.create_galois_keys() {
            Ok(_) => true,
            Err(_) => false,
        }
    } else {
        true
    };

    let create_relin = if fhe_program.requires_relin_keys() {
        match keygen.create_relinearization_keys() {
            Ok(_) => true,
            Err(_) => false,
        }
    } else {
        true
    };

    Ok(create_galois && create_relin)
}

/**
 * Determines the minimal parameters required to satisfy the noise constraint for
 * the given FHE program and plaintext modulo and security level.
 */
pub fn determine_params(
    fhe_program_fns: &[Box<dyn FheProgramFn>],
    plaintext_constraint: PlainModulusConstraint,
    security_level: SecurityLevel,
    noise_margin_bits: u32,
    scheme_type: SchemeType,
) -> Result<Params> {
    'params_loop: for (i, n) in LATTICE_DIMENSIONS.iter().enumerate() {
        // Select a plain modulus that meets needs of the passed
        // constraint.
        let plaintext_modulus = match plaintext_constraint_to_modulus(plaintext_constraint, i) {
            Ok(v) => v,
            Err(_) => {
                continue 'params_loop;
            }
        };

        // Tell SEAL to give us whatever modulus chain it finds suitable.
        let coeff = CoefficientModulus::bfv_default(*n, security_level).unwrap();

        // Compile the given fhe_program.
        let params = Params {
            coeff_modulus: coeff.iter().map(|v| v.value()).collect(),
            lattice_dimension: *n,
            plain_modulus: plaintext_modulus.value(),
            security_level,
            scheme_type,
        };

        trace!(
            "Trying to build scheme with \\lambda={:#?} p={} n={} c=default(\\lambda, n).",
            security_level,
            plaintext_modulus.value(),
            n
        );

        for program in fhe_program_fns {
            trace!("Successfully created parameters.");
            trace!("Running backend compilation for {}", program.name());
            let ir = program.build(&params)?.compile();

            ir.validate().map_err(Error::FheProgramError)?;
            trace!("Built and validated {}", program.name());

            match can_make_required_keys(&ir, &params) {
                Ok(can_make_keys) => {
                    if !can_make_keys {
                        continue 'params_loop;
                    }
                }
                Err(_) => {
                    continue 'params_loop;
                }
            };

            let mut chain_noise_level = 0f64;

            for _ in 0..program.chain_count() {
                let noise_targets = ir
                    .graph
                    .node_weights()
                    .filter(|n| match n.operation {
                        Operation::InputCiphertext(_) => true,
                        Operation::InputPlaintext(_) => true,
                        _ => false,
                    })
                    .map(|n| match n.operation {
                        Operation::InputCiphertext(_) => {
                            if chain_noise_level == 0f64 {
                                TargetNoiseLevel::Fresh
                            } else {
                                TargetNoiseLevel::InvariantNoise(chain_noise_level)
                            }
                        }
                        Operation::InputPlaintext(_) => TargetNoiseLevel::NotApplicable,
                        _ => unreachable!(),
                    })
                    .collect::<Vec<TargetNoiseLevel>>();

                let model = match MeasuredModel::new(&ir, &params, &noise_targets) {
                    Ok(v) => v,
                    Err(_) => {
                        trace!(
                            "Failed to construct noise model for {} with lattice_dimension={}",
                            program.name(),
                            n
                        );
                        continue 'params_loop;
                    }
                };

                let model: Box<dyn NoiseModel + Sync> = Box::new(model);

                let output_noises = predict_noise(&model, &ir);

                let target_noise = noise_budget_to_noise(noise_margin_bits as f64);

                for output_noise in output_noises {
                    if output_noise > target_noise {
                        trace!(
                            "Failed to meet noise constraints with lattice dimension {} for program {}",
                            n,
                            program.name()
                        );
                        continue 'params_loop;
                    } else if output_noise > chain_noise_level {
                        chain_noise_level = output_noise
                    }
                }
            }

            debug!("Using params lattice_dimension={} and ={:#?}", n, coeff);
        }

        return Ok(params);
    }

    Err(Error::NoParams)
}
