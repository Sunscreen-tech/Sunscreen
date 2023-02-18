use ark_ff::{BigInt, BigInteger, FftField, Field, Fp, FpConfig, MontBackend, MontConfig};
use ark_poly::{univariate::DensePolynomial, Polynomial};
use bitvec::{slice::BitSlice, vec::BitVec};
use curve25519_dalek::{ristretto::RistrettoPoint, scalar::Scalar, traits::Identity};
use merlin::Transcript;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use sunscreen_math::{RistrettoPointVec, ScalarVec};

use crate::{
    assertions::linear_relation,
    crypto::CryptoHash,
    fields::{FieldFrom, FieldInto, FpRistretto},
    inner_product::{self, InnerProductProof},
    linear_algebra::{InnerProduct, Matrix, ScalarMul, ScalarRem},
    math::{
        parallel_multiscalar_multiplication, rand256, FieldModulus, InfinityNorm, Log2, ModSwitch,
        Powers, SmartMul, Tensor, TwosComplementCoeffs, Zero,
    },
    transcript::LogProofTranscript,
    ProofError,
};

type MatrixPoly<Q> = Matrix<DensePolynomial<Q>>;

#[derive(Debug)]
/**
 * The artifacts known to both the prover and verifier.
 */
pub struct VerifierKnowledge<Q>
where
    Q: Field + CryptoHash + ModSwitch<FpRistretto> + FieldModulus<4>,
{
    /**
     * The linear transform matrix A. `AS=T` should describe a series
     * of RLWE/SIS instances (one per column of s and t) to ensure hardness
     * in retrieving `S`.
     */
    pub a: Matrix<DensePolynomial<Q>>,

    /**
     * The result of `AS`.
     */
    pub t: Matrix<DensePolynomial<Q>>,

    /**
     * A bound on the largest coefficient in any polynomial in s.
     */
    pub bound: u64,

    /**
     * The ideal `f` that defines the quotient ring `Z_q[X]/f`.
     *
     * # Remarks
     * For FHE, this is usually `x^d+1` where `d` is a power of 2.
     */
    pub f: DensePolynomial<Q>,
}

