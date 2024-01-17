/**
* Implementation for the short discrete log proof, with some additional
* optimizations/features added.
*
* If any updates are made to this method, please update the `sdlp-changes.tex`
* file to reflect the alterations from the paper, and list them here.
*
* Features
* --------
*
* - Bounds are specified on each coefficient instead of using one global bound.
*   See [PR #276](https://github.com/Sunscreen-tech/Sunscreen/pull/276/files)
*   from July 2023
*/
use std::{
    cmp::max,
    collections::HashSet,
    iter::zip,
    ops::{Mul, Range},
    time::Instant,
};

use bitvec::{slice::BitSlice, vec::BitVec};
use crypto_bigint::Uint;
use curve25519_dalek::{ristretto::RistrettoPoint, scalar::Scalar, traits::Identity};
use log::trace;
use merlin::Transcript;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use sunscreen_math::{
    poly::Polynomial,
    ring::{ArithmeticBackend, Ring, RingModulus, Zq},
    RistrettoPointVec, ScalarVec, Zero,
};

use crate::{
    assertions::linear_relation,
    crypto::CryptoHash,
    inner_product::{self, InnerProductProof},
    linear_algebra::{InnerProduct, Matrix, ScalarMul},
    math::{
        parallel_multiscalar_multiplication, rand256, InfinityNorm, Log2, ModSwitch, Powers,
        Tensor, TwosComplementCoeffs,
    },
    rings::{FieldFrom, FieldInto, ZqRistretto},
    transcript::LogProofTranscript,
    ProofError,
};

type MatrixPoly<Q> = Matrix<Polynomial<Q>>;

/**
 * Bounds on the coefficients in the secret S
 */
#[derive(Clone, Debug, PartialEq)]
pub struct Bounds(pub Vec<u64>);

impl Zero for Bounds {
    // The empty vector could be seen as no bounds. Also follows the field
    // properties.  Although realistically this would be indexed by the
    // dimension d.
    fn zero() -> Self {
        Bounds(Vec::new())
    }

    fn vartime_is_zero(&self) -> bool {
        self.0.is_empty()
    }
}

