use crate::{noise_model::NoiseModel, Error, Result};
use num::{BigUint, ToPrimitive};
use sunscreen_runtime::Params;

use super::noise_budget_to_noise;

#[derive(Clone)]
/**
 * A model for tracking noise growth using derivations of the canonical
 * embedding norm of ciphertexts' randomness as an upper bound.
 *
 * # Remarks
 * The implemented heuristics come from the following sources:
 * * `encrypt`: "Optimizations of Fully Homomorphic Encryption" by Ilia Iliashenko, page 45.
 * * `add_ct_ct`: SEAL 2.3.1 release notes page 12.
 * * `add_ct_pt`: SEAL 2.3.1 release notes page 13.
 * * `mul_ct_ct`: "Optimizations of Fully Homomorphic Encryption" by Ilia  Iliashenko, page 48.
 * * `mul_ct_pt`: SEAL 2.3.1 manual page 13.
 * * `relinearize`: Empirically measured that relinearization produces no noise. See `relinearization_consumes_no_noise_budget()` in `seal_fhe/tests/assumptions.rs`
 */
pub struct CanonicalEmbeddingNormModel {
    /**
     * The BFV scheme parameters to use for this model.
     */
    pub params: Params,
}

impl CanonicalEmbeddingNormModel {
    /**
     * Create a new noise model with the given parameters.
     *
     * # Remarks
     * Returns [`Error::InvalidParams`] if the given parameters:
     * * contain fewer than 2 coefficient modulus chain values
     * * have a plain modulus < 2
     */
    pub fn new(params: &Params) -> Result<Self> {
        if params.coeff_modulus.is_empty() {
            return Err(Error::InvalidParams);
        }

        if params.plain_modulus < 2 {
            return Err(Error::InvalidParams);
        }

        Ok(Self {
            params: params.clone(),
        })
    }

    /**
     * Compute q from the coefficient modulus chain in the given Params.
     * This excludes the final "special" modulus that SEAL uses.
     */
    pub fn total_q(&self) -> BigUint {
        let val = self
            .params
            .coeff_modulus
            .iter()
            .take(usize::max(self.params.coeff_modulus.len() - 1, 1))
            .fold(BigUint::from(1u64), |sum, x| sum * (*x));

        val
    }

    /**
     * Compute `q mod t`, where q is `total_q(params)` and `t` is the plain
     * modulus.
     */
    pub fn r_t(&self) -> BigUint {
        let q = self.total_q();
        let t = BigUint::from(self.params.plain_modulus);

        q % t
    }
}

impl NoiseModel for CanonicalEmbeddingNormModel {
    fn encrypt(&self) -> f64 {
        let t = self.params.plain_modulus as f64;
        let q = self
            .total_q()
            .to_f64()
            .expect("Failed to convert BigUInt to f64");
        let n = self.params.lattice_dimension as f64;

        let noise = t * (n * (t - 1f64) / 2f64)
            + 2f64 * super::NOISE_STD_DEV * f64::sqrt(12f64 * n * n + 9f64 * n);

        noise / q
    }

    fn add_ct_ct(&self, a_invariant_noise: f64, b_invariant_noise: f64) -> f64 {
        a_invariant_noise + b_invariant_noise
    }

    fn add_ct_pt(&self, ct_invariant_noise: f64) -> f64 {
        let r_t = self
            .r_t()
            .to_f64()
            .expect("Failed to convert BigUInt to f64");

        let q = self
            .total_q()
            .to_f64()
            .expect("Failed to convert BigUInt to f64");

        let pt_noise =
            r_t * self.params.lattice_dimension as f64 * self.params.plain_modulus as f64;

        ct_invariant_noise + pt_noise / q
    }

    fn mul_ct_ct(&self, a_invariant_noise: f64, b_invariant_noise: f64) -> f64 {
        let q = self
            .total_q()
            .to_f64()
            .expect("Failed to convert BigUInt to f64");
        let t = self.params.plain_modulus as f64;
        let n = self.params.lattice_dimension as f64;

        let term_0 = t * f64::sqrt(3. * n + 2. * n * n) * (a_invariant_noise + b_invariant_noise);

        let term_1 = 3. * a_invariant_noise + b_invariant_noise;

        let term_2 = (t / q) * f64::sqrt(3f64 * n + 2f64 * n * n + 4. / 3. * n * n * n);

        term_0 + term_1 + term_2
    }

    fn mul_ct_pt(&self, a_invariant_noise: f64) -> f64 {
        let n = self.params.lattice_dimension as f64;
        let t = self.params.plain_modulus as f64;

        a_invariant_noise * n * (t - 1.)
    }

    fn relinearize(&self, a_invariant_noise: f64) -> f64 {
        a_invariant_noise
    }

