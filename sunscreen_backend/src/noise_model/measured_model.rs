use log::{debug, trace};
use seal_fhe::*;
use sunscreen_fhe_program::{FheProgram, Operation, SchemeType as FheProgramSchemeType};
use sunscreen_runtime::{run_program_unchecked, Params, SealData};

use super::{noise_budget_to_noise, NoiseModel};
use crate::{Error, Result};

#[derive(Copy, Clone)]
/**
 * How the [`MeasuredModel`] should create ciphertexts for each input
 * to the FHE program.
 */
pub enum TargetNoiseLevel {
    /**
     * The input ciphertext is freshly encrypted.
     */
    Fresh,

    /**
     * The input ciphertext has the target noise budget. The MeasuredModel
     * will create a new ciphertext with the same noise budget.
     */
    InvariantNoiseBudget(u32),

    /**
     * The input ciphertext has the target invariant noise. The
     * MeasuredModel will create a new ciphertext with approximately
     * the same noise budget.
     */
    InvariantNoise(f64),

    /**
     * The given input isn't a ciphertext. I.e. it's a plaintext.
     */
    NotApplicable,
}

/**
 * Creates a ciphertext with a noise level according to the given [`TargetNoiseLevel`] specification.
 *
 * # Remarks
 * If noise_level is [`TargetNoiseLevel::Fresh`], this function returns a
 * freshly encrypted ciphertext.
 *
 * If noise_level is [`TargetNoiseLevel::InvariantNoiseBudget`], this
 * function repeatedly multiplies and adds ciphertexts to synthesize a
 * ciphertext with the desired noise budget. If this target noise budget
 * if below that of a fresh ciphertext, this function returns
 * [`Error::ImpossibleNoiseFloor`].
 *
 * If noise_level is [`TargetNoiseLevel::NotApplicable`], this function
 * returns [`Error::NotApplicable`].
 */
