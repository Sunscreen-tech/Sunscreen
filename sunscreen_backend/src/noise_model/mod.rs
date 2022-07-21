use sunscreen_fhe_program::FheProgram;
use sunscreen_runtime::Params;

mod canonical_embedding_norm;
mod measured_model;
pub use canonical_embedding_norm::*;
pub use measured_model::*;

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

/**
 * Returns the predicted noise levels in output ciphertexts for the
 * given [`FheProgram`].
 */
pub fn predict_noise(
    _model: Box<dyn NoiseModel>,
    _params: &Params,
    _fhe_program: &FheProgram,
) -> Vec<f64> {
    vec![]
}

/**
 * Calculates the invariant noise budget from the given invariant
 * noise.
 *
 * # Remarks
 * Returns $-log_2(2 * |v|) = log_2(q) - log_2(q * |v|) - 1$, where
 * $|v|$ is the invariant noise and $q$ is the total coefficient
 * modulus.
 *
 * When `invariant_noise` is between [0, 0.5), the ciphertext should
 * still decrypt.
 */
pub fn noise_to_noise_budget(invariant_noise: f64) -> f64 {
    -f64::log2(2. * invariant_noise)
}

/**
 * Calculates the invariant noise from the given invariant
 * noise budget.
 *
 */
pub fn noise_budget_to_noise(invariant_noise_budget: f64) -> f64 {
    f64::powf(2., -invariant_noise_budget) / 2.
}

/**
 * A model for predicting noise growth in an FHE program.
 */
pub trait NoiseModel {
    /**
     * Predict the amount of noise in a freshly encrypted ciphertext.
     */
    fn encrypt(&self) -> f64;

    /**
     * Predict the amount of noise after adding 2 ciphertexts.
     */
    fn add_ct_ct(&self, a_invariant_noise: f64, b_invariant_noise: f64) -> f64;

    /**
     * Predict the amount of noise after adding a ciphertext and a plaintext.
     */
    fn add_ct_pt(&self, ct_invariant_noise: f64) -> f64;

    /**
     * Predict the amount of noise after multiplying 2 ciphertexts.
     */
    fn mul_ct_ct(&self, a_invariant_noise: f64, b_invariant_noise: f64) -> f64;

    /**
     * Predict the amount of noise after multiplying a ciphertext and a
     * plaintext.
     */
    fn mul_ct_pt(&self, a_invariant_noise: f64) -> f64;

    /**
     * Predict the amount of noise after a relinearization.
     */
    fn relinearize(&self, a_invariant_noise: f64) -> f64;

    /**
     * Predict the amount of noise for the given output's index.
     *
     * # Remarks
     * For purely predictive models, this function should just return the
     * input `invariant_noise`. For empirical models that run
     * the FHE program, this allows the model to lookup the noise by
     * output id.
     */
    fn output(&self, output_id: usize, invariant_noise: f64) -> f64;
}
