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

/// Returns the LWE standard deviation for a given dimension and security level.
/// Valid from 368 to 1024 dimensions and 80 to 128 bits of security.
/// This approximation has an error of 0.031% +- 0.022%, max error 0.15%.
/// Simulation data used for fit from
/// lattice-estimator commit 25f9e88 (Nov 8th 2023).
/// <https://github.com/malb/lattice-estimator>
pub fn lwe_std_for_security_level(dimension: usize, security_level: f64) -> f64 {
    if !(368..=1024).contains(&dimension) {
        warn!(
            "Dimension {} is outside of the well behaved \
            range of 368 to 1024 for the LWE standard deviation \
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
            -4.44906580e-01,
            1.35331883e-02,
            -4.65040418e-05,
            1.13978498e-07,
        ],
        [
            -3.75257133e-02,
            5.70806504e-04,
            -3.89131291e-06,
            9.61541259e-09,
        ],
        [
            -1.30018919e-06,
            1.30345541e-08,
            -8.00575696e-12,
            0.00000000e+00,
        ],
        [
            4.04856008e-10,
            -4.02068919e-12,
            0.00000000e+00,
            0.00000000e+00,
        ],
    ];

    let log_std = evaluate_polynomial_2d(&coeffs, dimension as f64, security_level);

    10.0f64.powf(log_std)
}