pub fn create_ciphertext_with_noise_level(
    context: &Context,
    public_key: &PublicKey,
    private_key: &SecretKey,
    relin_keys: Option<&RelinearizationKeys>,
    noise_level: TargetNoiseLevel,
) -> Result<Ciphertext> {
    let encoder = BFVScalarEncoder::new();

    let encryptor = Encryptor::with_public_and_secret_key(context, public_key, private_key)?;

    let target_noise_level = match noise_level {
        TargetNoiseLevel::Fresh => {
            let p = encoder.encode_unsigned(1)?;
            return Ok(encryptor.encrypt(&p)?);
        }
        TargetNoiseLevel::InvariantNoiseBudget(target_noise_budget) => {
            noise_budget_to_noise(target_noise_budget as f64)
        }
        TargetNoiseLevel::InvariantNoise(target_noise) => target_noise,
        _ => unimplemented!(""),
    };

    trace!(
        "create_ciphertext_with_noise_level: Creating ciphertext with target noise {}...",
        target_noise_level
    );

    let decryptor = Decryptor::new(context, private_key)?;
    let evaluator = BFVEvaluator::new(context)?;

    let p = encoder.encode_unsigned(1)?;
    let c_initial = encryptor.encrypt(&p)?;

    let current_noise = decryptor.invariant_noise(&c_initial)?;

    if current_noise > target_noise_level {
        debug!(
            "Noise level {} exceeds target of {}",
            current_noise, target_noise_level
        );
        return Ok(c_initial);
    } else if current_noise == target_noise_level {
        return Ok(c_initial);
    }

    trace!(
        "create_ciphertext_with_noise_level: current noise {}",
        current_noise
    );

    // Repeatedly square the ciphertext to quadratically consume
    // noise budget until we exceed the target. Take the last
    // ciphertext that doesn't exceed this budget.
    let mut old_c = c_initial.clone();

    if relin_keys.is_some() {
        loop {
            trace!("create_ciphertext_with_noise_level: squaring...");

            let c = evaluator.multiply(&old_c, &old_c)?;
            let c = evaluator.relinearize(&c, relin_keys.unwrap())?;

            let current_noise = decryptor.invariant_noise(&c)?;

            if current_noise > target_noise_level {
                trace!("create_ciphertext_with_noise_level: Exceeded noise budget squaring.");
                break;
            } else if current_noise == target_noise_level {
                trace!("create_ciphertext_with_noise_level: Hit noise level.");
                return Ok(c);
            } else {
                trace!(
                    "create_ciphertext_with_noise_level: current noise {}",
                    current_noise
                );
                old_c = c;
            }
        }
    }

    // Repeatedly multiply the ciphertext with a fresh ciphertext
    // to consume a medium amount of noise budget until we
    // exceed the target. Take the last ciphertext that doesn't
    // exceed this budget.
    if relin_keys.is_some() {
        loop {
            trace!("create_ciphertext_with_noise_level: multiplying...");

            let c = evaluator.multiply(&old_c, &c_initial)?;
            let c = evaluator.relinearize(&c, relin_keys.unwrap())?;

            let current_noise = decryptor.invariant_noise(&c)?;

            if current_noise > target_noise_level {
                trace!("create_ciphertext_with_noise_level: Exceeded noise budget multiplying.");
                break;
            } else if current_noise == target_noise_level {
                trace!("create_ciphertext_with_noise_level: Hit noise level.");
                return Ok(c);
            } else {
                trace!(
                    "create_ciphertext_with_noise_level: current noise {}",
                    current_noise
                );
                old_c = c;
            }
        }
    }

    // Repeatedly add the ciphertext with itself to consume a
    // smallish amount of noise budget until we exceed the target.
    // Take the last ciphertext that doesn't exceed this target.
    loop {
        trace!("create_ciphertext_with_noise_level: doubling...");

        let c = evaluator.add(&old_c, &old_c)?;

        let current_noise = decryptor.invariant_noise(&c)?;

        if current_noise > target_noise_level {
            trace!("create_ciphertext_with_noise_level: Exceeded noise budget doubling.");
            break;
        } else if current_noise == target_noise_level {
            trace!("create_ciphertext_with_noise_level: Hit noise level.");
            return Ok(c);
        } else {
            trace!(
                "create_ciphertext_with_noise_level: current noise {}",
                current_noise
            );
            old_c = c;
        }
    }

    // Repeatedly add the ciphertext with a fresh ciphertext to
    // consume a tiny amount of noise budget until we exceed the
    // target. Take the last ciphertext that doesn't exceed this
    // target.
    loop {
        trace!("create_ciphertext_with_noise_level: adding...");

        let c = evaluator.add(&old_c, &old_c)?;

        let current_noise = decryptor.invariant_noise(&c)?;

        if current_noise > target_noise_level {
            trace!("create_ciphertext_with_noise_level: Exceeded noise budget adding.");
            break;
        } else if current_noise == target_noise_level {
            trace!("create_ciphertext_with_noise_level: Hit noise level.");
            return Ok(c);
        } else {
            trace!(
                "create_ciphertext_with_noise_level: current noise {}",
                current_noise
            );
            old_c = c;
        }
    }

    trace!(
        "Final noise budget: {} out of target {}",
        decryptor.invariant_noise(&old_c).unwrap(),
        target_noise_level
    );

    Ok(old_c)
}

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
    output_noise: Vec<f64>,
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
                    CoefficientModulus::bfv_default(
                        params.lattice_dimension,
                        params.security_level,
                    )
                    .unwrap(),
                )
                .build()?)
        }
        _ => Err(Error::InvalidParams),
    }
}

fn create_inputs_for_program(
    ir: &FheProgram,
    context: &Context,
    public_key: &PublicKey,
    private_key: &SecretKey,
    relin_keys: Option<&RelinearizationKeys>,
    noise_targets: &[TargetNoiseLevel],
) -> Result<Vec<SealData>> {
    let encoder = BFVScalarEncoder::new();

    // From a noise standpoint, it doesn't matter what is in the plaintext or if the output
    // is meaningful or not. Just run a bunch of 1 values through the fhe_program and measure the
    // noise. We choose 1, as it avoids transparent ciphertexts when
    // multiplying plaintexts.
    ir.graph
        .node_weights()
        .filter(|n| match n.operation {
            Operation::InputCiphertext(_) => true,
            Operation::InputPlaintext(_) => true,
            _ => false,
        })
        .zip(noise_targets)
        .map(|(n, target)| match n.operation {
            Operation::InputCiphertext(_) => Ok(create_ciphertext_with_noise_level(
                context,
                public_key,
                private_key,
                relin_keys,
                *target,
            )?
            .into()),
            Operation::InputPlaintext(_) => Ok(encoder.encode_unsigned(1)?.into()),
            _ => unreachable!(),
        })
        .collect::<Result<Vec<SealData>>>()
}

