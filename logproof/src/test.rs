/**
 * Types and functions for testing logproof setups. Not meant to be used in
 * production, only for testing.
 */
use ark_ff::{BigInt, Field, Fp, MontBackend, MontConfig};
use ark_poly::univariate::DensePolynomial;
use seal_fhe::{Modulus, PolynomialArray};

use crate::{linear_algebra::Matrix, math::make_poly};

/**
 * All information for a problem of the form `AS = T` in `Z_q[X]/f`. Useful for
 * demonstrating full knowledge proofs before performing zero knowledge proofs.
 * Similar to [LogProofProverKnowledge](crate::LogProofProverKnowledge) except
 * any field limb size is allowed.
 */
pub struct LatticeProblem<Q>
where
    Q: Field,
{
    /// Public A
    pub a: Matrix<DensePolynomial<Q>>,

    /// Private message and encryption components S
    pub s: Matrix<DensePolynomial<Q>>,

    /// Result of A * S
    pub t: Matrix<DensePolynomial<Q>>,

    /// Polynomial divisor
    pub f: DensePolynomial<Q>,

    /// Bounds on elements in S
    pub b: Matrix<Vec<u64>>,
}

/**
 * Remove an element trailing in a vector. This can be helpful for types
 * like `DensePolynomial`, which do not work properly if the polynomials
 * passed in have a leading polynomial coefficient of zero.
 */
pub fn strip_trailing_value<T>(mut v: Vec<T>, trim_value: T) -> Vec<T>
where
    T: Eq,
{
    while v.last().map_or(false, |c| *c == trim_value) {
        v.pop();
    }

    v
}

/**
 * Converts a polynomial known to have coefficients less than all of the
 * moduli in its associated modulus set into regular integers. The main
 * advantage here over using a polynomial in its normal field is that the
 * polynomial can be moved to a new field without modulus switching.
 */
pub fn convert_to_smallint(
    coeff_modulus: &[Modulus],
    poly_array: PolynomialArray,
) -> Vec<Vec<i64>> {
    let first_coefficient = coeff_modulus[0].value();

    let rns = poly_array.as_rns_u64s().unwrap();

    let num_polynomials = poly_array.num_polynomials() as usize;
    let poly_modulus_degree = poly_array.poly_modulus_degree() as usize;
    let coeff_modulus_size = poly_array.coeff_modulus_size() as usize;

    let mut result = vec![vec![0; poly_modulus_degree]; num_polynomials];

    // Clippy suggests this odd way of indexing so we are going with it.
    for (i, r_i) in result.iter_mut().enumerate() {
        for (j, r_i_j) in r_i.iter_mut().enumerate() {
            let index = i * poly_modulus_degree * coeff_modulus_size + j;
            let coeff = rns[index];

            let small_coeff = if coeff > first_coefficient / 2 {
                ((coeff as i128) - (first_coefficient as i128)) as i64
            } else {
                coeff as i64
            };

            *r_i_j = small_coeff;
        }
    }

    result
}

/**
 * Convert a PolynomialArray of small coefficients into a vector of
 * coefficients. Each outer vector element is one polynomial. Leading zeros are
 * automatically trimmed.
 */
pub fn convert_to_small_coeffs(
    coeff_modulus: &[Modulus],
    poly_array: PolynomialArray,
) -> Vec<Vec<i64>> {
    convert_to_smallint(coeff_modulus, poly_array)
        .into_iter()
        .map(|v| strip_trailing_value(v, 0))
        .collect()
}

/**
 * Convert a `PolynomialArray` to a vector of `DensePolynomial`, where all the
 * coefficients are small (less than any of the constituent coefficient moduli).
 */
pub fn convert_to_polynomial_by_small_coeffs<Q>(
    coeff_modulus: &[Modulus],
    poly_array: PolynomialArray,
) -> Vec<DensePolynomial<Q>>
where
    Q: Field,
{
    convert_to_small_coeffs(coeff_modulus, poly_array)
        .into_iter()
        .map(|v| make_poly(&v))
        .collect::<Vec<DensePolynomial<Q>>>()
}

/**
 * Converts a `PolynomialArray` into a vector of `DensePolynomial`
 * regardless of the magnitude of the coefficients.
 */
pub fn convert_to_polynomial<Q, const N: usize>(
    poly_array: PolynomialArray,
) -> Vec<DensePolynomial<Fp<MontBackend<Q, N>, N>>>
where
    Q: MontConfig<N>,
{
    let chunk_size = poly_array.coeff_modulus_size() as usize;

    let bigint_values = poly_array
        .as_multiprecision_u64s()
        .unwrap()
        .chunks(chunk_size)
        // SEAL sometimes encodes a multiprecision integer with more limbs
        // than needed. The trailing limbs can be safely removed since they
        // are 0.
        .map(|x| BigInt::<N>(x[0..N].try_into().unwrap()))
        .collect::<Vec<BigInt<N>>>();

    bigint_values
        .chunks(poly_array.poly_modulus_degree() as usize)
        .map(|x| {
            let leading_zeros_removed = strip_trailing_value(x.to_vec(), BigInt::<N>::zero());
            DensePolynomial {
                coeffs: leading_zeros_removed
                    .iter()
                    .map(|y| Fp::<MontBackend<Q, N>, N>::from(*y))
                    .collect::<Vec<Fp<MontBackend<Q, N>, N>>>(),
            }
        })
        .collect()
}
