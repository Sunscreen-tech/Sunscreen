use log::warn;
use statrs::distribution::{ContinuousCDF, Normal};

use crate::geometry::{ConvexPolytope2D, HalfSpace2D, Point2D};

/// Error for when a value is outside the constraints of a polytope.
#[derive(Debug)]
pub struct OutsideConstraintsError {
    /// The name of the dimensions that were outside the constraints.
    dimensions: [String; 2],

    /// The value that was outside the constraints.
    value: (f64, f64),

    /// The polytope it was supposed to be in.
    polytope: ConvexPolytope2D,
}

impl OutsideConstraintsError {
    /// The name of the dimensions that were outside the constraints.
    pub fn dimensions(&self) -> &[String; 2] {
        &self.dimensions
    }

    /// The value that was outside the constraints.
    pub fn value(&self) -> (f64, f64) {
        self.value
    }

    /// The polytope it was supposed to be in.
    pub fn polytope(&self) -> &ConvexPolytope2D {
        &self.polytope
    }
}

impl std::fmt::Display for OutsideConstraintsError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Value {:?} is outside the constraints of polytope {:?}",
            self.value, self.polytope
        )
    }
}

/// Result type for [`lwe_security_level_to_std`].
pub type StandardDeviationResult = Result<f64, OutsideConstraintsError>;

/// Result type for [`lwe_std_to_security_level`].
pub type SecurityLevelResult = Result<f64, OutsideConstraintsError>;

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
/// Valid from 368 to 2048 dimensions and 78 to 130 bits of security. Assumes
/// that the private key is binary.
///
/// There are constraints on the input space above 1472 dimensions, where the
/// security level at the smallest amount of noise possible is higher than 78
/// bits.
///
/// This approximation has an error of 0.021% +- 0.014%, max error 0.11%.
///
/// Simulation data used for fit from
/// lattice-estimator commit 25f9e88 (Nov 8th 2023).
/// <https://github.com/malb/lattice-estimator>
pub fn lwe_security_level_to_std(dimension: usize, security_level: f64) -> StandardDeviationResult {
    let security_polytope = ConvexPolytope2D {
        half_spaces: vec![
            HalfSpace2D::new((-1.0, 0.0), -368.0),
            HalfSpace2D::new((1.0, 0.0), 2048.0),
            HalfSpace2D::new((0.0, -1.0), -78.0),
            HalfSpace2D::new((0.0, 1.0), 130.0),
            // Above 1472 dimensions the security level at the smallest amount of
            // noise possible is higher than 78 bits.
            HalfSpace2D::new((0.05678074392712544, -1.0), 3.5151045883938177),
        ],
    };

    if !security_polytope.inside(Point2D::new(dimension as f64, security_level)) {
        return Err(OutsideConstraintsError {
            dimensions: ["dimension".to_string(), "security_level".to_string()],
            value: (dimension as f64, security_level),
            polytope: security_polytope,
        });
    }

    let coeffs = [
        [
            2.89630547e+00,
            -1.26321873e-01,
            2.13993467e-03,
            -1.49515549e-05,
            3.84468453e-08,
        ],
        [
            -5.60568533e-02,
            1.33311189e-03,
            -1.56200244e-05,
            8.93067686e-08,
            -2.00996854e-10,
        ],
        [
            7.39088707e-07,
            -9.61269520e-08,
            2.15766569e-09,
            -1.82462028e-11,
            5.45243818e-14,
        ],
        [
            1.49456164e-09,
            -4.28264022e-11,
            4.30538855e-13,
            -1.50621118e-15,
            0.00000000e+00,
        ],
        [
            9.49334890e-14,
            -2.17539853e-15,
            1.22195316e-17,
            0.00000000e+00,
            0.00000000e+00,
        ],
    ];

    let log_std = evaluate_polynomial_2d(&coeffs, dimension as f64, security_level);

    Ok(10.0f64.powf(log_std))
}

