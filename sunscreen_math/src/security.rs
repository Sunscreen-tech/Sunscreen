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

/// Returns the log10 of the probability of being farther than x away from the
/// mean given a standard deviation. We return the log to handle very low
/// probabilities.
///
/// # Arguments
///
/// * `x` - The distance from the mean.
/// * `std` - The standard deviation.
///
/// # Returns
/// The log10 of the probability of being x away from the mean given a standard
/// deviation.
///
/// # Examples
/// ```
/// use sunscreen_math::security::probability_away_from_mean_gaussian;
///
/// // Probability of being 1 standard deviation away from the mean. Should be
/// // approximately 32%. If you know z-scores then this should be familiar.
/// let log_prob = probability_away_from_mean_gaussian(1.0, 1.0);
/// let prob = 10.0f64.powf(log_prob);
/// let rounded_prob = (prob * 10000.0).round() / 10000.0;
/// assert_eq!(rounded_prob, 0.3173);
/// ```
pub fn probability_away_from_mean_gaussian(x: f64, std: f64) -> f64 {
    if x / std < 7.0 {
        probability_away_from_mean_gaussian_low(x, std)
    } else {
        probability_away_from_mean_gaussian_high(x, std)
    }
}

/// Returns the LWE standard deviation for a given dimension and security level,
/// normalized to the ciphertext modulus (calculated with 2^64 as the modulus).
/// Valid from 368 to 2048 dimensions and 78 to 130 bits of security.
///
/// The fit is most accurate in the region of 368 to 1024, while anything above
/// 1024 is approximated over a sparse set of inputs. Testing has indicated that
/// interpolated over the sparser fit data above 1024 matches quite well, but
/// this has not been robustly tested.
///
/// Some high dimensions will return a standard deviation below 1/modulus, which
/// is problematic because potentially no random discrete numbers besides 0 would
/// be sampled. You should check if the returned standard deviation is too low
/// for your dimension and the modulus in case it was too low to generate any
/// random numbers. For example, at dimension 2048 the effective lowest security
/// is 102.2 bits for a modulus of 2^64.
///
/// This approximation has an error of 0.032% +- 0.024%, max error 0.17%.
/// Simulation data used for fit from
/// lattice-estimator commit 25f9e88 (Nov 8th 2023).
/// <https://github.com/malb/lattice-estimator>
pub fn lwe_security_level_to_std(dimension: usize, security_level: f64) -> f64 {
    if !(368..=2048).contains(&dimension) {
        warn!(
            "Dimension {} is outside of the well behaved \
            range of 368 to 2048 for the LWE standard deviation \
            to security level conversion",
            dimension
        );
    }

    if !(78.0..=130.0).contains(&security_level) {
        warn!(
            "Security level {} is outside of the well behaved \
            range of 78 to 130 bits for the LWE standard deviation \
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

/// The result of the standard deviation to security level conversion.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum SecurityLevelResults {
    /// The standard deviation input is within the well-behaved range, and hence
    /// we can calculate the security level.
    Level(f64),

    /// The standard deviation input is below the well-behaved range.
    BelowStandardDeviationBound,

    /// The standard deviation input is above the well-behaved range.
    AboveStandardDeviationBound,
}

/// Returns the LWE security level for a given dimension and standard deviation,
/// normalized to the ciphertext modulus (calculated with 2^64 as the modulus).
/// Valid from 368 to 2048 dimensions and 78 to 130 bits of security.
///
/// The fit is most accurate in the region of 368 to 1024, while anything above
/// 1024 is approximated over a sparse set of inputs. Testing has indicated that
/// interpolated over the sparser fit data above 1024 matches quite well, but
/// this has not been robustly tested.
///
/// This approximation has an error of 0.030% +- 0.027%, max error 0.237% up to
/// 1024 dimensions. Above 1024 dimensions the error is higher due to the
/// sparser fit data, up to 4 bits of discrepancy.
///
/// Simulation data used for fit from
/// lattice-estimator commit 25f9e88 (Nov 8th 2023).
/// <https://github.com/malb/lattice-estimator>
pub fn lwe_std_to_security_level(dimension: usize, std: f64) -> SecurityLevelResults {
    if !(368..=2048).contains(&dimension) {
        warn!(
            "Dimension {} is outside of the well behaved \
            range of 368 to 2048 for the LWE standard deviation \
            to security level conversion",
            dimension
        );
    }

    let log_std = std.log10();

    // The original approximation was done on a modulus of 2^64, so any value
    // below 2^-64 cannot be calculated properly as no random numbers can be
    // generated in the simulation that produced this fit.
    let absolute_lower_bound = 2.0f64.powi(-64).log10();

    if log_std < absolute_lower_bound {
        return SecurityLevelResults::BelowStandardDeviationBound;
    }

    let low_bound_check = evaluate_polynomial(
        &[0.4684078248019203, -0.012433416778389538],
        dimension as f64,
    );
    let high_bound_check = evaluate_polynomial(
        &[0.7428966000870061, -0.007783548255438252],
        dimension as f64,
    );

    if log_std < low_bound_check {
        return SecurityLevelResults::BelowStandardDeviationBound;
    }

    if log_std > high_bound_check {
        return SecurityLevelResults::AboveStandardDeviationBound;
    }

    let coeffs = [
        [
            7.15195109e+01,
            4.54730939e+01,
            1.49843216e+01,
            1.95312316e+00,
            7.93110773e-02,
        ],
        [
            5.14361091e-01,
            1.75904243e-01,
            1.36623125e-02,
            -1.16877608e-03,
            -1.03232507e-04,
        ],
        [
            1.86929626e-04,
            -1.17102619e-04,
            -2.75236481e-05,
            -8.12027694e-07,
            3.57735664e-08,
        ],
        [
            -5.32306964e-07,
            -5.43087594e-08,
            6.98712160e-09,
            5.78164454e-10,
            0.00000000e+00,
        ],
        [
            2.28281489e-10,
            4.76124667e-11,
            2.20783430e-12,
            0.00000000e+00,
            0.00000000e+00,
        ],
    ];

    SecurityLevelResults::Level(evaluate_polynomial_2d(&coeffs, dimension as f64, log_std))
}

#[cfg(test)]
mod tests {
    use super::{lwe_security_level_to_std, lwe_std_to_security_level};

    #[test]
    fn lwe_security_to_std_and_back() {
        // This is too high due to the lack of samples in the higher dimensions.
        // At some point the simulator needs to be rerun to better sample the
        // region above 1024.
        let tolerance = 4.0;

        for dimension in 368..=2048 {
            for security_level in 80..=128 {
                let std = lwe_security_level_to_std(dimension, security_level as f64);
                let recovered_security_level = lwe_std_to_security_level(dimension, std);

                match recovered_security_level {
                    super::SecurityLevelResults::Level(recovered_level) => {
                        let diff = (recovered_level - security_level as f64).abs();
                        assert!(
                            diff < tolerance,
                            "Security level tolerance violated. Dimension: {}, std: {}, security_level: {}, recovered_level: {}",
                            dimension,
                            std,
                            security_level,
                            recovered_level
                        );
                    }
                    e => {
                        if std < 2.0f64.powi(-64) {
                            continue;
                        }
                        panic!("Failed to recover security level: {:?}", e);
                    }
                }
            }
        }
    }
}
