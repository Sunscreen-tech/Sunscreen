use ark_ff::Field;
use curve25519_dalek::{
    ristretto::{CompressedRistretto, RistrettoPoint},
    scalar::Scalar,
};
use digest::{Digest, FixedOutput};

use rayon::prelude::*;
use sha3::Sha3_256;

use crate::{
    crypto::CryptoHash,
    fields::FpRistretto,
    inner_product::{self},
    linear_relation::{self},
    math::{FieldModulus, ModSwitch},
};

pub trait LogProofTranscript {
    /**
     * Append the given Ristretto point to the transcript.
     */
    fn append_point(&mut self, label: &'static [u8], point: &CompressedRistretto);

    /**
     * Append the given scalar to the transcript.
     */
    fn append_scalar(&mut self, label: &'static [u8], scalar: &Scalar);

    /**
     * Creates a challenge scalar hashed from the transcript thus far.
     *
     * # Remarks
     * While this function *can* theoretically produce zero scalars,
     * the probability of doing so is O(1/2^255).
     */
    fn challenge_scalar(&mut self, label: &'static [u8]) -> Scalar;

    /**
     * Creates a vector of challenge scalars hashed from the transcript
     * thus far.
     *
     * # Remarks
     * While this function *can* theoretically produce zero scalars,
     * the probability of doing so is O(1/2^255) per scalar.
     */
    fn challenge_scalars(&mut self, label: &'static [u8], len: usize) -> Vec<Scalar>;

    /**
     * Creates a challenge Ristretto Point hashed from the transcript thus
     * far.
     */
    fn challenge_point(&mut self, label: &'static [u8]) -> RistrettoPoint;

    /**
     * Insert a marker indicating the start of an inner product proof.
     */
    fn inner_product_domain_separator(&mut self);

    /**
     * Insert a marker indicating the start of a linear relation proof.
     */
    fn linear_relation_domain_separator(&mut self);

    /**
     * Appends an inner product problem statement.
     */
    fn append_inner_product_knowledge(&mut self, vk: &inner_product::VerifierKnowledge);

    /**
     * Appends a linear relation problem statement.
     */
    fn append_linear_relation_knowledge<Q>(&mut self, vk: &linear_relation::VerifierKnowledge<Q>)
    where
        Q: Field + CryptoHash + ModSwitch<FpRistretto> + FieldModulus<4>;
}

impl LogProofTranscript for merlin::Transcript {
    fn inner_product_domain_separator(&mut self) {
        self.append_message(b"dom-sep", b"ipp v1");
    }

    fn linear_relation_domain_separator(&mut self) {
        self.append_message(b"dom-sep", b"lr v1");
    }

    fn append_point(&mut self, label: &'static [u8], point: &CompressedRistretto) {
        self.append_message(label, point.as_bytes());
    }

    fn append_scalar(&mut self, label: &'static [u8], scalar: &Scalar) {
        self.append_message(label, scalar.as_bytes());
    }

    fn challenge_point(&mut self, label: &'static [u8]) -> RistrettoPoint {
        let mut buf = [0u8; 64];
        self.challenge_bytes(label, &mut buf);

        RistrettoPoint::from_uniform_bytes(&buf)
    }

    fn challenge_scalar(&mut self, label: &'static [u8]) -> Scalar {
        let mut buf = [0u8; 64];
        self.challenge_bytes(label, &mut buf);

        Scalar::from_bytes_mod_order_wide(&buf)
    }

    fn challenge_scalars(&mut self, label: &'static [u8], len: usize) -> Vec<Scalar> {
        /*
        // Serial implementation...
        let mut result = Vec::with_capacity(len);

        for _ in 0..len {
            result.push(self.challenge_scalar(label));
        }

        result
         */

        // TODO: Ask David if this is sketchy...
        // We make 128 copies (each with an appended message of their index) of this transcript
        // so we can parallelize challenge generation. We then recombine the challenges and
        // append a challenge from the child transcripts onto the main transcript.
        let mut batch_transcripts = vec![];

        const NUM_BATCHES: usize = 128usize;

        for i in 0..NUM_BATCHES {
            let mut t = self.clone();
            t.append_u64(b"fork", i as u64);
            batch_transcripts.push(t);
        }

        let mut challenges: Vec<Vec<Scalar>> = vec![];

        batch_transcripts
            .par_iter_mut()
            .enumerate()
            .map(|(i, t)| {
                let mut batch = vec![];

                let batch_size = if i == NUM_BATCHES - 1 {
                    len - (len / NUM_BATCHES) * (NUM_BATCHES - 1)
                } else {
                    len / NUM_BATCHES
                };

                for _ in 0..batch_size {
                    batch.push(t.challenge_scalar(label));
                }

                batch
            })
            .collect_into_vec(&mut challenges);

        for t in batch_transcripts.iter_mut() {
            let mut challenge = [0u8; 128];
            t.challenge_bytes(b"join", &mut challenge);
            self.append_message(b"join", &challenge);
        }

        challenges.concat()
    }

    fn append_inner_product_knowledge(&mut self, vk: &inner_product::VerifierKnowledge) {
        // Take n to be the length of the vectors in the inner product.
        // Append t, n, u, and x to the transcript.
        self.append_message(b"t", vk.t.compress().as_bytes());
        self.append_message(b"x", vk.x.as_bytes());
    }

    fn append_linear_relation_knowledge<Q>(&mut self, vk: &linear_relation::VerifierKnowledge<Q>)
    where
        Q: Field + CryptoHash + ModSwitch<FpRistretto> + FieldModulus<4>,
    {
        self.append_u64(b"m", vk.a.rows as u64);
        self.append_u64(b"k", vk.a.cols as u64);
        self.append_u64(b"n", vk.t.cols as u64);

        let mut hasher = Sha3_256::new();

        vk.a.crypto_hash(&mut hasher);
        vk.t.crypto_hash(&mut hasher);

        let hash = hasher.finalize_fixed();

        self.append_message(b"a+t", &hash);

        // Note that Merlin/STROBE uses little endian for its encoding, so we do
        // the same here.
        let b_message: Vec<u8> = vk
            .b()
            .as_slice()
            .iter()
            .flat_map(|x| x.iter().flat_map(|y| y.to_le_bytes()).collect::<Vec<u8>>())
            .collect();
        self.append_message(b"b", &b_message);
    }
}
