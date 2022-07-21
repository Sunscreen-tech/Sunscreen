use log::trace;
use seal_fhe::*;
use sunscreen_fhe_program::{
    FheProgram,
    Operation,
    SchemeType as FheProgramSchemeType
};
use sunscreen_runtime::{Params, run_program_unchecked, SealData};

use crate::{Result, Error};
use super::{NoiseModel, noise_budget_to_noise};

/**
 * A "model" that tracks noise growth in an FHE program just running it, 
 * measuring the noise of the output ciphertexts.
 * 
 * # Remarks
 * * This model is non-deterministic because we're running on real ciphertexts.
 * * All other models should bound its results from above
 * * All operations other than `output` return 0.0 noise.
 */
pub struct MeasuredModel {
    output_noise: Vec<f64>
}

fn create_seal_params(params: &Params) -> Result<EncryptionParameters> {
    #[allow(unreachable_patterns)]
    match params.scheme_type {
        FheProgramSchemeType::Bfv => {
            let plaintext_modulus = PlainModulus::raw(params.plain_modulus)?;

            Ok(BfvEncryptionParametersBuilder::new()
                .set_plain_modulus(plaintext_modulus)
                .set_poly_modulus_degree(params.lattice_dimension)
                .set_coefficient_modulus(
                    CoefficientModulus::bfv_default(params.lattice_dimension, params.security_level).unwrap(),
                )
                .build()?)
        },
        _ => {
            Err(Error::InvalidParams)
        }
    }
}

fn create_inputs_for_program(ir: &FheProgram, encryptor: &Encryptor) -> Result<Vec<SealData>> {
    let encoder = BFVScalarEncoder::new();

    // From a noise standpoint, it doesn't matter what is in the plaintext or if the output
    // is meaningful or not. Just run a bunch of 1 values through the fhe_program and measure the
    // noise. We choose 1, as it avoids transparent ciphertexts when
    // multiplying plaintexts.
    Ok(ir
        .graph
        .node_weights()
        .filter(|n| match n.operation {
            Operation::InputCiphertext(_) => true,
            Operation::InputPlaintext(_) => true,
            _ => false,
        })
        .map(|n| match n.operation {
            Operation::InputCiphertext(_) => {
                let p = encoder.encode_unsigned(1)?;
                Ok(encryptor.encrypt(&p)?.into())
            }
            Operation::InputPlaintext(_) => Ok(encoder.encode_unsigned(1)?.into()),
            _ => unreachable!(),
        })
        .collect::<Result<Vec<SealData>>>()?)
}

fn make_relin_galois_keys(ir: &FheProgram, keygen: &KeyGenerator) -> Result<(Option<RelinearizationKeys>, Option<GaloisKeys>)> {
    let relin_keys = if ir.requires_relin_keys() {
        match keygen.create_relinearization_keys() {
            Ok(v) => Some(v),
            Err(e) => {
                trace!("Failed to create relin keys: {:#?}", e);
                return Err(Error::KeygenFailure);
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
                return Err(Error::KeygenFailure);
            }
        }
    } else {
        None
    };

    Ok((relin_keys, galois_keys))
}

impl MeasuredModel {
    /**
     * Creates a new `MeasuredModel` with the given [`FheProgram`] and [`Params`].
     */
    pub fn new(ir: &FheProgram, params: &Params) -> Result<Self> {
        ir.validate()?;

        let seal_params = create_seal_params(params)?;

        let context = Context::new(&seal_params, true, params.security_level)?;

        let keygen = KeyGenerator::new(&context).unwrap();
        let public_key = keygen.create_public_key();
        let private_key = keygen.secret_key();

        let encryptor =
            Encryptor::with_public_and_secret_key(&context, &public_key, &private_key).unwrap();
        let decryptor = Decryptor::new(&context, &private_key).unwrap();

        let evaluator = match ir.scheme {
            FheProgramSchemeType::Bfv => BFVEvaluator::new(&context).unwrap(),
        };

        let (relin_keys, galois_keys) = make_relin_galois_keys(ir, &keygen)?;

        let inputs = create_inputs_for_program(ir, &encryptor)?;

        // We validated the fhe_program, so it's safe to call
        // run_program_unchecked
        let outputs = unsafe {
            run_program_unchecked(
                &ir,
                &inputs,
                &evaluator,
                &relin_keys.as_ref(),
                &galois_keys.as_ref(),
            )
        }?;

        let mut noise_levels = vec![];

        for (i, o) in outputs.iter().enumerate() {
            let noise_budget = decryptor.invariant_noise_budget(&o).unwrap();

            // The model expects noise budgets to be in terms of invariant
            // noise, not the budget.
            noise_levels.push(noise_budget_to_noise(noise_budget as f64));

            trace!(
                "Output {} has {} bits of noise budget remaining",
                i,
                noise_budget
            );
        }

        Ok(Self {
            output_noise: noise_levels,
        })
    }
}

impl NoiseModel for MeasuredModel {
    fn encrypt(&self) -> f64 {
        0.
    }

    fn add_ct_ct(&self, _a_invariant_noise: f64, _b_invariant_noise: f64) -> f64 {
        0.
    }

    fn add_ct_pt(&self, _ct_invariant_noise: f64) -> f64 {
        0.
    }

    fn mul_ct_ct(&self, _a_invariant_noise: f64, _b_invariant_noise: f64) -> f64 {
        0.
    }

    fn mul_ct_pt(&self, _a_invariant_noise: f64) -> f64 {
        0.
    }

    fn relinearize(&self, _a_invariant_noise: f64) -> f64 {
        0.
    }

    fn output(&self, output_id: usize, _invariant_noise: f64) -> f64 {
        self.output_noise[output_id]
    }
}