    fn output(&self, _output_id: usize, invariant_noise: f64) -> f64 {
        invariant_noise
    }

    fn neg(&self, invariant_noise: f64) -> f64 {
        invariant_noise
    }

    fn sub_ct_ct(&self, a_invariant_noise: f64, b_invariant_noise: f64) -> f64 {
        self.add_ct_ct(a_invariant_noise, b_invariant_noise)
    }

    fn sub_ct_pt(&self, a_invariant_noise: f64) -> f64 {
        self.add_ct_pt(a_invariant_noise)
    }

    fn shift_left(&self, a_invariant_noise: f64, _places: i32) -> f64 {
        // TODO: Make a real heuristic
        a_invariant_noise + noise_budget_to_noise(8.)
    }

    fn shift_right(&self, a_invariant_noise: f64, _places: i32) -> f64 {
        // TODO: Make a real heuristic
        a_invariant_noise + noise_budget_to_noise(8.)
    }

    fn swap_rows(&self, a_invariant_noise: f64) -> f64 {
        // TODO: Make a real heuristic
        a_invariant_noise + noise_budget_to_noise(8.)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use seal_fhe::*;

    fn setup_scheme(lattice_dimension: u64, plain_modulus: u64) -> (Context, Params) {
        let params = BfvEncryptionParametersBuilder::new()
            .set_plain_modulus_u64(plain_modulus)
            .set_poly_modulus_degree(lattice_dimension)
            .set_coefficient_modulus(
                CoefficientModulus::bfv_default(lattice_dimension, SecurityLevel::TC128).unwrap(),
            )
            .build()
            .unwrap();

        let params_ret = Params {
            lattice_dimension: params.get_poly_modulus_degree(),
            plain_modulus: params.get_plain_modulus().value(),
            coeff_modulus: params
                .get_coefficient_modulus()
                .iter()
                .map(|x| x.value())
                .collect(),
            scheme_type: sunscreen_fhe_program::SchemeType::Bfv,
            security_level: SecurityLevel::TC128,
        };

        let ctx = Context::new(&params, false, SecurityLevel::TC128).unwrap();

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

                let noise_model = CanonicalEmbeddingNormModel::new(&params).unwrap();

                let modeled_noise = noise_model.encrypt();
                let modeled_noise_budget =
                    crate::noise_model::noise_to_noise_budget(modeled_noise) as u32;

                assert_eq!(modeled_noise_budget < measured_noise_budget, true);
            }
        }
    }

    #[test]
    fn addition_bound_exceeds_measured() {
        for d in [2048, 4096, 8192, 16384] {
            for p in [100, 1000, 10000, 10000] {
                let (ctx, params) = setup_scheme(d, p);

                let keygen = KeyGenerator::new(&ctx).unwrap();
                let public_key = keygen.create_public_key();
                let private_key = keygen.secret_key();
                let encryptor = Encryptor::with_public_key(&ctx, &public_key).unwrap();
                let decryptor = Decryptor::new(&ctx, &private_key).unwrap();
                let evalulator = BFVEvaluator::new(&ctx).unwrap();

                let mut pt = Plaintext::new().unwrap();
                pt.resize(d as usize);

                for i in 0..d {
                    pt.set_coefficient(i as usize, p - 1);
                }

                let ct_0 = encryptor.encrypt(&pt).unwrap();
                let ct_1 = encryptor.encrypt(&pt).unwrap();

                let s = evalulator.add(&ct_0, &ct_1).unwrap();

                let measured_noise_budget = decryptor.invariant_noise_budget(&s).unwrap();

                let noise_model = CanonicalEmbeddingNormModel::new(&params).unwrap();

                let ct_0_noise = noise_model.encrypt();
                let ct_1_noise = noise_model.encrypt();
                let s_noise = noise_model.add_ct_ct(ct_0_noise, ct_1_noise);

                let modeled_noise_budget =
                    crate::noise_model::noise_to_noise_budget(s_noise) as u32;

                assert_eq!(modeled_noise_budget < measured_noise_budget, true);
            }
        }
    }

    #[test]
    fn addition_pt_bound_exceeds_measured() {
        for d in [2048, 4096, 8192, 16384] {
            for p in [100, 1000, 10000, 10000] {
                let (ctx, params) = setup_scheme(d, p);

                let keygen = KeyGenerator::new(&ctx).unwrap();
                let public_key = keygen.create_public_key();
                let private_key = keygen.secret_key();
                let encryptor = Encryptor::with_public_key(&ctx, &public_key).unwrap();
                let decryptor = Decryptor::new(&ctx, &private_key).unwrap();
                let evalulator = BFVEvaluator::new(&ctx).unwrap();

                let mut pt = Plaintext::new().unwrap();
                pt.resize(d as usize);

                for i in 0..d {
                    pt.set_coefficient(i as usize, p - 1);
                }

                let ct_0 = encryptor.encrypt(&pt).unwrap();

                let s = evalulator.add_plain(&ct_0, &pt).unwrap();

                let measured_noise_budget = decryptor.invariant_noise_budget(&s).unwrap();

                let noise_model = CanonicalEmbeddingNormModel::new(&params).unwrap();

                let ct_0_noise = noise_model.encrypt();
                let s_noise = noise_model.add_ct_pt(ct_0_noise);

                let modeled_noise_budget =
                    crate::noise_model::noise_to_noise_budget(s_noise) as u32;

                assert_eq!(modeled_noise_budget < measured_noise_budget, true);
            }
        }
    }

    #[test]
    fn multiply_bound_exceeds_measured() {
        for d in [4096, 8192, 16384] {
            for p in [100, 1000, 10000, 10000] {
                let (ctx, params) = setup_scheme(d, p);

                let keygen = KeyGenerator::new(&ctx).unwrap();
                let public_key = keygen.create_public_key();
                let private_key = keygen.secret_key();
                let encryptor = Encryptor::with_public_key(&ctx, &public_key).unwrap();
                let decryptor = Decryptor::new(&ctx, &private_key).unwrap();
                let evalulator = BFVEvaluator::new(&ctx).unwrap();

                let mut pt = Plaintext::new().unwrap();
                pt.resize(d as usize);

                for i in 0..d {
                    pt.set_coefficient(i as usize, p - 1);
                }

                let ct_0 = encryptor.encrypt(&pt).unwrap();
                let ct_1 = encryptor.encrypt(&pt).unwrap();

                let pre_multiply_noise_budget = u32::min(
                    decryptor.invariant_noise_budget(&ct_0).unwrap(),
                    decryptor.invariant_noise_budget(&ct_1).unwrap(),
                );

                let s = evalulator.multiply(&ct_0, &ct_1).unwrap();

                let measured_noise_budget = decryptor.invariant_noise_budget(&s).unwrap();

                let noise_model = CanonicalEmbeddingNormModel::new(&params).unwrap();

                let ct_0_noise = noise_model.encrypt();
                let ct_1_noise = noise_model.encrypt();
                let s_noise = noise_model.mul_ct_ct(ct_0_noise, ct_1_noise);

                let pre_multiply_modeled_noise =
                    crate::noise_model::noise_to_noise_budget(ct_0_noise) as u32;
                let post_multiply_modeled_noise =
                    crate::noise_model::noise_to_noise_budget(s_noise) as u32;

                let actual_noise = pre_multiply_noise_budget
                    .checked_sub(measured_noise_budget)
                    .unwrap();

                let modeled_noise = pre_multiply_modeled_noise
                    .checked_sub(post_multiply_modeled_noise)
                    .unwrap();

                assert_eq!(modeled_noise > actual_noise, true);
            }
        }
    }

    #[test]
    fn multiply_pt_bound_exceeds_measured() {
        for d in [4096, 8192, 16384] {
            for p in [100, 1000, 10000, 10000] {
                let (ctx, params) = setup_scheme(d, p);

                let keygen = KeyGenerator::new(&ctx).unwrap();
                let public_key = keygen.create_public_key();
                let private_key = keygen.secret_key();
                let encryptor = Encryptor::with_public_key(&ctx, &public_key).unwrap();
                let decryptor = Decryptor::new(&ctx, &private_key).unwrap();
                let evalulator = BFVEvaluator::new(&ctx).unwrap();

                let mut pt = Plaintext::new().unwrap();
                pt.resize(d as usize);

                for i in 0..d {
                    pt.set_coefficient(i as usize, p - 1);
                }

                let ct_0 = encryptor.encrypt(&pt).unwrap();

                let pre_multiply_noise_budget = decryptor.invariant_noise_budget(&ct_0).unwrap();

                let s = evalulator.multiply_plain(&ct_0, &pt).unwrap();

                let measured_noise_budget = decryptor.invariant_noise_budget(&s).unwrap();

                let noise_model = CanonicalEmbeddingNormModel::new(&params).unwrap();

                let ct_0_noise = noise_model.encrypt();
                let s_noise = noise_model.mul_ct_pt(ct_0_noise);

                let pre_multiply_modeled_noise =
                    crate::noise_model::noise_to_noise_budget(ct_0_noise) as u32;

                let post_multiply_modeled_noise =
                    crate::noise_model::noise_to_noise_budget(s_noise) as u32;

                let modeled_noise = pre_multiply_modeled_noise
                    .checked_sub(post_multiply_modeled_noise)
                    .unwrap();

                let actual_noise = pre_multiply_noise_budget
                    .checked_sub(measured_noise_budget)
                    .unwrap();

                assert_eq!(modeled_noise > actual_noise, true);
            }
        }
    }
}
