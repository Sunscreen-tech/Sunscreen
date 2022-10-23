use crossbeam::atomic::AtomicCell;
use sunscreen_fhe_program::{traversal::*, FheProgram, Literal, Operation::*};
use sunscreen_runtime::traverse;

use std::collections::HashMap;

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
 *
 * # Panic
 * Panics if the FHE program is not well formed. You should call
 * validate before using this function to ascertain this.
 */
pub fn predict_noise(model: &(dyn NoiseModel + Sync), fhe_program: &FheProgram) -> Vec<f64> {
    let mut noise_levels: Vec<AtomicCell<f64>> = Vec::with_capacity(fhe_program.graph.node_count());

    for _ in 0..fhe_program.graph.node_count() {
        noise_levels.push(AtomicCell::new(0.));
    }

    let node_id_to_output_id = fhe_program
        .graph
        .node_indices()
        .filter_map(|id| match fhe_program.graph[id].operation {
            OutputCiphertext => Some(id.index()),
            _ => None,
        })
        .enumerate()
        .map(|(output_num, node_id)| (node_id, output_num))
        .collect::<HashMap<usize, usize>>();

    traverse(
        fhe_program,
        |node_id| {
            let node = &fhe_program.graph[node_id];

            let noise = match &node.operation {
                InputCiphertext(_) => model.encrypt(),
                InputPlaintext(_) => 0.0,
                Add => {
                    let (left, right) = get_left_right_operands(fhe_program, node_id);

                    model.add_ct_ct(
                        noise_levels[left.index()].load(),
                        noise_levels[right.index()].load(),
                    )
                }
                AddPlaintext => {
                    let (left, _) = get_left_right_operands(fhe_program, node_id);

                    model.add_ct_pt(noise_levels[left.index()].load())
                }
                Multiply => {
                    let (left, right) = get_left_right_operands(fhe_program, node_id);

                    model.mul_ct_ct(
                        noise_levels[left.index()].load(),
                        noise_levels[right.index()].load(),
                    )
                }
                MultiplyPlaintext => {
                    let (left, _) = get_left_right_operands(fhe_program, node_id);

                    model.mul_ct_pt(noise_levels[left.index()].load())
                }
                Relinearize => {
                    let x = get_unary_operand(fhe_program, node_id);

                    model.relinearize(noise_levels[x.index()].load())
                }
                Negate => {
                    let x = get_unary_operand(fhe_program, node_id);

                    model.neg(noise_levels[x.index()].load())
                }
                Sub => {
                    let (left, right) = get_left_right_operands(fhe_program, node_id);

                    model.sub_ct_ct(
                        noise_levels[left.index()].load(),
                        noise_levels[right.index()].load(),
                    )
                }
                SubPlaintext => {
                    let (left, _) = get_left_right_operands(fhe_program, node_id);

                    model.sub_ct_pt(noise_levels[left.index()].load())
                }
                OutputCiphertext => {
                    let x = get_unary_operand(fhe_program, node_id);
                    let output_id = node_id_to_output_id[&node_id.index()];

                    model.output(output_id, noise_levels[x.index()].load())
                }
                Literal(_) => 0.0,
                ShiftLeft => {
                    let (left, right) = get_left_right_operands(fhe_program, node_id);

                    let b = match fhe_program.graph[right].operation {
                        Literal(Literal::U64(v)) => v as i32,
                        _ => panic!(
                            "Illegal right operand for ShiftLeft: {:#?}",
                            fhe_program.graph[right].operation
                        ),
                    };

                    model.shift_left(noise_levels[left.index()].load(), b)
                }
                ShiftRight => {
                    let (left, right) = get_left_right_operands(fhe_program, node_id);

                    let b = match fhe_program.graph[right].operation {
                        Literal(Literal::U64(v)) => v as i32,
                        _ => panic!(
                            "Illegal right operand for ShiftLeft: {:#?}",
                            fhe_program.graph[right].operation
                        ),
                    };

                    model.shift_right(noise_levels[left.index()].load(), b)
                }
                SwapRows => {
                    let x = get_unary_operand(fhe_program, node_id);

                    model.swap_rows(noise_levels[x.index()].load())
                }
            };

            noise_levels[node_id.index()].store(noise);

            Ok(())
        },
        None,
    )
    .unwrap(); // No errors returned, so unwrap is safe.

    noise_levels
        .iter()
        .zip(fhe_program.graph.node_indices())
        .filter_map(|(x, node_id)| match fhe_program.graph[node_id].operation {
            OutputCiphertext => Some(x.load()),
            _ => None,
        })
        .collect()
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

    /**
     * Predict the amount of noise after negation.
     */
    fn neg(&self, invariant_noise: f64) -> f64;

    /**
     * Predict the amount of noise after subtraction.
     */
    fn sub_ct_ct(&self, a_invariant_noise: f64, b_invariant_noise: f64) -> f64;

    /**
     * Predict the amount of noise after subtraction.
     */
    fn sub_ct_pt(&self, a_invariant_noise: f64) -> f64;

    /**
     * Predict the amount of noise after a row swap.
     */
    fn swap_rows(&self, a_invariant_noise: f64) -> f64;

    /**
     * Predict the amount of noise after a row swap.
     */
    fn shift_left(&self, a_invariant_noise: f64, places: i32) -> f64;

    /**
     * Predict the amount of noise after a row swap.
     */
    fn shift_right(&self, a_invariant_noise: f64, places: i32) -> f64;
}

#[test]
fn can_roundtrip_noise_to_budget() {
    let noise_budget = 42.;

    let noise = noise_budget_to_noise(noise_budget);
    let new_budget = noise_to_noise_budget(noise);

    assert_eq!(new_budget, noise_budget);
}
