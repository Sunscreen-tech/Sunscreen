use log::warn;
use statrs::distribution::{ContinuousCDF, Normal};

/// Evaluate a polynomial with coefficients in increasing order of degree.
fn evaluate_polynomial(coeffs: &[f64], x: f64) -> f64 {
    let mut result = 0.0;

    for (i, c) in coeffs.iter().enumerate() {
        result += c * x.powi(i as i32);
    }

    result
}

/// Evaluate a 2D polynomial with coefficients in increasing order of degree
/// along both dimensions.
pub fn evaluate_polynomial_2d<const M: usize, const N: usize>(
    coeffs: &[[f64; N]; M],
    x: f64,
    y: f64,
) -> f64 {
    let mut result = 0.0;

    // Clippy comaplins but this is the simplest way to read this loop.
    #[allow(clippy::needless_range_loop)]
    for i in 0..M {
        for j in 0..N {
            result += coeffs[i][j] * x.powi(i as i32) * y.powi(j as i32);
        }
    }

    result
}

// Exact probability of being farther than x away from the mean given a standard
// deviation that works when the ratio of x to the standard deviation is below
// 7.
fn probability_away_from_mean_gaussian_low(x: f64, std: f64) -> f64 {
    let normal = Normal::new(0.0, 1.0).unwrap();

    let single_tail_area = 1.0 - normal.cdf(x / std);
    let both_tail_area = 2.0 * single_tail_area;

    both_tail_area.log10()
}

// Very low error approximation when the ratio of how far x is from the mean
// given the standard deviation is above 7. Works up to a ratio of 30
// (probability of 1e-197), afterwards it may diverge from the real value.
fn probability_away_from_mean_gaussian_high(x: f64, std: f64) -> f64 {
    let ratio = x / std;

    if ratio > 30.0 {
        warn!("Ratio too high for approximation, not validated for this region");
    }

    // Quintic interpolation works nicely (a maximum of 0.00145% error). Listed
    // with highest order first.
    let coeffs = [
        -0.31904236601958913,
        -0.13390834324063405,
        -0.20902566462352498,
        -0.0003178660849038345,
        6.75504783552659e-06,
        -5.91907446763691e-08,
    ];

    evaluate_polynomial(&coeffs, ratio)
}

/**
 * Returns the log10 of the probability of being farther than x away from the
 * mean given a standard deviation. We return the log to handle very low
 * probabilities.
 *
 * # Arguments
 *
 * * `x` - The distance from the mean.
 * * `std` - The standard deviation.
 *
 * # Returns
 * The log10 of the probability of being x away from the mean given a standard
 * deviation.
 *
 * # Examples
 * ```
 * use sunscreen_math::security::probability_away_from_mean_gaussian;
 *
 * // Probability of being 1 standard deviation away from the mean. Should be
 * // approximately 32%. If you know z-scores then this should be familiar.
 * let log_prob = probability_away_from_mean_gaussian(1.0, 1.0);
 * let prob = 10.0f64.powf(log_prob);
 * let rounded_prob = (prob * 10000.0).round() / 10000.0;
 * assert_eq!(rounded_prob, 0.3173);
 */
pub fn probability_away_from_mean_gaussian(x: f64, std: f64) -> f64 {
    if x / std < 7.0 {
        probability_away_from_mean_gaussian_low(x, std)
    } else {
        probability_away_from_mean_gaussian_high(x, std)
    }
}

/**
 * Returns the LWE standard deviation for a given dimension and security level,
 * normalized to the ciphertext modulus (although calculated with 2^64 as the
 * modulus). Valid from 368 to 2048 dimensions and 80 to 128 bits of security.
 *
 * The fit is most accurate in the region of 368 to 1024, while anything above
 * 1024 is approximated over a sparse set of inputs. Testing has indicated that
 * interpolated over the sparser fit data above 1024 matches quite well, but
 * this has not been robustly tested.
 *
 * Some high dimensions will return a standard deviation below 1/modulus, which
 * is problematic because potentially no random discrete numbers besides 0 would
 * be sampled. You should check if the returned standard deviation is too low
 * for your dimension and the modulus in case it was too low to generate any
 * random numbers. For example, at dimension 2048 the effective lowest security
 * is 102.2 bits for a modulus of 2^64.
 *
 * This approximation has an error of 0.032% +- 0.024%, max error 0.17%.
 * Simulation data used for fit from
 * lattice-estimator commit 25f9e88 (Nov 8th 2023).
 * <https://github.com/malb/lattice-estimator>
 */
pub fn lwe_std_for_security_level(dimension: usize, security_level: f64) -> f64 {
    if !(368..=2048).contains(&dimension) {
        warn!(
            "Dimension {} is outside of the well behaved \
            range of 368 to 2048 for the LWE standard deviation \
            to security level conversion",
            dimension
        );
    }

    if !(80.0..=128.0).contains(&security_level) {
        warn!(
            "Security level {} is outside of the well behaved \
            range of 80 to 128 bits for the LWE standard deviation \
            to security level conversion",
            security_level
        );
    }

    let coeffs = [
        [
            -7.62764572e-01,
            2.50356801e-02,
            -1.68801365e-04,
            5.03161614e-07,
        ],
        [
            -3.73831468e-02,
            5.56885396e-04,
            -3.70805717e-06,
            9.04035707e-09,
        ],
        [
            -5.86726042e-07,
            6.11446398e-09,
            -1.14293199e-11,
            0.00000000e+00,
        ],
        [
            6.43204217e-11,
            -5.54856202e-13,
            0.00000000e+00,
            0.00000000e+00,
        ],
    ];

    let log_std = evaluate_polynomial_2d(&coeffs, dimension as f64, security_level);

    10.0f64.powf(log_std)
}