fn make_relin_galois_keys(
    ir: &FheProgram,
    keygen: &KeyGenerator,
) -> Result<(Option<RelinearizationKeys>, Option<GaloisKeys>)> {
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
    pub fn new(
        ir: &FheProgram,
        params: &Params,
        noise_targets: &[TargetNoiseLevel],
    ) -> Result<Self> {
        ir.validate()?;

        let seal_params = create_seal_params(params)?;

        let context = Context::new(&seal_params, true, params.security_level)?;

        let keygen = KeyGenerator::new(&context).unwrap();
        let public_key = keygen.create_public_key();
        let private_key = keygen.secret_key();

        let decryptor = Decryptor::new(&context, &private_key).unwrap();

        let evaluator = match ir.scheme {
            FheProgramSchemeType::Bfv => BFVEvaluator::new(&context).unwrap(),
        };

        let (relin_keys, galois_keys) = make_relin_galois_keys(ir, &keygen)?;

        let inputs = create_inputs_for_program(
            ir,
            &context,
            &public_key,
            &private_key,
            relin_keys.as_ref(),
            noise_targets,
        )?;

        // We validated the fhe_program, so it's safe to call
        // run_program_unchecked
        let outputs = unsafe {
            run_program_unchecked(
                ir,
                &inputs,
                &evaluator,
                &relin_keys.as_ref(),
                &galois_keys.as_ref(),
            )
        }?;

        let mut noise_levels = vec![];

        for (i, o) in outputs.iter().enumerate() {
            let invariant_noise = decryptor.invariant_noise(o).unwrap();

            // The model expects noise budgets to be in terms of invariant
            // noise, not the budget.
            noise_levels.push(invariant_noise);

            trace!(
                "Output {} has {} bits of noise budget remaining",
                i,
                invariant_noise
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

    fn neg(&self, _invariant_noise: f64) -> f64 {
        0.
    }

    fn sub_ct_ct(&self, _a_invariant_noise: f64, _b_invariant_noise: f64) -> f64 {
        0.
    }

    fn sub_ct_pt(&self, _a_invariant_noise: f64) -> f64 {
        0.
    }

    fn swap_rows(&self, _a_invariant_noise: f64) -> f64 {
        0.
    }

    fn shift_left(&self, _a_invariant_noise: f64, _places: i32) -> f64 {
        0.
    }

    fn shift_right(&self, _a_invariant_noise: f64, _places: i32) -> f64 {
        0.
    }
}

#[test]
fn can_create_target_noise_budget_ciphertext() {
    let d = 8192;

    let params = BfvEncryptionParametersBuilder::new()
        .set_plain_modulus(PlainModulus::raw(1234).unwrap())
        .set_poly_modulus_degree(d)
        .set_coefficient_modulus(CoefficientModulus::bfv_default(d, SecurityLevel::TC128).unwrap())
        .build()
        .unwrap();

    let context = Context::new(&params, false, SecurityLevel::TC128).unwrap();

    let keygen = KeyGenerator::new(&context).unwrap();
    let public_key = keygen.create_public_key();
    let private_key = keygen.secret_key();
    let relin_keys = keygen.create_relinearization_keys().unwrap();

    let desired_noise = 42;

    let c = create_ciphertext_with_noise_level(
        &context,
        &public_key,
        &private_key,
        Some(&relin_keys),
        TargetNoiseLevel::InvariantNoiseBudget(desired_noise),
    )
    .unwrap();

    let decryptor = Decryptor::new(&context, &private_key).unwrap();
    let measured_noise = decryptor.invariant_noise_budget(&c).unwrap();

    println!("{}", measured_noise);

    assert_eq!(measured_noise, desired_noise);
}

#[test]
fn can_create_target_noise_ciphertext() {
    let d = 8192;

    let params = BfvEncryptionParametersBuilder::new()
        .set_plain_modulus(PlainModulus::raw(1234).unwrap())
        .set_poly_modulus_degree(d)
        .set_coefficient_modulus(CoefficientModulus::bfv_default(d, SecurityLevel::TC128).unwrap())
        .build()
        .unwrap();

    let context = Context::new(&params, false, SecurityLevel::TC128).unwrap();

    let keygen = KeyGenerator::new(&context).unwrap();
    let public_key = keygen.create_public_key();
    let private_key = keygen.secret_key();
    let relin_keys = keygen.create_relinearization_keys().unwrap();

    let desired_noise = 0.25f64;

    let c = create_ciphertext_with_noise_level(
        &context,
        &public_key,
        &private_key,
        Some(&relin_keys),
        TargetNoiseLevel::InvariantNoise(desired_noise),
    )
    .unwrap();

    let decryptor = Decryptor::new(&context, &private_key).unwrap();
    let measured_noise = decryptor.invariant_noise(&c).unwrap();

    println!("{}", measured_noise);

    assert!(measured_noise < desired_noise);
}