impl<Q> VerifierKnowledge<Q>
where
    Q: Field + CryptoHash + ModSwitch<FpRistretto> + FieldModulus<4>,
{
    /**
     * Constructs [`VerifierKnowledge`] from the given public information.
     */
    pub fn new(
        a: Matrix<DensePolynomial<Q>>,
        t: Matrix<DensePolynomial<Q>>,
        f: DensePolynomial<Q>,
        bound: u64,
    ) -> Self {
        // Fill in surrogates for g, h, and u. This way we can create the
        // object and compute `l` to pass to get_generators().
        Self { a, t, bound, f }
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
    pub fn b(&self) -> u64 {
        Log2::log2(&self.bound) + 1
    }

    /**
     * The degree of `f`.
     */
    pub fn d(&self) -> u64 {
        self.f.degree() as u64
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
     * Computes the mkdb term in l.
     */
    pub fn mkdb(&self) -> u64 {
        self.m() * self.k() * self.d() * self.b()
    }

    /**
     * The number of bits needed to store the elements of R1.
     */
    pub fn b_1(&self) -> u64 {
        let m_big = FpRistretto::from(self.m());
        let d_big = FpRistretto::from(self.d());
        let bound_big = FpRistretto::from(self.bound);

        let inf_norm_f: FpRistretto = self.f.infinity_norm().mod_switch_signed();

        let b1 = m_big * d_big * bound_big + d_big * inf_norm_f;
        let b1 = MontBackend::into_bigint(b1);

        Log2::log2(&b1)
    }

    /**
     * The number of bits needed to store values in `Fp<Q>`.
     */
    pub fn b_2(&self) -> u64 {
        Log2::log2(&Q::field_modulus()) + 1
    }

    /**
     * The length in bits of the binary expansion of the serialized secret * vectors.
     */
    pub fn l(&self) -> u64 {
        let mkdb = self
            .m()
            .checked_mul(self.k())
            .unwrap()
            .checked_mul(self.d())
            .unwrap()
            .checked_mul(self.b())
            .unwrap();
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

        mkdb.checked_add(nk_d2_minus_1_b_1)
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
    Q: Field + CryptoHash + ModSwitch<FpRistretto> + FieldModulus<4>,
{
    /**
     * The matrix containing the secret.
     */
    pub s: Matrix<DensePolynomial<Q>>,

    /**
     * Shared knowlege.
     */
    pub vk: VerifierKnowledge<Q>,
}

impl<Q> ProverKnowledge<Q>
where
    Q: Field + ModSwitch<FpRistretto> + FieldModulus<4> + CryptoHash,
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
        bound: u64,
        f: &DensePolynomial<Q>,
    ) -> Self {
        assert_eq!(a.cols, s.rows);
        assert_eq!(a.rows, t.rows);
        assert_eq!(s.cols, t.cols);

        let vk = VerifierKnowledge::new(a.clone(), t.clone(), f.clone(), bound);

        Self { s: s.clone(), vk }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
/**
 * A proof in zero-knowlege of a linear relation of the form `AS=T`.
 * `A` and `T` are public while `S` is a secret known to the prover.
 */
pub struct LogProof {
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
        Q: Field
            + ModSwitch<FpRistretto>
            + FftField
            + SmartMul<Q, Output = Q>
            + CryptoHash
            + Zero
            + FieldModulus<4>,
    {
        println!("Prover");

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

        assert_eq!(g.len(), l as usize);
        assert_eq!(h.len(), l as usize);

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

        println!("Serializing...");

        let s_serialized = Self::serialize(&pk.s, d as usize);
        let r_1_serialized = Self::serialize(&r_1, (2 * d - 1) as usize);
        let r_2_serialized = Self::serialize(&r_2, (d - 1) as usize);

        assert_eq!(s_serialized.len() as u64, m * k * d);
        assert_eq!(r_1_serialized.len() as u64, n * k * (2 * d - 1));
        assert_eq!(r_2_serialized.len() as u64, n * k * (d - 1));

        println!("To two's complement");

        let s_binary = Self::to_2s_complement(&s_serialized, b);
        assert_eq!(s_binary.len() as u64, m * k * d * b);
        let r_1_binary = Self::to_2s_complement(&r_1_serialized, b_1);
        assert_eq!(r_1_binary.len() as u64, n * k * (2 * d - 1) * b_1);
        let r_2_binary = Self::to_2s_complement(&r_2_serialized, b_2);
        assert_eq!(r_2_binary.len() as u64, n * k * (d - 1) * b_2);

        // Yes, cloning isn't ideal, but we want to keep the
        // non-concatenated vectors around for the debug assertions below.
        // The memory overhead of a bitvec with even 1M elements is only
        // 128kB and a copy at 40GB/s is 3us.
        let mut s_1 = s_binary.clone();
        s_1.append(&mut r_1_binary.clone());
        s_1.append(&mut r_2_binary.clone());

        // The SDLP paper calls for xoring s_1 with the constant 1, which
        // inverts the bits. Bitwise NOT does the same thing.
        let s_2 = !s_1.clone();

        let rho = Scalar::from_bits(rand256());
        let w = Self::make_commitment(&s_1, &s_2, &rho, g, h, u);

        transcript.append_point(b"w", &w.compress());

        println!("Generating challenges");

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

        println!("Making g'...");
        let g_prime = Self::compute_g_prime(g, &phi);

        println!("Computing v");
        let v = Self::compute_v(vk, alpha, &beta, &gamma);

        println!("Generating commitment...");

        let t = Self::compute_t(&w, &g_prime, h, &phi, &psi, &v);

        println!("Computing v_1");
        let v_1 = Self::compute_v1(&v, &phi, &s_2, &psi);
        println!("Computing 2");
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

        println!("Generating inner product proof...");

        let inner_product_proof =
            Self::create_inner_product_proof(transcript, &v_1, &v_2, &rho, &t, &g_prime, h, u);

        Self {
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
        Q: Field + ModSwitch<FpRistretto> + FieldModulus<4> + FieldModulus<4> + CryptoHash + Zero,
    {
        println!("Verifier");

        transcript.linear_relation_domain_separator();
        transcript.append_linear_relation_knowledge(vk);

        transcript.append_point(b"w", &self.w.compress());

        let (alpha, beta, gamma, phi, psi) = Self::create_challenges(vk, transcript);

        let g_prime = Self::compute_g_prime(g, &phi);

        let v = Self::compute_v(vk, alpha, &beta, &gamma);

        let t = Self::compute_t(&self.w, &g_prime, h, &phi, &psi, &v);

        let x = Self::compute_x(vk, &gamma, &alpha, &beta, &phi, &psi, &v);

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
        Q: Field + CryptoHash + ModSwitch<FpRistretto> + FieldModulus<4>,
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

    fn compute_v<Q>(
        vk: &VerifierKnowledge<Q>,
        alpha: Scalar,
        beta: &[Scalar],
        gamma: &[Scalar],
    ) -> Vec<Scalar>
    where
        Q: Field + CryptoHash + Zero + ModSwitch<FpRistretto> + FieldModulus<4>,
    {
        assert_eq!(beta.len(), vk.t.cols);
        assert_eq!(gamma.len(), vk.a.rows);

        let n = vk.n();
        let m = vk.m();
        let k = vk.k();
        let d = vk.d();
        let b = vk.b();
        let l = vk.l();
        let b_1 = vk.b_1();
        let b_2 = vk.b_2();

        // Compute term 1
        let two_b = Scalar::twos_complement_coeffs(b as usize);
        let alpha_d = alpha.powers(d as usize);

        // vk.a is in (Z_q[X]/f)^(m x k), so we need to mod switch to Z_p[X].
        let a = vk.a.mod_switch_signed();

        let a_eval: Matrix<Scalar> = a.evaluate(&alpha.field_into()).transpose().field_into();

        let gamma_as_matrix = Matrix::from(gamma);

        let a_eval_gamma = a_eval * &gamma_as_matrix;

        let mut term_1 = a_eval_gamma.tensor(beta).tensor(alpha_d).tensor(two_b);
        assert_eq!(term_1.len() as u64, b * d * m * k);

        // Compute term 2
        let q = FpRistretto::from(Q::field_modulus());
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
        Q: Field + CryptoHash + FieldModulus<4> + ModSwitch<FpRistretto>,
    {
        let l = vk.l();

        let alpha = transcript.challenge_scalar(b"alpha");
        let beta = transcript.challenge_scalars(b"beta", vk.t.cols);
        let gamma = transcript.challenge_scalars(b"gamma", vk.a.rows);
        let phi = transcript.challenge_scalars(b"phi", l as usize);
        let psi = transcript.challenge_scalar(b"psi");

        (alpha, beta, gamma, phi, psi)
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
        assert_eq!(s_1.len(), g.len());
        assert_eq!(s_2.len(), h.len());
        assert_eq!(s_1.len(), s_2.len());

        let mut commitment = RistrettoPoint::identity();
        let s_1 = s_1.iter().map(|b| b == true).collect::<Vec<bool>>();
        let s_2 = s_2.iter().map(|b| b == true).collect::<Vec<bool>>();

        commitment += s_1
            .par_iter()
            .enumerate()
            .fold(
                RistrettoPoint::identity,
                |c, (i, bit)| {
                    if *bit {
                        c + h[i]
                    } else {
                        c
                    }
                },
            )
            .reduce(RistrettoPoint::identity, |x, y| x + y);

        commitment += s_2
            .par_iter()
            .enumerate()
            .fold(
                RistrettoPoint::identity,
                |c, (i, bit)| {
                    if *bit {
                        c + g[i]
                    } else {
                        c
                    }
                },
            )
            .reduce(RistrettoPoint::identity, |x, y| x + y);

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
        f: &DensePolynomial<Q>,
    ) -> (MatrixPoly<Q>, MatrixPoly<FpRistretto>)
    where
        Q: Field + ModSwitch<FpRistretto> + FftField + SmartMul<Q, Output = Q> + FieldModulus<4>,
    {
        let as_q = a * s;
        let t_as_q = t - &as_q;

        // f should evenly divide (t - as).
        debug_assert_eq!((&t_as_q).scalar_rem(f), Matrix::new(t.rows, t.cols));

        let r_2 = &t_as_q / f;

        let as_p = a.mod_switch_signed() * s.mod_switch_signed();
        let t_as_p = t.mod_switch_signed() - as_p;
        let r_1 = t_as_p - r_2.mod_switch_signed().scalar_mul(f.mod_switch_signed());
        let r_1 = r_1.scalar_div_q(&FpRistretto::from(Q::field_modulus()));

        (r_2, r_1)
    }

    /**
     * Takes a slice of values in a field `Zq`, treats the values as signed [q's
     * complement](https://en.wikipedia.org/wiki/Method_of_complements)
     * and converts the value to binary 2's complement.
     *
     * `value` is the element in Zq and `b` is the number of bits needed
     * to represent the
     */
    fn to_2s_complement<Q, const N: usize>(
        values: &[Fp<MontBackend<Q, N>, N>],
        log_b: u64,
    ) -> BitVec
    where
        Q: MontConfig<N>,
    {
        let mut bitvec = BitVec::with_capacity(values.len() * log_b as usize);

        // This code should not feature timing side-channels.
        for value in values.iter() {
            // Get the value out of Montgomery form.
            let value = MontBackend::into_bigint(*value);

            let mod_div_2 = Fp::<MontBackend<Q, N>, N>::field_modulus_div_2();
            let modulus = Fp::<MontBackend<Q, N>, N>::field_modulus();
            let is_negative = value > mod_div_2;

            // Compute the q's complement of value
            let mut as_neg: BigInt<N> = modulus;
            as_neg.sub_with_borrow(&value);

            // The smaller of value and it's q's complement is the absolute
            // value.
            let mut abs_value = BigInt::min(value, as_neg);

            // To make a positive number negative in 2's complement,
            // subtract 1 and flip the bits. So, here we sub 1 from abs if
            // original value was negative.
            let big_negative = BigInt::from(is_negative as u8);
            abs_value.sub_with_borrow(&big_negative);

            for i in 0..(log_b - 1) {
                let bit = abs_value.get_bit(i as usize);

                // Invert the bit if the original value was negative
                bitvec.push(bit ^ is_negative);
            }

            // Now push the sign bit
            bitvec.push(is_negative);
        }

        bitvec
    }

    /**
     * Turns a `Matrix<DensePolynomial<Q>>` into a `Vec<FpRistretto>`.
     *
     * # Remarks
     * The matrix is serialized in row-major order, with polynomial
     * coefficients being contiguous.
     */
    pub fn serialize<Q>(x: &MatrixPoly<Q>, d: usize) -> Vec<FpRistretto>
    where
        Q: Field + ModSwitch<FpRistretto>,
    {
        let mut result = vec![];

        for i in 0..x.rows {
            for j in 0..x.cols {
                let poly = &x[(i, j)];

                for c in &poly.coeffs {
                    result.push(c.mod_switch_signed());
                }

                // The polynomial may be less than degree d, in which case
                // we need to pad with zeros.
                for _ in poly.coeffs.len()..d {
                    result.push(FpRistretto::zero());
                }
            }
        }

        result
    }
}

#[cfg(test)]
mod test {
    use crate::{
        fields::FqSeal128_8192,
        linear_algebra::ScalarRem,
        math::{make_poly, Zero},
        LogProofGenerators,
    };

    use super::*;

    fn test_lattice<Q>() -> (
        MatrixPoly<Q>,
        MatrixPoly<Q>,
        MatrixPoly<Q>,
        DensePolynomial<Q>,
    )
    where
        Q: Field + Zero + Clone + FftField,
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

        let s = MatrixPoly::from([
            [make_poly::<Q>(&[1, 2, 3, 4, 5, 6, 7, 8])],
            [make_poly::<Q>(&[1, 0, 1, 0, 1, 0, 1])],
            [make_poly::<Q>(&[0, 1, 0, 1, 1, 0, 1])],
        ]);

        // x^8 + 1
        let f = make_poly::<Q>(&[1, 0, 0, 0, 0, 0, 0, 0, 1]);

        let t = &a * &s;

        let t_mod_f = (&t).scalar_rem(&f);

        (a, s, t_mod_f, f)
    }

    #[test]
    fn can_compute_residues() {
        type Q = FqSeal128_8192;

        let (a, s, t_mod_f, f) = test_lattice::<Q>();

        let (r_2, r_1) = LogProof::compute_factors(&a, &s, &t_mod_f, &f);

        let as_p: MatrixPoly<FpRistretto> = a.mod_switch_signed() * s.mod_switch_signed();

        let r_1_q = r_1.scalar_mul_q(&FpRistretto::from(Q::field_modulus()));

        let r_2_f = (&r_2).scalar_mul(&f);

        let actual = as_p + r_1_q + r_2_f.mod_switch_signed();
        let expected = t_mod_f.mod_switch_signed();

        assert_eq!(actual, expected);
    }

    #[test]
    fn can_serialize() {
        type Fq = FqSeal128_8192;

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

        let base_poly_ristretto = make_poly::<FpRistretto>(&[1, 2, 3]);

        for (i, p) in s.chunks(4).enumerate() {
            let i = i + 1;
            assert_eq!(p.len(), 4);
            assert_eq!(p[0], (FpRistretto::from(i as u64) * base_poly_ristretto[0]));
            assert_eq!(p[1], (FpRistretto::from(i as u64) * base_poly_ristretto[1]));
            assert_eq!(p[2], (FpRistretto::from(i as u64) * base_poly_ristretto[2]));
            // Should have a zero padding due to the d=4 passed to
            // serialize.
            assert_eq!(p[3], FpRistretto::zero());
        }
    }

    #[test]
    fn can_2s_complement() {
        #[derive(MontConfig)]
        #[modulus = "257"]
        #[generator = "3"] // Liar liar pants on fire.
        struct ZqConfig;

        type Zq = Fp<MontBackend<ZqConfig, 1>, 1>;

        let mut vals = vec![];

        for i in 0..257 {
            let field_val = Zq::from(i);
            vals.push(field_val);
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

    #[test]
    fn transcripts_match() {
        type Fq = FqSeal128_8192;

        let (a, s, t, f) = test_lattice::<Fq>();

        let pk = ProverKnowledge::new(&a, &s, &t, 16, &f);

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
}

#[cfg(all(test, feature = "nightly-features"))]
mod benches {
    use crate::{fields::FqSeal128_4096, math::make_poly, LogProofGenerators};

    use super::*;
    use std::time::Instant;

    extern crate test;
    use test::Bencher;

    fn f<F: Field>(degree: usize) -> DensePolynomial<F> {
        let mut coeffs = Vec::with_capacity(degree + 1);
        coeffs.push(F::ONE);

        for _ in 0..degree - 1 {
            coeffs.push(F::ZERO);
        }

        coeffs.push(F::ONE);

        DensePolynomial { coeffs }
    }

    #[bench]
    fn bfv_benchmark(_: &mut Bencher) {
        type Q = FqSeal128_4096;

        const POLY_DEGREE: u64 = 4096u64;
        const BIT_SIZE: u64 = 2 << 8;

        println!("Generating data...");

        let coeffs = (0..POLY_DEGREE)
            .map(|x| x % 2)
            .into_iter()
            .collect::<Vec<u64>>();

        let delta = make_poly::<Q>(&[1234]);
        let p_0 = make_poly::<Q>(&coeffs);
        let p_1 = p_0.clone();

        let one = make_poly(&[1]);
        let zero = make_poly(&[0]);

        let a = MatrixPoly::from([
            [delta.clone(), p_0.clone(), one.clone(), zero.clone()],
            [zero.clone(), p_1.clone(), zero.clone(), one.clone()],
            [delta.clone(), p_0.clone(), one.clone(), zero.clone()],
            [zero.clone(), p_1.clone(), zero.clone(), one.clone()],
            [delta.clone(), p_0.clone(), one.clone(), zero.clone()],
            [zero.clone(), p_1.clone(), zero.clone(), one.clone()],
        ]);

        let m = p_0.clone();
        let u = p_0.clone();
        let e_1 = p_0.clone();
        let e_2 = p_0.clone();

        let s = MatrixPoly::from([[m], [u], [e_1], [e_2]]);

        let f = f::<FqSeal128_4096>(POLY_DEGREE as usize);

        let t = &a * &s;
        let t = t.scalar_rem(&f);

        let mut transcript = Transcript::new(b"test");

        println!("Generating prover knowlege");

        let now = Instant::now();

        let pk = ProverKnowledge::new(&a, &s, &t, BIT_SIZE, &f);

        println!("Generate PK {}s", now.elapsed().as_secs_f64());

        println!("b={}", pk.vk.b());
        println!("b_1={}", pk.vk.b_1());
        println!("b_2={}", pk.vk.b_2());
        println!("mkdb={}", pk.vk.mkdb());
        println!("nk(2d-1)b_1={}", pk.vk.nk_2d_min_1_b_1());
        println!("nk(d-1)b_2={}", pk.vk.nk_d_min_1_b_2());
        println!("l={}", pk.vk.l());

        println!("Starting proof...");

        let gens = LogProofGenerators::new(pk.vk.l() as usize);
        let u = inner_product::VerifierKnowledge::get_u();

        let now = Instant::now();

        let proof = LogProof::create(&mut transcript, &pk, &gens.g, &gens.h, &u);

        println!("Prover time {}s", now.elapsed().as_secs_f64());
        println!("Proof size {}B", bincode::serialize(&proof).unwrap().len());

        let mut transcript = Transcript::new(b"test");

        let now = Instant::now();

        proof
            .verify(&mut transcript, &pk.vk, &gens.g, &gens.h, &u)
            .unwrap();

        println!("Verifier time {}s", now.elapsed().as_secs_f64());
    }
}