impl std::ops::Deref for Bounds {
    type Target = [u64];

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

#[derive(Debug, Clone)]
/// The artifacts known to both the prover and verifier.
pub struct VerifierKnowledge<Q>
where
    Q: Ring + CryptoHash + ModSwitch<ZqRistretto> + RingModulus<4> + Ord,
{
    /// The linear transform matrix A. `AS=T` should describe a series
    /// of RLWE/SIS instances (one per column of s and t) to ensure hardness
    /// in retrieving `S`.
    pub a: Matrix<Polynomial<Q>>,

    /// The result of `AS`.
    pub t: Matrix<Polynomial<Q>>,

    /// A bound on each coefficient in the secret matrix S.
    ///
    /// Every coefficient must have a bound, even if the polynomials have many leading zero
    /// coefficients. Thus, each `Bound` should have length the degree of [`f`](`Self::f`).
    /// Also, be aware that the bound is on the absolute value of the coefficient.
    pub bounds: Matrix<Bounds>,

    /// The ideal `f` that defines the quotient ring `Z_q[X]/f`.
    ///
    /// For FHE, this is usually `x^d+1` where `d` is a power of 2.
    pub f: Polynomial<Q>,
}

impl<Q> VerifierKnowledge<Q>
where
    Q: Ring + CryptoHash + ModSwitch<ZqRistretto> + RingModulus<4> + Ord,
{
    /**
     * Constructs [`VerifierKnowledge`] from the given public information.
     */
    pub fn new(
        a: Matrix<Polynomial<Q>>,
        t: Matrix<Polynomial<Q>>,
        f: Polynomial<Q>,
        bounds: Matrix<Bounds>,
    ) -> Self {
        let d = f.vartime_degree() as u64;

        assert_eq!(a.cols, bounds.rows);
        assert_eq!(t.cols, bounds.cols);

        // All coefficients must have a bound.
        for bound in bounds.as_slice() {
            assert_eq!(bound.len() as u64, d);
        }

        Self { a, t, bounds, f }
    }

    /**
     * The number of rows in a.
     */
    pub fn n(&self) -> u64 {
        self.a.rows as u64
    }

    /**
     * The number of cols in a and the number rows in s.
     */
    pub fn m(&self) -> u64 {
        self.a.cols as u64
    }

    /**
     * The number of cols in t.
     */
    pub fn k(&self) -> u64 {
        self.t.cols as u64
    }

    /**
     * The number of bits in `B` plus 1 where `B` is the upper bound on the
     * coefficients in the polynomials in `S`.
     */
    pub fn b(&self) -> Matrix<Bounds> {
        // Note the odd case here: if the bounds are zero then by the formula in
        // the original paper we should get an undefined value. Here we say that
        // a zero bound produces a zero `b` value from the paper. This is later
        // used to ignore coefficients that have a bound of zero.
        fn calculate_bound(v: &Bounds) -> Bounds {
            Bounds(
                v.iter()
                    .map(|b| if *b > 0 { Log2::ceil_log2(b) + 1 } else { 0 })
                    .collect(),
            )
        }

        self.bounds.map(calculate_bound)
    }

    /**
     * Sum of all the bounds
     */
    pub fn b_sum(&self) -> u64 {
        self.b()
            .as_slice()
            .iter()
            .map(|v| v.iter().sum::<u64>())
            .sum()
    }

    /**
     * Ranges in the serialized coefficients of S corresponding to the bounds
     */
    pub fn b_slices(&self) -> Vec<Vec<Range<usize>>> {
        let mut b_ranges: Vec<Vec<Range<usize>>> = (0..self.bounds.rows)
            .map(|_| vec![Range { start: 0, end: 0 }; self.bounds.cols])
            .collect();

        let b = self.b();

        let mut last_end_range = 0;

        for (k, b_piece) in b.as_slice().iter().enumerate() {
            let bits = b_piece.iter().sum::<u64>() as usize;

            // Get the orginal matrix index
            let i = k / self.bounds.cols;
            let j = k % self.bounds.cols;

            let range = &mut b_ranges[i][j];

            // End of range is +1 since the range is exclusive
            range.start = last_end_range;
            range.end = last_end_range + bits;

            last_end_range = range.end;
        }

        b_ranges
    }

    /**
     * The degree of `f`.
     */
    pub fn d(&self) -> u64 {
        self.f.vartime_degree() as u64
    }

    /**
     * Number of coefficients in secret vector s
     */
    pub fn number_coeff_in_s(&self) -> u64 {
        self.m() * self.d()
    }

    /**
     * Computes the nk(d-1)b_2 term in l.
     */
    pub fn nk_d_min_1_b_2(&self) -> u64 {
        self.n() * self.k() * (self.d() - 1) * self.b_2()
    }

    /**
     * Computes the nk(2d-1)b_1 term in l.
     */
    pub fn nk_2d_min_1_b_1(&self) -> u64 {
        self.n() * self.k() * (2 * self.d() - 1) * self.b_1()
    }

    /**
     * Maximum column bound for the columns in S.
     */
    pub fn max_bounds_column_sum(&self) -> u64 {
        (0..self.bounds.cols)
            .map(|c| {
                let mut column_bound_sum: u64 = 0;
                for r in 0..self.bounds.rows {
                    column_bound_sum += self.bounds[(r, c)].iter().sum::<u64>();
                }
                column_bound_sum
            })
            .fold(0, max)
    }

    /**
     * The number of bits needed to store the elements of R1.
     */
    pub fn b_1(&self) -> u64 {
        let d_big = ZqRistretto::from(self.d());
        let max_bounds_column_sum = ZqRistretto::from(self.max_bounds_column_sum());

        let inf_norm_f: ZqRistretto = self.f.infinity_norm().mod_switch_signed();

        let b1 = max_bounds_column_sum + d_big * inf_norm_f;

        Log2::ceil_log2(&b1)
    }

    /**
     * The number of bits needed to store values in `Fp<Q>`.
     */
    pub fn b_2(&self) -> u64 {
        Log2::ceil_log2(&Q::field_modulus())
    }

    /**
     * The length in bits of the binary expansion of the serialized secret * vectors.
     */
    pub fn l(&self) -> u64 {
        let total_bounds_all_equations = self.b_sum();
        let nk = self.n().checked_mul(self.k()).unwrap();

        let d2_minus_1 = self.d().checked_mul(2).unwrap().checked_sub(1).unwrap();
        let nk_d2_minus_1_b_1 = nk
            .checked_mul(d2_minus_1)
            .unwrap()
            .checked_mul(self.b_1())
            .unwrap();

        let d_minus_1 = self.d().checked_sub(1).unwrap();
        let nk_d_minus_1_b_2 = nk
            .checked_mul(d_minus_1)
            .unwrap()
            .checked_mul(self.b_2())
            .unwrap();

        total_bounds_all_equations
            .checked_add(nk_d2_minus_1_b_1)
            .unwrap()
            .checked_add(nk_d_minus_1_b_2)
            .unwrap()
    }
}

/**
 * The artifacts known to only the prover.
 */
pub struct ProverKnowledge<Q>
where
    Q: Ring + CryptoHash + ModSwitch<ZqRistretto> + RingModulus<4> + Ord,
{
    /**
     * The matrix containing the secret.
     */
    pub s: Matrix<Polynomial<Q>>,

    /**
     * Shared knowlege.
     */
    pub vk: VerifierKnowledge<Q>,
}

impl<Q> ProverKnowledge<Q>
where
    Q: Ring + ModSwitch<ZqRistretto> + RingModulus<4> + CryptoHash + Ord,
{
    /**
     * Creates [`ProverKnowledge`]. Where `as=t` and `bound` is a bound on
     * every coefficient in `s`. `f` is the divisor in the quotient ring
     * Z_q\[X\]/f.
     *
     * # Panics
     * * If `as != t` (or the dimensions mismatch) in Z_q\[X\]/(X^deg-1)
     * *
     */
    pub fn new(
        a: &MatrixPoly<Q>,
        s: &MatrixPoly<Q>,
        t: &MatrixPoly<Q>,
        bounds: &Matrix<Bounds>,
        f: &Polynomial<Q>,
    ) -> Self {
        assert_eq!(a.cols, s.rows);
        assert_eq!(a.rows, t.rows);
        assert_eq!(s.cols, t.cols);

        debug_assert_eq!(
            (a * s).map(|x| x.vartime_div_rem_restricted_rhs(f).1),
            t.clone()
        );

        let vk = VerifierKnowledge::new(a.clone(), t.clone(), f.clone(), bounds.clone());

        Self { s: s.clone(), vk }
    }

    /**
     * Pull out the binary expansion of a component of the witness S based on
     * the index into S.
     *
     * # Panics
     * * If the index is out of bounds
     */
    pub fn s_binary_by_index(&self, index: (usize, usize)) -> BitVec {
        let s_piece = self.s[index].clone();
        let s_piece = Matrix::new_with_data(1, 1, &[s_piece]);

        let b_piece = self.vk.b()[index].clone();
        let b_piece = Matrix::new_with_data(1, 1, &[b_piece]);

        let s_serialized: Vec<ZqRistretto> = LogProof::serialize(&s_piece, self.vk.d() as usize);
        let b_serialized = LogProof::serialize_bounds(&b_piece);

        let s_binary: BitVec = LogProof::to_2s_complement_multibound(&s_serialized, &b_serialized);

        s_binary
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
/**
 * A proof in zero-knowlege of a linear relation of the form `AS=T`.
 * `A` and `T` are public while `S` is a secret known to the prover.
 */
pub struct LogProof {
    /**
     * The Prover's commitment to a shared part of `s_1`; this can be the
     * identity.
     */
    pub w_shared: RistrettoPoint,

    /**
     * The Prover's commitment to `s_1` and `s_2`.
     */
    pub w: RistrettoPoint,

    /**
     * The inner product proof for `v_1`, `v_2`
     */
    pub inner_product_proof: InnerProductProof,
}

impl LogProof {
    /**
     * Creates the proof from the given prover's knowledge.
     *
     * # Remarks
     * `g` and `h` are slices of generators of length `vk.l()`.
     * To generate them, call [`crate::inner_product::VerifierKnowledge::get_u`]
     *
     * `u` is a single [`RistrettoPoint`].
     *
     *
     */
    pub fn create<Q>(
        transcript: &mut Transcript,
        pk: &ProverKnowledge<Q>,
        g: &[RistrettoPoint],
        h: &[RistrettoPoint],
        u: &RistrettoPoint,
    ) -> Self
    where
        Q: Ring + ModSwitch<ZqRistretto> + Mul<Q, Output = Q> + CryptoHash + RingModulus<4> + Ord,
    {
        let half_rho = Scalar::from_bits(rand256());
        Self::create_with_shared(transcript, pk, g, h, u, &half_rho, &[])
    }

    /// Create a commitment where some parts of the witness S are shared with
    /// another proof system. This produces a commitment to the shared bits in
    /// S.
    pub fn create_with_shared<Q>(
        transcript: &mut Transcript,
        pk: &ProverKnowledge<Q>,
        g: &[RistrettoPoint],
        h: &[RistrettoPoint],
        u: &RistrettoPoint,
        half_rho: &Scalar,
        shared_indices: &[(usize, usize)],
    ) -> Self
    where
        Q: Ring + ModSwitch<ZqRistretto> + Mul<Q, Output = Q> + CryptoHash + RingModulus<4> + Ord,
    {
        let vk = &pk.vk;
        let d = vk.d();
        let m = vk.m();
        let n = vk.n();
        let k = vk.k();
        let b = vk.b();
        let f = &vk.f;
        let b_1 = vk.b_1();
        let b_2 = vk.b_2();
        let l = vk.l();
        let total_bounds_all_equations = vk.b_sum();

        assert_eq!(g.len(), l as usize);
        assert_eq!(h.len(), l as usize);

        for (n, (i, j)) in shared_indices.iter().enumerate() {
            assert!(
                *i < (m as usize),
                "Shared index should be less than the number of rows in S (m = {}). Bad index at {}: ({}, {})",
                m,
                n,
                i,
                j
            );
            assert!(*j < (k as usize),
                "Shared index should be less than the number of columns in S (k = {}). Bad index at {}: ({}, {})",
                k,
                n,
                i,
                j

        );
        }

        let b_serialized = LogProof::serialize_bounds(&b);
        let b_slices = vk.b_slices();

        transcript.linear_relation_domain_separator();
        transcript.append_linear_relation_knowledge(vk);

        let (r_2, r_1) = Self::compute_factors(&vk.a, &pk.s, &vk.t, &vk.f);

        // In debug mode, assert that AS + qR_1 + fR_2 == T over Z[X].
        // Note we use FpRistretto for Z[X], which should be large enough
        // to hold computations resulting from elements in Z_q[X].
        // TODO: Clarify the restrictions on Q vs FpRistretto.
        if cfg!(debug_assertions) {
            linear_relation::assert_factors(pk, f, &r_2, &r_1);
        }

        let s_serialized: Vec<ZqRistretto> = Self::serialize(&pk.s, d as usize);
        let r_1_serialized = Self::serialize(&r_1, (2 * d - 1) as usize);
        let r_2_serialized = Self::serialize(&r_2, (d - 1) as usize);

        assert_eq!(s_serialized.len() as u64, m * k * d);

        assert_eq!(r_1_serialized.len() as u64, n * k * (2 * d - 1));
        assert_eq!(r_2_serialized.len() as u64, n * k * (d - 1));

        let s_binary: BitVec = Self::to_2s_complement_multibound(&s_serialized, &b_serialized);
        assert_eq!(s_binary.len() as u64, total_bounds_all_equations);

        let r_1_binary = Self::to_2s_complement(&r_1_serialized, b_1);
        assert_eq!(r_1_binary.len() as u64, n * k * (2 * d - 1) * b_1);

        let r_2_binary = Self::to_2s_complement(&r_2_serialized, b_2);
        assert_eq!(r_2_binary.len() as u64, n * k * (d - 1) * b_2);

        let mut s_1 = s_binary.clone();
        s_1.extend(r_1_binary.iter());
        s_1.extend(r_2_binary.iter());

        // The SDLP paper calls for xoring s_1 with the constant 1, which
        // inverts the bits. Bitwise NOT does the same thing.
        let s_2 = !s_1.clone();

        let (s_1_shared, h_shared, s_1_unshared, h_unshared) =
            Self::split_shared_and_unshared_bits(shared_indices, &b_slices, &s_1, h);

        let w_shared = Self::make_shared_commitment(&s_1_shared, half_rho, &h_shared, u);
        let w_unshared =
            Self::make_unshared_commitment(&s_1_unshared, &s_2, half_rho, g, &h_unshared, u);
        let w = w_shared + w_unshared;

        if cfg!(debug_assertions) {
            let w_prime =
                Self::make_commitment(&s_1, &s_2, &(Scalar::from(2u64) * half_rho), g, h, u);
            assert_eq!(w, w_prime);
        }

        transcript.append_point(b"w_shared", &w_shared.compress());
        transcript.append_point(b"w", &w.compress());

        let (alpha, beta, gamma, phi, psi) = Self::create_challenges(&pk.vk, transcript);

        if cfg!(debug_assertions) {
            linear_relation::assert_eval(pk, &r_1, &r_2, &alpha);

            linear_relation::assert_poly_expansion(
                pk,
                &s_serialized,
                &r_1_serialized,
                &r_2_serialized,
                &alpha,
            );

            linear_relation::assert_scaled_poly_expansion(
                pk,
                &s_serialized,
                &r_1_serialized,
                &r_2_serialized,
                &alpha,
                &beta,
                &gamma,
            );

            linear_relation::assert_inner_product_form(
                pk,
                &s_serialized,
                &r_1_serialized,
                &r_2_serialized,
                &alpha,
                &beta,
                &gamma,
            );

            linear_relation::assert_2s_complement_tensor_expansion(
                pk,
                &s_binary,
                &r_1_binary,
                &r_2_binary,
                &s_serialized,
                &r_1_serialized,
                &r_2_serialized,
            );

            linear_relation::assert_equation_19(
                pk,
                &s_binary,
                &r_1_binary,
                &r_2_binary,
                &alpha,
                &beta,
                &gamma,
            );
        }

        let g_prime = Self::compute_g_prime(g, &phi);

        let v = Self::compute_v(vk, alpha, &beta, &gamma);

        let t = Self::compute_t(&w, &g_prime, h, &phi, &psi, &v);

        let v_1 = Self::compute_v1(&v, &phi, &s_2, &psi);
        let v_2 = Self::compute_v2(&s_1, &psi);

        if cfg!(debug_assertions) {
            let g_a = parallel_multiscalar_multiplication(
                &s_2.iter()
                    .map(|x| {
                        if x == true {
                            Scalar::one()
                        } else {
                            Scalar::zero()
                        }
                    })
                    .collect::<Vec<Scalar>>(),
                g,
            );

            let g_b = Self::compute_g_prime_commitment(&g_prime, &v, &phi, &psi);

            let expected = parallel_multiscalar_multiplication(&v_1, &g_prime);

            assert_eq!(g_a + g_b, expected);

            linear_relation::assert_equation_19_plus_1(pk, &v, &s_1, &alpha, &beta, &gamma);

            linear_relation::assert_equation_19_plus_2(
                pk,     // ok
                &v,     // ok
                &s_2,   // ok
                &s_1,   // ok
                &alpha, // ok
                &beta,  // ok
                &psi,   // ok
                &phi,   // ok
                &gamma, // ok
            );
        }

        assert_eq!(v_1.len(), v_2.len());
        debug_assert_eq!(
            v_1.inner_product(v_2.as_slice()),
            Self::compute_x(vk, &gamma, &alpha, &beta, &phi, &psi, &v)
        );

        // The half_rho blinding factor needs to be doubled because by making a
        // shared and unshared commitment with half_rho blinding factor in each,
        // the total blinding factor is the sum of the two blinding factors.
        let rho = half_rho + half_rho;

        let inner_product_proof =
            Self::create_inner_product_proof(transcript, &v_1, &v_2, &rho, &t, &g_prime, h, u);

        Self {
            w_shared,
            w,
            inner_product_proof,
        }
    }

    /**
     * Verify the given proof holds.
     */
    pub fn verify<Q>(
        &self,
        transcript: &mut Transcript,
        vk: &VerifierKnowledge<Q>,
        g: &[RistrettoPoint],
        h: &[RistrettoPoint],
        u: &RistrettoPoint,
    ) -> Result<(), ProofError>
    where
        Q: Ring + ModSwitch<ZqRistretto> + RingModulus<4> + CryptoHash + Ord,
    {
        transcript.linear_relation_domain_separator();
        transcript.append_linear_relation_knowledge(vk);

        transcript.append_point(b"w_shared", &self.w_shared.compress());
        transcript.append_point(b"w", &self.w.compress());

        let now = Instant::now();

        let (alpha, beta, gamma, phi, psi) = Self::create_challenges(vk, transcript);

        trace!("Create challenges {}s", now.elapsed().as_secs_f64());

        let now = Instant::now();

        let g_prime = Self::compute_g_prime(g, &phi);

        trace!("g_prime {}s", now.elapsed().as_secs_f64());

        let now = Instant::now();

        let v = Self::compute_v(vk, alpha, &beta, &gamma);

        trace!("v {}s", now.elapsed().as_secs_f64());
        let now = Instant::now();

        let t = Self::compute_t(&self.w, &g_prime, h, &phi, &psi, &v);
        trace!("t {}s", now.elapsed().as_secs_f64());

        let now = Instant::now();

        let x = Self::compute_x(vk, &gamma, &alpha, &beta, &phi, &psi, &v);

        trace!("x {}s", now.elapsed().as_secs_f64());

        let ip_vk = inner_product::VerifierKnowledge { t, x };

        self.inner_product_proof
            .verify(transcript, &ip_vk, &g_prime, h, u)?;

        Ok(())
    }

    /**
     * Computes x from the verifier's knowledge.
     */
    fn compute_x<Q>(
        vk: &VerifierKnowledge<Q>,
        gamma: &[Scalar],
        alpha: &Scalar,
        beta: &[Scalar],
        phi: &[Scalar],
        psi: &Scalar,
        v: &[Scalar],
    ) -> Scalar
    where
        Q: Ring + CryptoHash + ModSwitch<ZqRistretto> + RingModulus<4> + Ord,
    {
        // Compute the first addition term
        let t = vk.t.mod_switch_signed();
        let t_alpha: Matrix<Scalar> = t.evaluate(&(*alpha).field_into()).field_into();

        let gamma = Matrix::from(gamma);
        let beta = Matrix::from(beta);
        let term_1 = gamma.transpose() * t_alpha * beta;
        assert_eq!(term_1.rows, 1);
        assert_eq!(term_1.cols, 1);
        let term_1 = term_1[(0, 0)];

        // Compute the second addition term.
        let term_2 = psi * v.inner_product(vec![Scalar::one(); v.len()]);

        // Compute the third addition term.
        let term_3 = (psi + psi * psi) * phi.inner_product(vec![Scalar::one(); v.len()]);

        term_1 + term_2 + term_3
    }

    #[allow(clippy::too_many_arguments)]
    fn create_inner_product_proof(
        transcript: &mut Transcript,
        v_1: &[Scalar],
        v_2: &[Scalar],
        rho: &Scalar,
        t: &RistrettoPoint,
        g: &[RistrettoPoint],
        h: &[RistrettoPoint],
        u: &RistrettoPoint,
    ) -> InnerProductProof {
        assert_eq!(v_1.len(), v_2.len());

        let pk = inner_product::ProverKnowledge::new(v_1, v_2, rho, t);

        InnerProductProof::create(transcript, &pk, g, h, u)
    }

    fn compute_v1(v: &[Scalar], phi: &[Scalar], s_2: &BitSlice, psi: &Scalar) -> Vec<Scalar> {
        assert_eq!(v.len(), phi.len());
        assert_eq!(s_2.len(), phi.len());

        let mut v_1 = Vec::with_capacity(v.len());

        v.par_iter()
            .enumerate()
            .map(|(i, v)| v + phi[i] * Self::bool_to_scalar(s_2[i]) + psi * phi[i])
            .collect_into_vec(&mut v_1);

        v_1
    }

    fn compute_v2(s_1: &BitSlice, psi: &Scalar) -> Vec<Scalar> {
        s_1.iter().map(|x| Self::bool_to_scalar(*x) + psi).collect()
    }

    fn bool_to_scalar(x: bool) -> Scalar {
        if x {
            Scalar::one()
        } else {
            Scalar::zero()
        }
    }

    fn compute_g_prime_commitment(
        g_prime: &[RistrettoPoint],
        v: &[Scalar],
        phi: &[Scalar],
        psi: &Scalar,
    ) -> RistrettoPoint {
        let v_plus_phi = v
            .iter()
            .zip(phi.iter())
            .map(|(v, phi)| v + psi * phi)
            .collect::<Vec<Scalar>>();

        parallel_multiscalar_multiplication(&v_plus_phi, g_prime)
    }

    fn compute_t(
        w: &RistrettoPoint,
        g_prime: &[RistrettoPoint],
        h: &[RistrettoPoint],
        phi: &[Scalar],
        psi: &Scalar,
        v: &[Scalar],
    ) -> RistrettoPoint {
        assert_eq!(v.len(), phi.len());

        let v_plus_phi = v
            .par_iter()
            .zip(phi.par_iter())
            .map(|(v, phi)| v + psi * phi)
            .collect::<Vec<Scalar>>();

        let t_1 = parallel_multiscalar_multiplication(&v_plus_phi, g_prime);

        let h = h
            .par_iter()
            .fold(RistrettoPoint::identity, |x, y| x + y)
            .reduce(RistrettoPoint::identity, |a, b| a + b);

        let t_2 = h * psi;

        w + t_1 + t_2
    }

    fn compute_g_prime(g: &[RistrettoPoint], phi: &[Scalar]) -> Vec<RistrettoPoint> {
        let phi_inv = ScalarVec::new(phi).invert();
        let g = RistrettoPointVec::new(g);

        (g * phi_inv).into_iter().collect()
    }

    /**
     * Uses the single elements in a first vector to scale a vector of vectors,
     * and flattens the result. If the each vector happens to be the same
     * length, then this is the same as the following operation:
     * `vec(diag(v) * M)` where `vec` is row major vectorization.
     *
     * - v: Vector to diagonalize
     * - m: Matrix as an array of vectors
     *
     * Note: the elements in `m` do not need to be the same size.
     */
    pub(crate) fn scale_rows_and_flatten<T>(v: &[T], m: &[Vec<T>]) -> Vec<T>
    where
        T: Mul<T, Output = T> + Copy,
    {
        // Only works if the number of elements in the vector is equal to the
        // number of rows in the matrix.
        assert_eq!(v.len(), m.len());

        zip(v, m)
            .flat_map(|(v_i, row)| row.iter().map(|element| (*v_i) * (*element)))
            .collect()
    }

    fn compute_v<Q>(
        vk: &VerifierKnowledge<Q>,
        alpha: Scalar,
        beta: &[Scalar],
        gamma: &[Scalar],
    ) -> Vec<Scalar>
    where
        Q: Ring + CryptoHash + ModSwitch<ZqRistretto> + RingModulus<4> + Ord,
    {
        assert_eq!(beta.len(), vk.t.cols);
        assert_eq!(gamma.len(), vk.a.rows);

        let n = vk.n();
        let k = vk.k();
        let d = vk.d();
        let l = vk.l();
        let b = vk.b();
        let b_1 = vk.b_1();
        let b_2 = vk.b_2();
        let b_sum = vk.b_sum();

        // Compute term 1
        let two_b = Self::serialize_bounds_twos_complement_coefficients(&b);

        let alpha_d = alpha.powers(d as usize);

        // vk.a is in (Z_q[X]/f)^(m x k), so we need to mod switch to Z_p[X].
        let a = vk.a.mod_switch_signed();

        let a_eval: Matrix<Scalar> = a.evaluate(&alpha.field_into()).transpose().field_into();

        let gamma_as_matrix = Matrix::from(gamma);

        let a_eval_gamma = a_eval * &gamma_as_matrix;

        let mut term_1 = Self::scale_rows_and_flatten(
            a_eval_gamma.tensor(beta).tensor(alpha_d).as_slice(),
            two_b.as_slice(),
        );

        assert_eq!(term_1.len() as u64, b_sum);

        // Compute term 2
        let q = ZqRistretto::try_from(Q::field_modulus()).unwrap();
        let q: Scalar = q.field_into();

        let d2_min_1 = 2 * d as usize - 1;
        let alpha_2d_minus_1 = alpha.powers(d2_min_1);
        let two_b_1 = Scalar::twos_complement_coeffs(b_1 as usize);

        let mut term_2 = (&gamma_as_matrix)
            .scalar_mul(q)
            .tensor(beta)
            .tensor(alpha_2d_minus_1)
            .tensor(two_b_1);

        assert_eq!(term_2.len() as u64, b_1 * (2 * d - 1) * n * k);

        // Compute term 3
        let d_min_1 = d as usize - 1;

        let alpha_d_minus_1 = alpha.powers(d_min_1);
        let two_b_2 = Scalar::twos_complement_coeffs(b_2 as usize);

        let f = vk.f.mod_switch_signed();
        let f_eval = f.evaluate(&alpha.field_into());
        let mut term_3 = gamma_as_matrix
            .scalar_mul(Scalar::field_from(f_eval))
            .tensor(beta)
            .tensor(alpha_d_minus_1)
            .tensor(two_b_2);

        assert_eq!(term_3.len() as u64, b_2 * (d - 1) * n * k);

        let mut result = vec![];

        result.append(&mut term_1);
        result.append(&mut term_2);
        result.append(&mut term_3);

        assert_eq!(result.len(), l as usize);

        result
    }

    fn create_challenges<Q>(
        vk: &VerifierKnowledge<Q>,
        transcript: &mut Transcript,
    ) -> (Scalar, Vec<Scalar>, Vec<Scalar>, Vec<Scalar>, Scalar)
    where
        Q: Ring + CryptoHash + RingModulus<4> + ModSwitch<ZqRistretto> + Ord,
    {
        let l = vk.l();

        let alpha = transcript.challenge_scalar(b"alpha");
        let beta = transcript.challenge_scalars(b"beta", vk.t.cols);
        let gamma = transcript.challenge_scalars(b"gamma", vk.a.rows);
        let phi = transcript.challenge_scalars(b"phi", l as usize);
        let psi = transcript.challenge_scalar(b"psi");

        (alpha, beta, gamma, phi, psi)
    }

    fn make_shared_commitment(
        s_1_shared: &BitSlice,
        rho: &Scalar,
        h: &[RistrettoPoint],
        u: &RistrettoPoint,
    ) -> RistrettoPoint {
        let mut commitment = RistrettoPoint::identity();

        let s_1_shared = s_1_shared.iter().map(|b| b == true).collect::<Vec<bool>>();

        commitment += s_1_shared
            .par_iter()
            .zip_eq(h.par_iter())
            .filter_map(|(bit, p_i)| if *bit { Some(p_i) } else { None })
            .sum::<RistrettoPoint>();

        commitment += u * rho;

        commitment
    }

    fn make_unshared_commitment(
        s_1_unshared: &BitSlice,
        s_2: &BitSlice,
        rho: &Scalar,
        g: &[RistrettoPoint],
        h: &[RistrettoPoint],
        u: &RistrettoPoint,
    ) -> RistrettoPoint {
        assert_eq!(s_1_unshared.len(), h.len());
        assert_eq!(s_2.len(), g.len());

        let mut commitment = RistrettoPoint::identity();
        let s_1_unshared = s_1_unshared
            .iter()
            .map(|b| b == true)
            .collect::<Vec<bool>>();
        let s_2 = s_2.iter().map(|b| b == true).collect::<Vec<bool>>();

        commitment += s_1_unshared
            .par_iter()
            .zip_eq(h.par_iter())
            .filter_map(|(bit, p_i)| if *bit { Some(p_i) } else { None })
            .sum::<RistrettoPoint>();

        commitment += s_2
            .par_iter()
            .zip_eq(g.par_iter())
            .filter_map(|(bit, p_i)| if *bit { Some(p_i) } else { None })
            .sum::<RistrettoPoint>();

        commitment += u * rho;

        commitment
    }

    /**
     * Creates the commitment `w` in the SDLP paper. This commits to the
     * bit vectors s_1 and s_2 with blinding factor u^rho.
     */
    fn make_commitment(
        s_1: &BitSlice,
        s_2: &BitSlice,
        rho: &Scalar,
        g: &[RistrettoPoint],
        h: &[RistrettoPoint],
        u: &RistrettoPoint,
    ) -> RistrettoPoint {
        assert_eq!(s_1.len(), h.len());
        assert_eq!(s_2.len(), g.len());
        assert_eq!(s_1.len(), s_2.len());

        let mut commitment = RistrettoPoint::identity();
        let s_1 = s_1.iter().map(|b| b == true).collect::<Vec<bool>>();
        let s_2 = s_2.iter().map(|b| b == true).collect::<Vec<bool>>();

        commitment += s_1
            .par_iter()
            .zip_eq(h.par_iter())
            .filter_map(|(bit, p_i)| if *bit { Some(p_i) } else { None })
            .sum::<RistrettoPoint>();

        commitment += s_2
            .par_iter()
            .zip_eq(g.par_iter())
            .filter_map(|(bit, p_i)| if *bit { Some(p_i) } else { None })
            .sum::<RistrettoPoint>();

        commitment += u * rho;

        commitment
    }

    /**
     * Let field `F` be `Fq[X]/f`. Given
     * * `A` in `F^{m x k}`
     * * `S` in `F^{k x n}`
     * * `T` in `F^{m x n}`
     * * `AS = T`*
     *
     * Compute the factors `R_2` in `Fq[X]`, `R_1` in `Z[X]` be the factors
     * such that `AS = T - q * R_1 - f * R_2`, where all computation
     * in this equation occurs in `F = Z`.
     *
     * # Remarks
     * Representing all values in Z is both impossible (as it is infinite)
     * and unnecessary. We instead compute the results in `FpRistretto`,
     * since this field is large enough that all the computation on values
     * in `Fq` occurs without modulus reduction.
     */
    fn compute_factors<Q>(
        a: &MatrixPoly<Q>,
        s: &MatrixPoly<Q>,
        t: &MatrixPoly<Q>,
        f: &Polynomial<Q>,
    ) -> (MatrixPoly<Q>, MatrixPoly<ZqRistretto>)
    where
        Q: Ring + ModSwitch<ZqRistretto> + Mul<Q, Output = Q> + RingModulus<4>,
    {
        let as_q = a * s;
        let t_as_q = t - &as_q;

        // f should evenly divide (t - as).
        debug_assert_eq!(
            t_as_q.map(|x| x.vartime_div_rem_restricted_rhs(f).1),
            Matrix::new(t.rows, t.cols)
        );

        let r_2 = &t_as_q / f;

        debug_assert_eq!(t - r_2.map(|x| x * f), a * s);

        let as_p = a.mod_switch_signed() * s.mod_switch_signed();
        let t_as_p = t.mod_switch_signed() - &as_p;
        let r_1 = &t_as_p - r_2.mod_switch_signed().scalar_mul(f.mod_switch_signed());
        let r_1 = r_1.scalar_div_q(&ZqRistretto::try_from(Q::field_modulus()).unwrap());

        (r_2, r_1)
    }

    /**
     * Takes an individual values in a field `Zq`, treats the value as signed [q's
     * complement](https://en.wikipedia.org/wiki/Method_of_complements) and
     * converts the value to binary 2's complement. This is then appended to an
     * provided BitVec.
     *
     * `value` is the element in Zq and `b` is the number of bits needed
     * to represent the signed value.
     *
     * This modifies bitvec in place.
     *
     */
    fn to_2s_complement_single<B, const N: usize>(value: &Zq<N, B>, log_b: u64, bitvec: &mut BitVec)
    where
        B: ArithmeticBackend<N>,
    {
        if log_b == 0 {
            return;
        }

        let value = value.into_bigint();
        let mod_div_2 = Zq::<N, B>::field_modulus_div_2();
        let modulus = Zq::<N, B>::field_modulus();
        let is_negative = value > mod_div_2;

        // Compute the q's complement of value
        let as_neg: Uint<N> = modulus.wrapping_sub(&value);

        // The smaller of value and it's q's complement is the absolute
        // value.
        let abs_value = value.min(as_neg);

        // To make a positive number negative in 2's complement,
        // subtract 1 and flip the bits. So, here we sub 1 from abs if
        // original value was negative.
        let adjusted = abs_value.wrapping_sub(&Uint::from(is_negative as u8));

        for i in 0..(log_b - 1) {
            // Inspecting crypto_bigint's code, the variable time is a function of the index,
            // which is public information here.
            let bit = adjusted.bit_vartime(i as usize);

            // Invert the bit if the original value was negative
            bitvec.push(bit ^ is_negative);
        }

        // Now push the sign bit
        bitvec.push(is_negative);
    }

    /**
     * Takes a slice of values in a field `Zq`, treats the values as signed [q's
     * complement](https://en.wikipedia.org/wiki/Method_of_complements)
     * and converts the value to binary 2's complement.
     *
     * `value` is the element in Zq and `b` is the number of bits needed
     * to represent the signed value.
     */
    fn to_2s_complement<B, const N: usize>(values: &[Zq<N, B>], log_b: u64) -> BitVec
    where
        B: ArithmeticBackend<N>,
    {
        let mut bitvec = BitVec::with_capacity(values.len() * log_b as usize);

        // This code should not feature timing side-channels.
        for value in values.iter() {
            LogProof::to_2s_complement_single(value, log_b, &mut bitvec);
        }

        bitvec
    }

    /**
     * Takes a slice of values in a field `Zq`, treats the values as signed [q's
     * complement](https://en.wikipedia.org/wiki/Method_of_complements) and
     * converts the value to binary 2's complement with a specific bit size for
     * each element in the slice. Note that the number of values must equal the
     * number of bounds, otherwise this function will cause an assertion error.
     *
     * `value` is the element in Zq and `b` is the number of bits needed
     * to represent the signed value.
     */
    fn to_2s_complement_multibound<B, const N: usize>(values: &[Zq<N, B>], log_b: &[u64]) -> BitVec
    where
        B: ArithmeticBackend<N>,
    {
        // Make sure we have an equal number of values and bounds to serialize
        assert_eq!(values.len(), log_b.len());

        let mut bitvec = BitVec::with_capacity(values.len() * log_b.iter().sum::<u64>() as usize);

        // This code should not feature timing side-channels.
        for (value, bound) in zip(values.iter(), log_b.iter()) {
            LogProof::to_2s_complement_single(value, *bound, &mut bitvec);
        }

        bitvec
    }

    /**
     * Turns a `Matrix<Bounds>` into a `Vec<u64>`.
     *
     * # Remarks
     * The matrix is serialized in row-major order, with bound
     * coefficients being contiguous.
     */
    pub fn serialize_bounds(bounds: &Matrix<Bounds>) -> Vec<u64> {
        bounds.as_slice().iter().flat_map(|x| x.0.clone()).collect()
    }

    /**
     * Converts a matrix of bounds into a version serialized and then expanded
     * by the coefficients.
     *
     * The matrix of bounds is a m x k matrix with each element being a d
     * dimensional vector (the bound per coefficient). This function converts
     * the result into a m * k * d x 1 vector where each element is a vector of
     * size B_{m,k,d} size; put another way, each element in the resulting
     * vector is the twos complement expansion of the bound on a specific
     * coefficient.
     */
    pub fn serialize_bounds_twos_complement_coefficients<F>(bounds: &Matrix<Bounds>) -> Vec<Vec<F>>
    where
        F: TwosComplementCoeffs,
    {
        Self::serialize_bounds(bounds)
            .as_slice()
            .iter()
            .map(|x| F::twos_complement_coeffs(*x as usize))
            .collect()
    }

    /**
     * Turns a `Matrix<DensePolynomial<Q>>` into a `Vec<FpRistretto>`.
     *
     * # Remarks
     * The matrix is serialized in row-major order, with polynomial
     * coefficients being contiguous.
     */
    pub fn serialize<Q>(x: &MatrixPoly<Q>, d: usize) -> Vec<ZqRistretto>
    where
        Q: Ring + ModSwitch<ZqRistretto>,
    {
        let mut result = vec![];

        for i in 0..x.rows {
            for j in 0..x.cols {
                let poly = &x[(i, j)];

                for c in &poly.coeffs {
                    result.push(c.mod_switch_signed());
                }

                for _ in poly.coeffs.len()..d {
                    result.push(ZqRistretto::zero());
                }
            }
        }

        result
    }

    fn split_shared_and_unshared_bits(
        shared_indices: &[(usize, usize)],
        b_slices: &[Vec<Range<usize>>],
        s_1: &BitVec,
        h: &[RistrettoPoint],
    ) -> (BitVec, Vec<RistrettoPoint>, BitVec, Vec<RistrettoPoint>) {
        let mut s_1_shared = BitVec::new();
        let mut s_1_unshared = BitVec::new();

        let mut h_shared = Vec::new();
        let mut h_unshared = Vec::new();

        let shared_index_set: HashSet<(usize, usize)> = shared_indices.iter().cloned().collect();

        let m = b_slices.len();
        let k = b_slices[0].len();

        // Grab out the different shared and unshared bits.
        for i in 0..m {
            for j in 0..k {
                let index = (i, j);

                if shared_index_set.contains(&index) {
                    s_1_shared.extend(s_1[b_slices[index.0][index.1].clone()].iter());
                    h_shared.extend(h[b_slices[index.0][index.1].clone()].iter());
                } else {
                    s_1_unshared.extend(s_1[b_slices[index.0][index.1].clone()].iter());
                    h_unshared.extend(h[b_slices[index.0][index.1].clone()].iter());
                }
            }
        }

        // And then extend with the rest of the bits.
        let len_remaining = s_1_shared.len() + s_1_unshared.len();
        s_1_unshared.extend(s_1[len_remaining..].iter());
        h_unshared.extend(h[len_remaining..].iter());

        (s_1_shared, h_shared, s_1_unshared, h_unshared)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use sunscreen_math::ring::BarrettBackend;

    use crate::{
        math::{make_poly, next_higher_power_of_two},
        rings::ZqSeal128_8192,
        test::LatticeProblem,
        LogProofGenerators,
    };

    fn test_lattice<Q>(k: usize) -> LatticeProblem<Q>
    where
        Q: Ring + Clone + From<u64>,
    {
        let a = MatrixPoly::from([
            [
                make_poly::<Q>(&[1, 2, 3, 4, 5, 6, 7, 8]),
                make_poly::<Q>(&[1]),
                make_poly::<Q>(&[2]),
            ],
            [
                make_poly::<Q>(&[0]),
                make_poly::<Q>(&[1]),
                make_poly::<Q>(&[2]),
            ],
        ]);

        // Different messages scaled by the column index to ensure that mixed
        // bounds with different bound sums over each column works properly. We
        // use 16 to promote different b_1 values after taking the log of the
        // column bound sum.
        let s_coeff = vec![
            (0..(k))
                .map(|x| {
                    [1i64, 2, 3, 4, 5, 6, 7, 8]
                        .into_iter()
                        .map(|y| ((x * 16 + 1) as i64) * y)
                        .collect::<Vec<i64>>()
                })
                .collect::<Vec<Vec<i64>>>(),
            vec![vec![-1, 0, 1, 0, -1, 0, -1]; k],
            vec![vec![0, -1, 0, 1, -1, 0, 1]; k],
        ];

        let s_poly = s_coeff
            .iter()
            .map(|x| {
                x.iter()
                    .map(|y| make_poly::<Q>(y))
                    .collect::<Vec<Polynomial<Q>>>()
            })
            .collect::<Vec<Vec<Polynomial<Q>>>>();

        let s = MatrixPoly::from(s_poly);

        // x^8 + 1
        let f = make_poly::<Q>(&[1, 0, 0, 0, 0, 0, 0, 0, 1]);

        let d = f.vartime_degree();

        let t = &a * &s;

        let t_mod_f = t.map(|x| x.vartime_div_rem_restricted_rhs(&f).1);

        let b = Matrix::from(
            s_coeff
                .iter()
                .map(|row| {
                    row.iter()
                        .map(|coeffs| {
                            let mut coeffs = coeffs.clone();
                            coeffs.resize(d, 0);
                            Bounds(
                                coeffs
                                    .into_iter()
                                    .map(|x| {
                                        if x == 0 {
                                            0
                                        } else {
                                            next_higher_power_of_two(x.unsigned_abs())
                                        }
                                    })
                                    .collect::<Vec<u64>>(),
                            )
                        })
                        .collect::<Vec<Bounds>>()
                })
                .collect::<Vec<Vec<Bounds>>>(),
        );

        LatticeProblem {
            a,
            s,
            t: t_mod_f,
            f,
            b,
        }
    }

    #[test]
    fn can_compute_residues() {
        type Q = ZqSeal128_8192;

        let LatticeProblem {
            a,
            s,
            t: t_mod_f,
            f,
            b: _,
        } = test_lattice::<Q>(1);

        let (r_2, r_1) = LogProof::compute_factors(&a, &s, &t_mod_f, &f);

        let as_p: MatrixPoly<ZqRistretto> = a.mod_switch_signed() * s.mod_switch_signed();

        let r_1_q = r_1.scalar_mul_q(&ZqRistretto::try_from(Q::field_modulus()).unwrap());

        let r_2_f = (&r_2).scalar_mul(&f);

        let actual = as_p + r_1_q + r_2_f.mod_switch_signed();
        let expected = t_mod_f.mod_switch_signed();

        assert_eq!(actual, expected);
    }

    #[test]
    fn can_serialize() {
        type Fq = ZqSeal128_8192;

        let base_poly = make_poly::<Fq>(&[1, 2, 3]);

        let a = MatrixPoly::from([
            [
                &base_poly * Fq::from(1),
                &base_poly * Fq::from(2),
                &base_poly * Fq::from(3),
            ],
            [
                &base_poly * Fq::from(4),
                &base_poly * Fq::from(5),
                &base_poly * Fq::from(6),
            ],
        ]);

        // Check that we can pad the deficient polynomials with zeros.
        // So set d=4.
        let s = LogProof::serialize(&a, 4);

        let base_poly_ristretto = make_poly::<ZqRistretto>(&[1, 2, 3]);

        for (i, p) in s.chunks(4).enumerate() {
            let i = i + 1;
            assert_eq!(p.len(), 4);
            assert_eq!(p[0], (ZqRistretto::from(i as u64) * base_poly_ristretto[0]));
            assert_eq!(p[1], (ZqRistretto::from(i as u64) * base_poly_ristretto[1]));
            assert_eq!(p[2], (ZqRistretto::from(i as u64) * base_poly_ristretto[2]));
            // Should have a zero padding due to the d=4 passed to
            // serialize.
            assert_eq!(p[3], ZqRistretto::zero());
        }
    }

    #[test]
    fn can_2s_complement() {
        #[derive(sunscreen_math::BarrettConfig)]
        #[barrett_config(modulus = "257", num_limbs = 1)]
        struct ZqConfig;

        type Zr = Zq<1, BarrettBackend<1, ZqConfig>>;

        let mut vals = vec![];

        for i in 0..257 {
            let ring_val = Zr::from(i);
            vals.push(ring_val);
        }

        let bit_vec = LogProof::to_2s_complement(&vals, 9);

        assert_eq!(bit_vec.len(), 9 * vals.len());

        let sign_extend = |mut x: u16| {
            let sign = (x & 0x1 << 8) >> 8;

            for i in 9..16 {
                x |= sign << i;
            }

            x
        };

        for (i, c) in bit_vec.chunks(9).enumerate() {
            // Zq is mod 257, which produces unsigned values between [0,
            // 256] (inclusive). Under q's complement 128 is INT_MAX,
            // 129 is INT_MIN, which is -128, giving a range of [-128,
            // 128].
            // The value requiring the most bits is 128, which requires 9.
            //
            // Thus, we can compute the expected value from i by taking
            // it verbatim up to 128. Beyond that, we can
            // * subtract 1, since negative values start at 1, not 0 as the
            // positive values do.
            // * set the sign bit
            // * sign extend the value so it fill a u16.
            //
            // Finally, we transmute the value into an i16, so it should
            // appear as a signed value if we print it (for debugging).
            let mut expected = i as u16;

            if i > 128 {
                expected -= 1;
                expected |= 0x1 << 8;
                expected = sign_extend(expected);
            }

            let expected: i16 = unsafe { std::mem::transmute(expected) };

            assert_eq!(c.len(), 9);

            let mut actual = 0x0;

            for (j, bit) in c.iter().enumerate() {
                actual |= (*bit as u16) << j;
            }

            let actual = sign_extend(actual);
            let actual: i16 = unsafe { std::mem::transmute(actual) };

            assert_eq!(actual, expected);
        }
    }

    #[test]
    fn ristretto_identity_is_point_at_infinity() {
        let i = RistrettoPoint::identity();
        assert_eq!(i + i, i);
    }

    fn transcripts_match(k: usize) {
        type Fq = ZqSeal128_8192;

        let LatticeProblem { a, s, t, f, b } = test_lattice::<Fq>(k);

        let pk = ProverKnowledge::new(&a, &s, &t, &b, &f);

        let mut transcript = Transcript::new(b"test");
        let mut verify_transcript = transcript.clone();

        let gens = LogProofGenerators::new(pk.vk.l() as usize);
        let u = inner_product::VerifierKnowledge::get_u();

        let proof = LogProof::create(&mut transcript, &pk, &gens.g, &gens.h, &u);

        proof
            .verify(&mut verify_transcript, &pk.vk, &gens.g, &gens.h, &u)
            .unwrap();

        let l = transcript.challenge_scalar(b"verify");
        let r = verify_transcript.challenge_scalar(b"verify");

        assert_eq!(l, r);
    }

    #[test]
    fn transcripts_match_k_1() {
        transcripts_match(1);
    }

    #[test]
    fn transcripts_match_k_2() {
        transcripts_match(2);
    }

    #[test]
    fn transcripts_match_k_4() {
        transcripts_match(4);
    }
}
