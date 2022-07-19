use crate::{Error, Result};
use sunscreen_runtime::{Params};

/**
 * The standard deviation of the Gaussian noise introduced when encrypting 
 * ciphertexts.
 */
pub const NOISE_STD_DEV: f64 = 3.2f64;

/**
 * The number of standard deviations for which SEAL can choose noise.
 */
pub const NOISE_NUM_STD_DEVIATIONS: f64 = 6f64;

/**
 * The maximum noise SEAL can introduce into a ciphertext during
 * encryption.
 */
pub const NOISE_MAX: f64 = NOISE_STD_DEV * NOISE_NUM_STD_DEVIATIONS;

// Noise modeling results come from "Optimizations of Fully
// Homomorphic Encryption" by Iliashenko.

/**
 * Gets the 
 */
fn total_q(params: &Params) -> Result<f64> {
    if params.coeff_modulus.len() < 1 {
        return Err(Error::InvalidParams)
    }

    let val = params.coeff_modulus.iter().take(params.coeff_modulus.len() - 1).fold(1f64, |sum, x| sum * (*x) as f64);

    Ok(val)
}

/**
 * Return a heuristic bound on the noise in a freshly encrypted 
 * ciphertext. See
 * page 45.
 * 
 * # Remarks
 * Returns an upper bound on the noise of a freshly encrypted 
 * ciphertext using the given parameters.
 * 
 * Returns `Err(Error::InvalidParams)` if params.coeff_modulus doesn't
 * contain at least one value.
 */
pub fn model_encryption_noise(params: &Params) -> Result<f64> {
    let t = params.plain_modulus as f64;
    let q = total_q(params)?;
    let n = params.lattice_dimension as f64;

    let noise = t * (n * (t - 1f64) / 2f64) + 2f64 * NOISE_STD_DEV * f64::sqrt(12f64 * n * n + 9f64 * n);
    //let noise = t * NOISE_MAX * (4. * f64::sqrt(3.) * n + f64::sqrt(n));

    let invariant_noise = noise / q;

    Ok(invariant_noise)
}

/**
 * Calculates the invariant noise budget from the given noise and
 * coefficient modulus
 */
pub fn model_noise_budget(noise: f64) -> Result<u32> {
    let noise_budget = -f64::log2(2. * noise);

    Ok(noise_budget as u32)
}

#[cfg(test)]
mod tests {
    use super::*;
    use seal_fhe::*;

    fn setup_scheme(lattice_dimension: u64, plain_modulus: u64) -> (Context, Params) {
        let params = BfvEncryptionParametersBuilder::new()
            .set_plain_modulus_u64(plain_modulus)
            .set_poly_modulus_degree(lattice_dimension)
            .set_coefficient_modulus(CoefficientModulus::bfv_default(lattice_dimension, SecurityLevel::TC128).unwrap())
            .build()
            .unwrap();

        let params_ret = Params {
            lattice_dimension: params.get_poly_modulus_degree(),
            plain_modulus: params.get_plain_modulus().value(),
            coeff_modulus: params.get_coefficient_modulus().iter().map(|x| x.value()).collect(),
            scheme_type: sunscreen_fhe_program::SchemeType::Bfv,
            security_level: SecurityLevel::TC128,
        };

        let ctx = Context::new(&params, false, SecurityLevel::TC128)
            .unwrap();

        (ctx, params_ret)
    }

    #[test]
    fn fresh_encryption_bound_exceeds_measured() {
        for d in [2048, 4096, 8192, 16384] {
            for p in [100, 1000, 10000, 10000] {
                let (ctx, params) = setup_scheme(d, p);

                let keygen = KeyGenerator::new(&ctx).unwrap();
                let public_key = keygen.create_public_key();
                let private_key = keygen.secret_key();
                let encryptor = Encryptor::with_public_key(&ctx, &public_key).unwrap();
                let decryptor = Decryptor::new(&ctx, &private_key).unwrap();

                let mut pt = Plaintext::new().unwrap();
                pt.resize(d as usize);

                for i in 0..d {
                    pt.set_coefficient(i as usize, p - 1);
                }

                let ct = encryptor.encrypt(&pt).unwrap();

                let measured_noise_budget = decryptor.invariant_noise_budget(&ct).unwrap();
                let modeled_noise = model_encryption_noise(&params).unwrap();
                let modeled_noise_budget = model_noise_budget(modeled_noise).unwrap();

                assert_eq!(modeled_noise_budget < measured_noise_budget, true);
            }
        }
    }
}