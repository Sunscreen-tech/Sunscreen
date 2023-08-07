/**
 * Types and functions for testing logproof setups. Not meant to be used in
 * production, only for testing.
 */
use ark_ff::Field;
use ark_poly::univariate::DensePolynomial;

use crate::linear_algebra::Matrix;

/**
 * All information for a problem of the form `AS = T` in `Z_q[X]/f`. Useful for
 * demonstrating full knowledge proofs before performing zero knowledge proofs.
 * Similar to [LogProofProverKnowledge](crate::LogProofProverKnowledge) except
 * any field limb size is allowed.
 */
#[allow(unused)]
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