/// Returns the LWE security level for a given dimension and standard deviation,
/// normalized to the ciphertext modulus (calculated with 2^64 as the modulus).
/// Valid from 368 to 2048 dimensions and 78 to 130 bits of security. Assumes
/// that the private key is binary.
///
/// The valid standard deviations are functions of the dimension, and hence not
/// all standard deviations are valid for all dimensions. If a standard
/// deviation is not valid for a given dimension, an error is returned defining
/// the valid region of standard deviations.
///
/// This approximation has an error of 0.019% +- 0.014%, max error 0.11%.
///
/// Simulation data used for fit from
/// lattice-estimator commit 25f9e88 (Nov 8th 2023).
/// <https://github.com/malb/lattice-estimator>
pub fn lwe_std_to_security_level(dimension: usize, std: f64) -> SecurityLevelResult {
    let log_std = std.log10();

    let std_polytope = ConvexPolytope2D {
        half_spaces: vec![
            HalfSpace2D::new((-1.0, 0.0), -386.0),
            HalfSpace2D::new((1.0, 0.0), 2048.0),
            // Half spaces to define the general region where the standard deviation is valid.
            HalfSpace2D::new((-0.012501482876757172, -1.0), -0.5040411014606384),
            HalfSpace2D::new((0.0077927720025765665, 1.0), 0.7390928205510939),
            // Minimum bound on the standard deviation
            HalfSpace2D::new((0.0, -1.0), 17.67),
        ],
    };

    if !std_polytope.inside(Point2D::new(dimension as f64, log_std)) {
        return Err(OutsideConstraintsError {
            dimensions: ["dimension".to_string(), "log_std".to_string()],
            value: (dimension as f64, log_std),
            polytope: std_polytope,
        });
    }

    let coeffs = [
        [
            6.90381015e+01,
            5.02853460e+01,
            1.94568148e+01,
            4.20275108e+00,
            5.70115313e-01,
            3.84445029e-02,
            1.01123781e-03,
        ],
        [
            5.74446364e-01,
            2.16090358e-01,
            4.33027422e-02,
            5.96469779e-03,
            3.47705471e-05,
            -3.75600129e-05,
            -1.73396859e-06,
        ],
        [
            1.38947894e-04,
            -1.97798175e-06,
            6.18022031e-06,
            -8.44553282e-06,
            -9.87061302e-07,
            -1.98799589e-08,
            7.73239565e-10,
        ],
        [
            -1.76700147e-07,
            4.46397961e-08,
            -8.48859329e-08,
            -6.50906497e-09,
            2.29684491e-10,
            2.23006735e-11,
            0.00000000e+00,
        ],
        [
            2.73798876e-10,
            -4.27647020e-10,
            -1.56129840e-12,
            5.18444880e-12,
            2.50320308e-13,
            0.00000000e+00,
            0.00000000e+00,
        ],
        [
            -9.58735744e-13,
            1.71390444e-13,
            3.36603110e-14,
            1.30767385e-15,
            0.00000000e+00,
            0.00000000e+00,
            0.00000000e+00,
        ],
        [
            5.98968287e-16,
            7.74296283e-17,
            2.66615159e-18,
            0.00000000e+00,
            0.00000000e+00,
            0.00000000e+00,
            0.00000000e+00,
        ],
    ];

    Ok(evaluate_polynomial_2d(&coeffs, dimension as f64, log_std))
}

#[cfg(test)]
mod tests {
    use super::{lwe_security_level_to_std, lwe_std_to_security_level};

    #[test]
    fn lwe_security_to_std_and_back() {
        let tolerance = 0.05;

        for dimension in 368..=2048 {
            for security_level in 80..=128 {
                let std = if let Ok(value) =
                    lwe_security_level_to_std(dimension, security_level as f64)
                {
                    value
                } else {
                    continue;
                };

                let recovered_security_level =
                    if let Ok(value) = lwe_std_to_security_level(dimension, std) {
                        value
                    } else {
                        continue;
                    };

                let diff = (recovered_security_level - security_level as f64).abs();
                assert!(
                            diff < tolerance,
                            "Security level tolerance violated. Dimension: {}, std: {}, security_level: {}, recovered_level: {}",
                            dimension,
                            std,
                            security_level,
                            recovered_security_level
                        );
            }
        }
    }
}
