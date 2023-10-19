use std::time::Instant;

use curve25519_dalek::{
    ristretto::{CompressedRistretto, RistrettoPoint},
    scalar::Scalar,
};
use digest::ExtendableOutput;
use digest::XofReader;
use merlin::Transcript;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use sha3::{self, digest::Update, Shake256};

use sunscreen_math::{RistrettoPointVec, ScalarVec};

use crate::error::ProofError;
use crate::{linear_algebra::InnerProduct, math::rand256};
use crate::{math::parallel_multiscalar_multiplication, transcript::LogProofTranscript};

#[derive(Debug, Clone)]
/**
 * Information known to both the prover and verifier.
 */
pub struct VerifierKnowledge {
    /**
     * A commitment to g^v_1 * h^v_2 * u^rho
     */
    pub t: RistrettoPoint,

    /**
     * The inner product of v_1 and v_2.
     */
    pub x: Scalar,
}

impl VerifierKnowledge {
    /**
     * Returns `u`, the generator used in the commitment's blinding term.
     */
    pub fn get_u() -> RistrettoPoint {
        let mut digest = Shake256::default();
        digest.update(b"u");

        let mut reader = digest.finalize_xof();

        let mut u = [0u8; 64];
        reader.read(&mut u);

        RistrettoPoint::from_uniform_bytes(&u)
    }
}

#[derive(Debug, Clone)]
/**
 * Information known only to the prover.
 */
pub struct ProverKnowledge {
    /**
     * The left vector of the inner product.
     */
    v_1: Vec<Scalar>,

    /**
     * The right vector of the inner product relation.
     */
    v_2: Vec<Scalar>,

    /**
     * A blinding factor;
     */
    rho: Scalar,

    /**
     * The knowledge shared between both the prover and verifier
     */
    pub vk: VerifierKnowledge,
}

impl ProverKnowledge {
    /**
     * Create a new [`ProverKnowledge`].
     */
    pub fn new(v_1: &[Scalar], v_2: &[Scalar], rho: &Scalar, t: &RistrettoPoint) -> Self {
        assert_eq!(v_1.len(), v_2.len());
        assert!(!v_1.is_empty());

        let x = v_1.inner_product(v_2);

        let vk = VerifierKnowledge { t: t.to_owned(), x };

        Self {
            v_1: v_1.to_owned(),
            v_2: v_2.to_owned(),
            rho: *rho,
            vk,
        }
    }

    /**
     * A handy function to generate a commitment to v_1 and v_2.
     * This is the `t` input to the verifier's knowledge.
     */
    pub fn make_commitment(
        v_1: &[Scalar],
        v_2: &[Scalar],
        rho: &Scalar,
        g: &[RistrettoPoint],
        h: &[RistrettoPoint],
        u: &RistrettoPoint,
    ) -> RistrettoPoint {
        let res = parallel_multiscalar_multiplication(
            &v_1.iter()
                .chain(v_2.iter())
                .chain([*rho].iter())
                .cloned()
                .collect::<Vec<Scalar>>(),
            &g.iter()
                .chain(h.iter())
                .chain([u.to_owned()].iter())
                .cloned()
                .collect::<Vec<RistrettoPoint>>(),
        );

        res
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
/**
 * A zero-knowledge proof that the provers knows 2 vectors `v_1` and `v_2`
 * whose inner product is `x`. `x` is public, but `v_1` and `v_2` are
 * only known by the prover.
 *
 * # Remarks
 * Unlike the original Bulletproofs inner product proof,
 * this version is modified to be zero-knowledge. This allows for simpler
 * range proofs.
 */
pub struct InnerProductProof {
    t_1: Vec<CompressedRistretto>,
    t_minus1: Vec<CompressedRistretto>,
    w: CompressedRistretto,
    w_prime: CompressedRistretto,
    z_1: Scalar,
    z_2: Scalar,
    tau: Scalar,
}

impl InnerProductProof {
    /**
     * Create an inner product proof that `dot(pk.v_1, pk.v_2) == pk.vk.x`. That
     * is, prove you know 2 secret vectors `v_1` and `v_2` whose inner product
     * is public `x`.
     *
     * # Remarks
     * `g`, `h` are slices of generators whose length must equal `pk.v_1.len()`.
     * `u` is a generator used in the commitment's blinding term.
     *
     * The vanilla algorithm requires v_2.len() be a power of 2, but this
     * implementation allows any non-zero length vectors. In such cases,
     * this method will effectively pad v_1 and v_2 with zeros to the next power
     * of two. This does not change the inner product.
     *
     * # Panics
     * If any of `g.len() != h.len() != pk.v_1.len() != pk.v_2.len()`.
     */
    pub fn create(
        transcript: &mut Transcript,
        pk: &ProverKnowledge,
        g: &[RistrettoPoint],
        h: &[RistrettoPoint],
        u: &RistrettoPoint,
    ) -> Self {
        let mut pk = pk.clone();

        assert_eq!(pk.v_1.len(), pk.v_2.len());
        assert_eq!(g.len(), h.len());
        assert_eq!(g.len(), pk.v_1.len());

        let len = g.len().next_power_of_two();
        let old_len = g.len();

        // Extend v_1, v_2, g, h to be a power of 2. Append zeros to v*
        // and any point to g, h.
        let g = [g, &vec![RistrettoPoint::default(); len - old_len]].concat();
        let h = [h, &vec![RistrettoPoint::default(); len - old_len]].concat();
        pk.v_1 = [pk.v_1.clone(), vec![Scalar::zero(); len - old_len]].concat();
        pk.v_2 = [pk.v_2.clone(), vec![Scalar::zero(); len - old_len]].concat();

        let vk = &pk.vk;

        let mut t_1 = vec![];
        let mut t_minus1 = vec![];

        transcript.inner_product_domain_separator();
        transcript.append_inner_product_knowledge(vk);

        let a = transcript.challenge_point(b"a");
        let t_prime = vk.t + a * vk.x;

        let (g, h, _t_pprime, v_1, v_2, rho_prime) = InnerProductProof::folding_prover(
            transcript,
            &pk,
            &mut t_1,
            &mut t_minus1,
            t_prime,
            &a,
            &g,
            &h,
            u,
        );

        debug_assert_eq!(
            _t_pprime,
            g * v_1 + h * v_2 + a * (v_1 * v_2) + u * rho_prime
        );

        let y_1 = Scalar::from_bits(rand256());
        let y_2 = Scalar::from_bits(rand256());
        let sigma = Scalar::from_bits(rand256());
        let sigma_prime = Scalar::from_bits(rand256());

        let w = g * y_1 + h * y_2 + a * (y_1 * v_2 + y_2 * v_1) + u * sigma;
        let w_prime = a * (y_1 * y_2) + u * sigma_prime;

        transcript.append_point(b"w", &w.compress());
        transcript.append_point(b"w'", &w_prime.compress());
        let c = transcript.challenge_scalar(b"c");

        let z_1 = y_1 + c * v_1;
        let z_2 = y_2 + c * v_2;
        let tau = c * rho_prime + sigma + c.invert() * sigma_prime;

        debug_assert_eq!(
            _t_pprime * c + w + w_prime * c.invert(),
            g * z_1 + h * z_2 + a * (c.invert() * z_1 * z_2) + u * tau
        );

        Self {
            w: w.compress(),
            w_prime: w_prime.compress(),
            tau,
            z_1,
            z_2,
            t_1,
            t_minus1,
        }
    }

    /**
     * Verifies the given inner product proof.
     *
     * # Remarks
     * If valid, returns nothing. If invalid, returns an error indicating
     * that either the proof is malformed or invalid.
     */
    pub fn verify(
        &self,
        transcript: &mut Transcript,
        vk: &VerifierKnowledge,
        g: &[RistrettoPoint],
        h: &[RistrettoPoint],
        u: &RistrettoPoint,
    ) -> Result<(), ProofError> {
        assert_eq!(g.len(), h.len());

        let now = Instant::now();
        let total = now;

        let len = g.len().next_power_of_two();
        let old_len = g.len();

        // Extend g and h to a power of 2.
        let vk = vk.clone();

        let g = [g, &vec![RistrettoPoint::default(); len - old_len]].concat();
        let h = [h, &vec![RistrettoPoint::default(); len - old_len]].concat();

        transcript.inner_product_domain_separator();
        transcript.append_inner_product_knowledge(&vk);

        let a = transcript.challenge_point(b"a");

        let (g, h, t_pprime) = self.folding_verifier(transcript, &vk, &a, &g, &h)?;

        transcript.append_point(b"w", &self.w);
        transcript.append_point(b"w'", &self.w_prime);
        let c = transcript.challenge_scalar(b"c");
        let c_inv = c.invert();

        let w = self.w.decompress().ok_or(ProofError::MalformedProof)?;
        let w_prime = self
            .w_prime
            .decompress()
            .ok_or(ProofError::MalformedProof)?;

        let lhs = t_pprime * c + w + w_prime * c_inv;
        let rhs = g * self.z_1 + h * self.z_2 + a * (c_inv * self.z_1 * self.z_2) + u * self.tau;

        if lhs == rhs {
            Ok(())
        } else {
            Err(ProofError::VerificationError)
        }
    }

    fn mad_scalar_point(
        v_1: &[RistrettoPoint],
        v_2: &[RistrettoPoint],
        c: Scalar,
    ) -> Vec<RistrettoPoint> {
        let v_1 = RistrettoPointVec::new(v_1);
        let v_2 = RistrettoPointVec::new(v_2);

        (v_1 + v_2 * c).into_iter().collect()
    }

    #[allow(clippy::too_many_arguments)]
    /**
     * This a single iteration of the folding algorithm run by both
     * the prover and verifier.
     *
     * # Remarks
     * It
     * * Creates a challenge point `c` and its inverse.
     * * Reduces `g` and `h` from length `n` to length `n/2`
     * * Computes an updated `t''`.
     * * Returns (`g'`, `h'`, `t''`, `c`, `c^-1`)
     */
    fn fold_verifier(
        transcript: &mut Transcript,
        t: &RistrettoPoint,
        t_1: &RistrettoPoint,
        t_minus1: &RistrettoPoint,
        g_t: &[RistrettoPoint],
        g_b: &[RistrettoPoint],
        h_t: &[RistrettoPoint],
        h_b: &[RistrettoPoint],
    ) -> (
        Vec<RistrettoPoint>,
        Vec<RistrettoPoint>,
        RistrettoPoint,
        Scalar,
        Scalar,
    ) {
        debug_assert!(g_t.len() == g_b.len());
        debug_assert!(h_t.len() == h_b.len());
        debug_assert!(g_t.len() == h_b.len());

        transcript.append_point(b"t-1", &t_minus1.compress());
        transcript.append_point(b"t1", &t_1.compress());

        let c = transcript.challenge_scalar(b"c");
        let c_inv = c.invert();

        let g = Self::mad_scalar_point(g_t, g_b, c);
        let h = Self::mad_scalar_point(h_t, h_b, c_inv);
        let t = t_minus1 * c_inv + t + t_1 * c;

        (g, h, t, c, c_inv)
    }

    /**
     * The full folding algorithm for the verifier.
     */
    fn folding_verifier(
        &self,
        transcript: &mut Transcript,
        vk: &VerifierKnowledge,
        a: &RistrettoPoint,
        g: &[RistrettoPoint],
        h: &[RistrettoPoint],
    ) -> Result<(RistrettoPoint, RistrettoPoint, RistrettoPoint), ProofError> {
        let mut t = vk.t + a * vk.x;

        if self.t_1.len() != self.t_minus1.len() {
            return Err(ProofError::MalformedProof);
        }

        if 0x1 << self.t_1.len() != g.len() {
            return Err(ProofError::MalformedProof);
        }

        let n = g.len();

        let mut c = vec![];

        // See Bulletproofs paper section 3.1 for what this optimization is. We're deferring
        // folding our generators g and h and instead computing factors s from each of the
        // challenge scalars.
        //
        // This allows us to compute a single MSM at the end to compute g and h rather than
        // performing SM folding.
        for (t_1, t_minus1) in self.t_1.iter().zip(self.t_minus1.iter()) {
            transcript.append_point(b"t-1", t_minus1);
            transcript.append_point(b"t1", t_1);

            c.push(transcript.challenge_scalar(b"c"));
        }

        let s_i = |i| {
            c.iter().rev().enumerate().fold(Scalar::one(), |p, (j, x)| {
                if i & (0x1 << j) != 0 {
                    p * x
                } else {
                    p
                }
            })
        };

        for ((t_1, t_minus_1), c) in self.t_1.iter().zip(self.t_minus1.iter()).zip(c.iter()) {
            let c_inv = c.invert();
            let t_1 = t_1.decompress().ok_or(ProofError::MalformedProof)?;
            let t_minus_1 = t_minus_1.decompress().ok_or(ProofError::MalformedProof)?;

            t = t_minus_1 * c_inv + t + t_1 * c;
        }

        let s = (0..n).into_par_iter().map(s_i).collect::<Vec<_>>();
        let s_inv = ScalarVec::new(&s).invert().into_iter().collect::<Vec<_>>();
        let now = Instant::now();
        let g = parallel_multiscalar_multiplication(&s, g);
        let h = parallel_multiscalar_multiplication(&s_inv, h);

        Ok((g, h, t))
    }

    #[allow(clippy::too_many_arguments)]
    /**
     * The full folding algorithm for the prover.
     */
    fn folding_prover(
        transcript: &mut Transcript,
        pk: &ProverKnowledge,
        t_1_vec: &mut Vec<CompressedRistretto>,
        t_minus1_vec: &mut Vec<CompressedRistretto>,
        t_prime: RistrettoPoint,
        a: &RistrettoPoint,
        g: &[RistrettoPoint],
        h: &[RistrettoPoint],
        u: &RistrettoPoint,
    ) -> (
        RistrettoPoint,
        RistrettoPoint,
        RistrettoPoint,
        Scalar,
        Scalar,
        Scalar,
    ) {
        let mut v_1 = pk.v_1.to_owned();
        let mut v_2 = pk.v_2.to_owned();
        let mut g = g.to_owned();
        let mut h = h.to_owned();
        let mut t = t_prime;

        let mut rho = pk.rho;

        loop {
            if v_1.len() == 1 {
                return (g[0], h[0], t, v_1[0], v_2[0], rho);
            }

            let n_2 = v_1.len() / 2;

            // Split g, h, v_1, v_2 into top and bottom slices
            // (_t and _b respectively)
            let (g_t, g_b) = g.split_at(n_2);
            let (h_t, h_b) = h.split_at(n_2);
            let (v_1_t, v_1_b) = v_1.split_at(n_2);
            let (v_2_t, v_2_b) = v_2.split_at(n_2);

            // Sample random sigma_1 and sigma_-1
            let sigma = Scalar::from_bits(rand256());
            let sigma_minus1 = Scalar::from_bits(rand256());

            let x_minus1 = v_1_b.inner_product(v_2_t);
            let x = v_1_t.inner_product(v_2_b);

            let t_minus1 = parallel_multiscalar_multiplication(
                &v_1_b
                    .iter()
                    .chain(v_2_t.iter())
                    .chain([x_minus1].iter())
                    .chain([sigma_minus1].iter())
                    .cloned()
                    .collect::<Vec<Scalar>>(),
                &g_t.iter()
                    .chain(h_b)
                    .chain([*a].iter())
                    .chain([*u].iter())
                    .cloned()
                    .collect::<Vec<RistrettoPoint>>(),
            );

            let t_1 = parallel_multiscalar_multiplication(
                &v_1_t
                    .iter()
                    .chain(v_2_b.iter())
                    .chain([x].iter())
                    .chain([sigma].iter())
                    .cloned()
                    .collect::<Vec<Scalar>>(),
                &g_b.iter()
                    .chain(h_t)
                    .chain([*a].iter())
                    .chain([*u].iter())
                    .cloned()
                    .collect::<Vec<RistrettoPoint>>(),
            );

            let c;
            let c_inv;

            debug_assert!(g.len() > 1);

            // Both the prover and verifier need to collapse g, h and compute
            // new t.
            (g, h, t, c, c_inv) =
                Self::fold_verifier(transcript, &t, &t_1, &t_minus1, g_t, g_b, h_t, h_b);

            let mad = |x: &[Scalar], y: &[Scalar], z: Scalar| {
                x.iter().zip(y.iter()).map(|(a, b)| a + b * z).collect()
            };

            // Prover needs to collapse vectors and update rho.
            v_1 = mad(v_1_t, v_1_b, c_inv);
            v_2 = mad(v_2_t, v_2_b, c);

            t_1_vec.push(t_1.compress());
            t_minus1_vec.push(t_minus1.compress());

            rho = c_inv * sigma_minus1 + rho + c * sigma;
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::LogProofGenerators;

    use super::*;

    #[test]
    fn can_create_prover_knowlege() {
        let a = [Scalar::from(7u64); 8];
        let b = [Scalar::from(8u64); 8];

        let rho = Scalar::from_bytes_mod_order(rand256());

        let gens = LogProofGenerators::new(8);
        let u = VerifierKnowledge::get_u();

        let t = ProverKnowledge::make_commitment(&a, &b, &rho, &gens.g, &gens.h, &u);
        ProverKnowledge::new(&a, &b, &rho, &t);
    }

    #[test]
    fn proof_and_verify_product_same_transcript() {
        let a = [Scalar::from(7u64); 8];
        let b = [Scalar::from(8u64); 8];

        let gens = LogProofGenerators::new(8);
        let u = VerifierKnowledge::get_u();

        let rho = Scalar::from_bytes_mod_order(rand256());
        let t = ProverKnowledge::make_commitment(&a, &b, &rho, &gens.g, &gens.h, &u);

        let pk = ProverKnowledge::new(&a, &b, &rho, &t);

        let transcript_label = b"I am governor Jerry Brown";

        let mut transcript_prove = Transcript::new(transcript_label);

        let proof = InnerProductProof::create(&mut transcript_prove, &pk, &gens.g, &gens.h, &u);

        let mut transcript_verify = Transcript::new(transcript_label);

        let _ = proof.verify(&mut transcript_verify, &pk.vk, &gens.g, &gens.h, &u);

        let challenge_label = b"My aura smiles and never frowns";

        let mut c_1 = [0u8; 16];
        let mut c_2 = [0u8; 16];

        transcript_prove.challenge_bytes(challenge_label, &mut c_1);
        transcript_verify.challenge_bytes(challenge_label, &mut c_2);

        assert_eq!(c_1, c_2);
    }

    #[cfg(test)]
    mod test {
        use super::*;

        fn validate_proof(n: usize) {
            let mut a = Vec::<Scalar>::with_capacity(n);
            let mut b = Vec::<Scalar>::with_capacity(n);

            for i in 0..n {
                a.push(Scalar::from(i as u64));
                b.push(Scalar::from(i as u64));
            }

            let gens = LogProofGenerators::new(n);
            let u = VerifierKnowledge::get_u();

            let rho = Scalar::from_bytes_mod_order(rand256());
            let t = ProverKnowledge::make_commitment(&a, &b, &rho, &gens.g, &gens.h, &u);

            let pk = ProverKnowledge::new(&a, &b, &rho, &t);

            let transcript_label = b"I am governor Jerry Brown";

            let mut transcript_prove = Transcript::new(transcript_label);

            let proof = InnerProductProof::create(&mut transcript_prove, &pk, &gens.g, &gens.h, &u);

            let mut transcript_verify = Transcript::new(transcript_label);

            proof
                .verify(&mut transcript_verify, &pk.vk, &gens.g, &gens.h, &u)
                .unwrap();
        }

        #[test]
        fn can_verify_valid_proof_1() {
            validate_proof(1);
        }

        #[test]
        fn can_verify_valid_proof_2() {
            validate_proof(2);
        }

        #[test]
        fn can_verify_valid_proof_4() {
            validate_proof(4);
        }

        #[test]
        fn can_verify_valid_proof_8() {
            validate_proof(8);
        }

        #[test]
        fn can_verify_valid_proof_16() {
            validate_proof(16);
        }

        #[test]
        fn can_verify_valid_proof_1024() {
            validate_proof(1024);
        }

        #[test]
        fn can_verify_proof_of_zeros() {
            let a = vec![Scalar::from(0u8); 8];
            let b = vec![Scalar::from(0u8); 8];

            let gens = LogProofGenerators::new(8);
            let u = VerifierKnowledge::get_u();

            let rho = Scalar::from_bytes_mod_order(rand256());
            let t = ProverKnowledge::make_commitment(&a, &b, &rho, &gens.g, &gens.h, &u);

            let pk = ProverKnowledge::new(&a, &b, &rho, &t);

            let transcript_label = b"I am governor Jerry Brown";

            let mut transcript_prove = Transcript::new(transcript_label);

            let proof = InnerProductProof::create(&mut transcript_prove, &pk, &gens.g, &gens.h, &u);

            let mut transcript_verify = Transcript::new(transcript_label);

            proof
                .verify(&mut transcript_verify, &pk.vk, &gens.g, &gens.h, &u)
                .unwrap();
        }

        #[test]
        fn can_verify_valid_proof_11() {
            validate_proof(11);
        }
    }
}
