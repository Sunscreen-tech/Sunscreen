use logproof::{
    crypto::CryptoHash,
    linear_algebra::{Matrix, PolynomialMatrix},
    math::ModSwitch,
    rings::ZqRistretto,
    Bounds, LogProofProverKnowledge, LogProofVerifierKnowledge as VerifierKnowledge,
};
use sunscreen_math::{
    poly::Polynomial,
    ring::{BarrettBackend, Ring, RingModulus, Zq},
    BarrettConfig, One, Zero,
};

use crate::{
    entities::{LweCiphertext, LwePublicKey, LweSecretKey, TlwePublicEncRandomness},
    math::{Torus, TorusOps},
    LweDef, PlaintextBits,
};

/// Proof statements for the SDLP proof system when applied to TFHE.
#[derive(Debug)]
pub enum ProofStatement<'a, 'b, S: TorusOps + TorusZq> {
    /// A private key encryption statement.
    PrivateKeyEncryption {
        /// The message ID being encrypted.
        message_id: usize,

        /// The ciphertext being encrypted.
        ciphertext: &'a LweCiphertext<S>,
    },

    /// A public key encryption statement.
    PublicKeyEncryption {
        /// The message ID being encrypted.
        message_id: usize,

        /// The encrypted data under the provided public key.
        ciphertext: &'a LweCiphertext<S>,

        /// The public key being used to encrypt the message.
        public_key: &'b LwePublicKey<S>,
    },
}

/// Witness information for the SDLP proof system when applied to TFHE.
/// This is the private information used when generating a proof.
#[derive(Debug)]
pub enum Witness<'a, 'b, S: TorusOps + TorusZq> {
    /// A private key encryption witness.
    PrivateKeyEncryption {
        /// The randomness used in the encryption.
        randomness: Torus<S>,

        /// The private key used in the encryption.
        private_key: &'a LweSecretKey<S>,
    },

    /// A public key encryption witness.
    PublicKeyEncryption {
        /// The randomness used in the encryption.
        randomness: &'b TlwePublicEncRandomness<S>,
    },
}

/// Generate LogProofProverKnowledge for the SDLP proof system.
pub fn generate_tfhe_sdlp_prover_knowledge<S: TorusOps + TorusZq>(
    statements: &[ProofStatement<S>],
    messages: &[Torus<S>],
    witness: &[Witness<S>],
    lwe: &LweDef,
    plaintext_bits: PlaintextBits,
) -> LogProofProverKnowledge<S::Zq> {
    let vk = generate_tfhe_sdlp_verifier_knowledge(statements, lwe, plaintext_bits);

    let s = compute_s(statements, witness, messages, lwe);

    LogProofProverKnowledge { vk, s }
}

/// Modulus for u32.
#[derive(BarrettConfig)]
#[barrett_config(modulus = "4294967296", num_limbs = 1)]
pub struct U32Config;

/// Field for u32.
pub type Zq32 = Zq<1, BarrettBackend<1, U32Config>>;

/// Modulus for u64.
#[derive(BarrettConfig)]
#[barrett_config(modulus = "18446744073709551616", num_limbs = 2)]
pub struct U64Config;

/// Field for u64.
pub type Zq64 = Zq<2, BarrettBackend<2, U64Config>>;

/// Torus properties on a discrete ring `Z_q`.
pub trait TorusZq
where
    Self: Sized,
{
    /// The discrete ring `Z_q`.
    type Zq: Ring
        + From<Self>
        + CryptoHash
        + ModSwitch<ZqRistretto>
        + RingModulus<4>
        + Ord
        + From<u32>;
}

impl TorusZq for u32 {
    type Zq = Zq32;
}

impl TorusZq for u64 {
    type Zq = Zq64;
}

/// Computes the public information needed to prove and verify public and private key
/// TLWE encryptions.
///
/// # Remarks
/// Using only private key encryption results in significantly faster runtime since we
/// can characterize `Z_q[X]/f` with `f = X + 1`.
///
/// # Details
/// Let `N` be the TLWE lattice dimension.
/// let `M` be the number of messages encrypted in in the ciphertexts
/// Note that multiple ciphertexts can encrypt the same message and SDLP can prove they contain
/// the same message.
///
/// ## A matrix's structure
/// SDLP proves a linear relation `AS=T` where
/// * `A in Z_q[X]^{m x k}/f`
/// * `S in Z_q[X]^{k x n}/f`
/// * `T in Z_q[X]^{m x n}/f`
/// * `f = X^D + 1`
///
/// For proving encryptions of TLWE ciphertexts, we have:
/// * `m` is the number of proof statements.
/// * `n = 1`.
/// * `k = num_messages + num_public_keys * (N + 1) + num_private_keys * N + num_private_encs + num_public_encs * (N + 1)`.
/// * See [quotient ring modulus `f`](#quotient-ring-modulus-f).
///
/// The matrix `A` is arranged into rows, one per proof statement whose column structure depends
/// on whether the statement is for public or private key encryption.
///
/// ### Private key statements
/// Each private key encryption statement row has the following column arrangement:
/// ```ignore
/// 1 at msg_idx     pub_key (N/A)         a at pvt_key_id * N     1 at pvt_stmt_idx  e_idx (N/A)
///         V           V                  V                           V              V
///  [ 0 .. 1 .. 0     0 .. 0       0 .. a_0, a_1, .. a_N .. 0    0 .. 1 .. 0       0 .. 0]
/// ```
/// ### Public key statements
/// Recall that a TLWE ciphertext consists of (a_1, ... a_N, b), where `a_i, b` in the discrete
/// torus `T`.
///
/// Furthermore, the public key `P = (p_1, ... p_N)` where `p_i` is a secret key encryption of
/// zero.
///
/// Each public key encryption statement row has the following column arrangement:
/// ```ignore
/// 1 at msg_idx        p at pub_key_id * N     a (N/A)    b (N/A)         e_idx
///        V                  V                    V           V              V
/// [ 0 .. 1 .. 0   0 .. p_0, p_1, .. p_N .. 0   0 .. 0    0 .. 0      0 .. 1 .. 0  ]
/// ```
/// For these entries, we reinterpret each `p_i` as a polynomial `mod (X^N + 1)`.
///
/// ## T's structure
/// While SDLP support T as a matrix, we only need a vector of `m` rows.
///
/// The structure of each row in T depends on whether said the corresponding statement describes
/// a public or private key encryption.
///
/// ### Private key statements
/// The row's polynomial is simply `b * X^0`.
///
/// ### Public key statements
/// The rows's polynomial is `a_0 * X^0, a_1 * X^1, ... a_N * X^{N - 1} b * X^N`
///
/// ## Quotient ring modulus `f`
/// When `statements` contains only secret key encryption statements, `f = X + 1`. Otherwise,
/// `f = X^{N + 1} + 1`.
pub fn generate_tfhe_sdlp_verifier_knowledge<S: TorusOps + TorusZq>(
    statements: &[ProofStatement<S>],
    lwe: &LweDef,
    plaintext_bits: PlaintextBits,
) -> VerifierKnowledge<S::Zq> {
    // If we need to prove any public encryption statements, then `f = X^{lwe_dimension + 1} + 1`.
    // If not, we can use the more efficient X + 1.
    let mut f_coeffs = vec![S::Zq::from(<S as Zero>::zero()); f_degree(statements, lwe) + 1];
    f_coeffs[0] = S::Zq::from(S::one());

    let last_coeff = f_coeffs.len() - 1;
    f_coeffs[last_coeff] = S::Zq::from(S::one());

    let f = Polynomial::new(&f_coeffs);

    let a = compute_a(statements, lwe, plaintext_bits);
    let t = compute_t(statements, lwe);
    let bounds = compute_bounds(statements, lwe, plaintext_bits);

    VerifierKnowledge::new(a, t, f, bounds)
}

fn compute_bounds<S: TorusOps + TorusZq>(
    statements: &[ProofStatement<S>],
    lwe: &LweDef,
    plaintext_bits: PlaintextBits,
) -> Matrix<Bounds> {
    let (_, cols) = proof_matrix_dim(statements, lwe.dim.0);
    let offsets = compute_a_column_offsets(statements, lwe);

    let mut bounds = Matrix::<Bounds>::new(cols, 1);

    let num_messages = num_messages(statements);
    let num_coeffs = f_degree(statements, lwe);
    let lwe_dimension = lwe.dim.0;

    // Bounds for messages
    for i in 0..num_messages {
        let mut b = Bounds(vec![0; num_coeffs]);
        b.0[0] = plaintext_bits.0;
        debug_assert_eq!(bounds[(i, 0)].0, &[]);
        bounds[(i, 0)] = b;
    }

    // Public r and e
    for i in 0..num_public(statements) {
        for j in 0..lwe_dimension {
            let mut b = Bounds(vec![0; num_coeffs]);

            // Values of r are binary
            b.0[0] = plaintext_bits.0;
            debug_assert_eq!(
                bounds[(offsets.public_keys + i * lwe_dimension + j, 0)].0,
                &[]
            );
            bounds[(offsets.public_keys + i * lwe_dimension + j, 0)] = b;
        }

        // e is normal distributed over the torus.
        // TODO: This bound is too high. Get a tighter bound.
        let b = Bounds(vec![60 - plaintext_bits.0; num_coeffs]);

        debug_assert_eq!(bounds[(offsets.public_e + i, 0)].0, &[]);
        bounds[(offsets.public_e + i, 0)] = b;
    }

    // Private s and e
    for i in 0..num_private(statements) {
        for j in 0..lwe_dimension {
            let mut b = Bounds(vec![0; num_coeffs]);

            // Values of s are binary
            b.0[0] = plaintext_bits.0;
            debug_assert_eq!(
                bounds[(offsets.private_a + j + i * lwe_dimension, 0)].0,
                &[]
            );
            bounds[(offsets.private_a + j + i * lwe_dimension, 0)] = b;
        }

        let mut b = Bounds(vec![0; num_coeffs]);

        // e is normal distributed over the torus.
        // TODO: This bound is too high. Get a tighter bound.
        b.0[0] = 62 - plaintext_bits.0;
        debug_assert_eq!(bounds[(offsets.private_e + i, 0)].0, &[]);
        bounds[(offsets.private_e + i, 0)] = b;
    }

    bounds
}

fn f_degree<S: TorusOps + TorusZq>(statements: &[ProofStatement<S>], lwe: &LweDef) -> usize {
    let lwe_dimension = lwe.dim.0;

    if num_public(statements) > 0 {
        lwe_dimension + 1
    } else {
        1
    }
}

fn encoding_factor<S: TorusZq + TorusOps>(plaintext_bits: PlaintextBits) -> S::Zq {
    let x = S::from_u64(0x1u64 << (S::BITS - plaintext_bits.0));
    S::Zq::from(x)
}

struct IdxOffsets {
    public_keys: usize,
    public_e: usize,
    private_a: usize,
    private_e: usize,
}

#[inline]
fn compute_a_column_offsets<S: TorusOps + TorusZq>(
    statements: &[ProofStatement<S>],
    lwe: &LweDef,
) -> IdxOffsets {
    let lwe_dimension = lwe.dim.0;
    let public_keys = num_messages(statements);
    let public_e = public_keys + num_public(statements) * lwe_dimension;
    let private_a = public_e + num_public(statements);
    let private_e = private_a + num_private(statements) * lwe_dimension;

    IdxOffsets {
        public_keys,
        public_e,
        private_a,
        private_e,
    }
}

fn compute_a<S: TorusZq + TorusOps>(
    statements: &[ProofStatement<S>],
    lwe: &LweDef,
    plaintext_bits: PlaintextBits,
) -> Matrix<Polynomial<S::Zq>> {
    let lwe_dimension = lwe.dim.0;
    let offsets = compute_a_column_offsets(statements, lwe);

    let (rows, cols) = proof_matrix_dim(statements, lwe_dimension);

    let mut a = Matrix::<Polynomial<S::Zq>>::new(rows, cols);

    assert!(plaintext_bits.0 > 0);

    let msg_encode = encoding_factor::<S>(plaintext_bits);

    let mut cur_public = 0;
    let mut cur_private = 0;

    for (i, s) in statements.iter().enumerate() {
        let (is_public, public_key, message_id, ciphertext) = match s {
            ProofStatement::PrivateKeyEncryption {
                ciphertext,
                message_id,
            } => (false, None, *message_id, *ciphertext),
            ProofStatement::PublicKeyEncryption {
                public_key,
                ciphertext,
                message_id,
            } => (true, Some(public_key), *message_id, *ciphertext),
        };

        // Insert the message coefficient. For private encryptions, this goes in
        // the constant coefficient. For public, it goes in the d-1 coefficient.
        let coeffs = if !is_public {
            vec![msg_encode.clone()]
        } else {
            let mut coeffs = vec![S::Zq::from(<S as Zero>::zero()); lwe_dimension + 1];
            coeffs[lwe_dimension] = msg_encode.clone();
            coeffs
        };

        debug_assert_eq!(a[(i, message_id)], Polynomial::zero());
        a[(i, message_id)] = Polynomial::new(&coeffs);

        if is_public {
            // Push the public key
            let pk = public_key.unwrap();

            for (j, z) in pk.enc_zeros(lwe).enumerate() {
                let (z_a, z_b) = z.a_b(lwe);
                let mut coeffs = z_a
                    .iter()
                    .map(|x| S::Zq::from(x.inner()))
                    .collect::<Vec<_>>();
                coeffs.push(S::Zq::from(z_b.inner()));

                let public_key_idx = offsets.public_keys + cur_public * lwe_dimension + j;

                debug_assert_eq!(a[(i, public_key_idx)], Polynomial::zero());
                a[(i, public_key_idx)] = Polynomial::new(&coeffs);
            }

            // Push the randomness
            debug_assert_eq!(a[(i, offsets.public_e + cur_public)], Polynomial::zero());
            a[(i, offsets.public_e + cur_public)] = Polynomial::one();
            cur_public += 1;
        } else {
            let (c_a, _c_b) = ciphertext.a_b(lwe);

            // Place the a values of the cipertext in the matrix.
            for (j, a_j) in c_a.iter().enumerate() {
                let private_key_idx = offsets.private_a + j + cur_private * lwe_dimension;

                debug_assert_eq!(a[(i, private_key_idx)], Polynomial::zero());
                a[(i, private_key_idx)] = Polynomial::new(&[S::Zq::from(a_j.inner())]);
            }

            debug_assert_eq!(a[(i, offsets.private_e)], Polynomial::zero());

            a[(i, offsets.private_e + i)] = Polynomial::one();
            cur_private += 1;
        }
    }

    a
}

fn compute_t<S: TorusOps + TorusZq>(
    statements: &[ProofStatement<S>],
    lwe: &LweDef,
) -> PolynomialMatrix<S::Zq> {
    let mut t = PolynomialMatrix::new(statements.len(), 1);

    for (i, s) in statements.iter().enumerate() {
        match s {
            ProofStatement::PrivateKeyEncryption {
                ciphertext: c,
                message_id: _,
            } => {
                let (_, c_b) = c.a_b(lwe);

                debug_assert_eq!(t[(i, 0)], Polynomial::zero());
                t[(i, 0)] = Polynomial::new(&[S::Zq::from(c_b.inner())]);
            }
            ProofStatement::PublicKeyEncryption {
                public_key: _,
                message_id: _,
                ciphertext: c,
            } => {
                let (c_a, c_b) = c.a_b(lwe);

                let mut coeffs = c_a
                    .iter()
                    .map(|x| S::Zq::from(x.inner()))
                    .collect::<Vec<_>>();

                coeffs.push(S::Zq::from(c_b.inner()));

                debug_assert_eq!(t[(i, 0)], Polynomial::zero());
                t[(i, 0)] = Polynomial::new(&coeffs);
            }
        }
    }

    t
}

#[inline]
fn compute_s<S: TorusOps + TorusZq>(
    statements: &[ProofStatement<S>],
    witness: &[Witness<S>],
    messages: &[Torus<S>],
    lwe: &LweDef,
) -> PolynomialMatrix<S::Zq> {
    assert_eq!(statements.len(), witness.len());

    let lwe_dimension = lwe.dim.0;

    // If the a matrix is rows x cols, the S witness must have 'cols' rows.
    let (_, cols) = proof_matrix_dim(statements, lwe_dimension);

    // Column offsets in the A matrix become row offsets in the S witness.
    let offsets = compute_a_column_offsets(statements, lwe);

    let mut s = PolynomialMatrix::new(cols, 1);

    // Put the messages into the witness
    for (i, m) in messages.iter().take(num_messages(statements)).enumerate() {
        debug_assert_eq!(s[(i, 0)], Polynomial::zero());
        s[(i, 0)] = Polynomial::new(&[S::Zq::from(m.inner())]);
    }

    let public_entries = witness.iter().filter_map(|x| match x {
        Witness::PublicKeyEncryption { randomness } => Some(randomness),
        _ => None,
    });

    // Put public 'r' and 'e' randomness into the witness
    for (i, rnd) in public_entries.enumerate() {
        for (j, r) in rnd.r.iter().enumerate() {
            let public_key_index = offsets.public_keys + j + i * lwe_dimension;

            debug_assert_eq!(s[(public_key_index, 0)], Polynomial::zero());
            s[(public_key_index, 0)] = Polynomial::new(&[S::Zq::from(*r)]);
        }

        let mut coeffs = rnd
            .e
            .a_b(lwe)
            .0
            .iter()
            .map(|x| S::Zq::from(x.inner()))
            .collect::<Vec<_>>();
        coeffs.push(S::Zq::from(rnd.e.a_b(lwe).1.inner()));

        let public_randomness_index = offsets.public_e + i;

        debug_assert_eq!(s[(public_randomness_index, 0)], Polynomial::zero());
        s[(public_randomness_index, 0)] = Polynomial::new(&coeffs);
    }

    let private_keys = witness.iter().filter_map(|x| match x {
        Witness::PrivateKeyEncryption {
            randomness,
            private_key,
        } => Some((private_key, randomness)),
        _ => None,
    });

    // Put the secret keys into the witness.
    for (i, (sk, e)) in private_keys.enumerate() {
        for (j, sk) in sk.s().iter().enumerate() {
            let private_key_index = offsets.private_a + j + i * lwe_dimension;

            debug_assert_eq!(s[(private_key_index, 0)], Polynomial::zero());
            s[(private_key_index, 0)] = Polynomial::new(&[S::Zq::from(*sk)]);
        }

        let private_randomness_index = offsets.private_e + i;

        debug_assert_eq!(s[(private_randomness_index, 0)], Polynomial::zero());
        s[(private_randomness_index, 0)] = Polynomial::new(&[S::Zq::from(e.inner())]);
    }

    s
}

#[inline(always)]
fn num_private<S: TorusOps + TorusZq>(statements: &[ProofStatement<S>]) -> usize {
    // Public key statements require 2 rows while private key statements require only one.
    statements
        .iter()
        .filter(|x| {
            matches!(
                x,
                ProofStatement::PrivateKeyEncryption {
                    ciphertext: _,
                    message_id: _
                }
            )
        })
        .count()
}

#[inline(always)]
fn num_public<S: TorusOps + TorusZq>(statements: &[ProofStatement<S>]) -> usize {
    statements.len() - num_private(statements)
}

/// Returns a tuple of the `(rows, cols)` in SDLP's `A` matrix.
#[inline]
fn proof_matrix_dim<S: TorusOps + TorusZq>(
    statements: &[ProofStatement<S>],
    lwe_dimension: usize,
) -> (usize, usize) {
    let num_rows = statements.len();

    let num_cols = num_messages(statements) // message terms
        + num_public(statements) * lwe_dimension // public key terms
        + num_private(statements) * lwe_dimension // a terms
        + num_rows; // Public + private e term '1' coeffs

    (num_rows, num_cols)
}

#[inline]
fn num_messages<S: TorusOps + TorusZq>(statements: &[ProofStatement<S>]) -> usize {
    statements.iter().fold(0usize, |max, x| {
        let message_id = match x {
            ProofStatement::PublicKeyEncryption {
                public_key: _,
                ciphertext: _,
                message_id,
            } => message_id,
            ProofStatement::PrivateKeyEncryption {
                ciphertext: _,
                message_id,
            } => message_id,
        };

        usize::max(max, *message_id)
    }) + 1
}

#[cfg(test)]
mod tests {
    use logproof::{InnerProductVerifierKnowledge, LogProof, LogProofGenerators};
    use merlin::Transcript;
    use rand::{thread_rng, RngCore};

    use crate::{
        high_level::*,
        zkp::{num_private, num_public},
        LweDef, LweDimension, LWE_512_80,
    };

    use super::*;

    #[test]
    fn can_compute_a_column_offsets() {
        let lwe = LweDef {
            dim: LweDimension(4),
            ..LWE_512_80
        };
        let lwe_dimension = lwe.dim.0;

        let ct = LweCiphertext::<u64>::zero(&lwe);

        let sk = keygen::generate_binary_lwe_sk(&lwe);
        let pk = keygen::generate_lwe_pk(&sk, &lwe);

        let statements = [
            ProofStatement::PrivateKeyEncryption {
                ciphertext: &ct,
                message_id: 1,
            },
            ProofStatement::PrivateKeyEncryption {
                ciphertext: &ct,
                message_id: 0,
            },
            ProofStatement::PublicKeyEncryption {
                ciphertext: &ct,
                public_key: &pk,
                message_id: 0,
            },
            ProofStatement::PrivateKeyEncryption {
                ciphertext: &ct,
                message_id: 1,
            },
            ProofStatement::PrivateKeyEncryption {
                ciphertext: &ct,
                message_id: 0,
            },
            ProofStatement::PublicKeyEncryption {
                ciphertext: &ct,
                public_key: &pk,
                message_id: 1,
            },
            ProofStatement::PublicKeyEncryption {
                ciphertext: &ct,
                public_key: &pk,
                message_id: 1,
            },
        ];

        let idx = compute_a_column_offsets(&statements, &lwe);

        let num_messages = num_messages(&statements);
        let num_private = num_private(&statements);
        let num_public = num_public(&statements);

        assert_eq!(num_messages, 2);
        assert_eq!(num_private, 4);
        assert_eq!(num_public, 3);

        // We have 2 messages that precede this.
        assert_eq!(idx.public_keys, num_messages);
        // We have 3 different public encryptions, so there are 3 public key
        // column entries. That 2 use the same key is immaterial, as they
        // must match different randomness in the witness.
        assert_eq!(idx.public_e, idx.public_keys + num_public * lwe_dimension);
        // We have 3 public key encryptions that contribute to this offset.
        // Each 'e' is a polynomial of degree `lwe_dimension`.
        assert_eq!(idx.private_a, idx.public_e + num_public);
        // Finally, each secret_a entry takes `lwe_dimension` columns.
        assert_eq!(idx.private_e, idx.private_a + num_private * lwe_dimension);
    }

    #[test]
    fn num_messages_works() {
        let lwe = LweDef {
            dim: LweDimension(4),
            ..LWE_512_80
        };

        let sk = keygen::generate_binary_lwe_sk(&lwe);
        let pk = keygen::generate_lwe_pk(&sk, &lwe);

        let ct = encryption::trivial_lwe(0, &lwe, PlaintextBits(1));

        let num_messages = num_messages(&[
            ProofStatement::PrivateKeyEncryption {
                ciphertext: &ct,
                message_id: 0,
            },
            ProofStatement::PrivateKeyEncryption {
                ciphertext: &ct,
                message_id: 1,
            },
            ProofStatement::PublicKeyEncryption {
                public_key: &pk,
                ciphertext: &ct,
                message_id: 0,
            },
        ]);

        assert_eq!(num_messages, 2);
    }

    fn prove_and_verify<S: TorusOps + TorusZq>(pk: &LogProofProverKnowledge<S::Zq>) {
        let gen: LogProofGenerators = LogProofGenerators::new(pk.vk.l() as usize);
        let u = InnerProductVerifierKnowledge::get_u();
        let mut p_t = Transcript::new(b"test");

        let proof = LogProof::create(&mut p_t, pk, &gen.g, &gen.h, &u);

        let mut v_t = Transcript::new(b"test");

        proof.verify(&mut v_t, &pk.vk, &gen.g, &gen.h, &u).unwrap();
    }

    #[test]
    fn one_secret_key() {
        let params = LweDef {
            dim: LweDimension(4),
            ..LWE_512_80
        };

        let sk = keygen::generate_binary_lwe_sk(&params);
        let (ct, rng) =
            encryption::encrypt_lwe_secret_and_return_randomness(1, &sk, &params, PlaintextBits(1));

        let pk = generate_tfhe_sdlp_prover_knowledge(
            &[ProofStatement::PrivateKeyEncryption {
                message_id: 0,
                ciphertext: &ct,
            }],
            &[Torus::from(1)],
            &[Witness::PrivateKeyEncryption {
                randomness: rng,
                private_key: &sk,
            }],
            &params,
            PlaintextBits(1),
        );

        prove_and_verify::<u64>(&pk);
    }

    #[test]
    fn two_secret_key() {
        let params = LweDef {
            dim: LweDimension(4),
            ..LWE_512_80
        };
        let bits = PlaintextBits(1);

        let sk = keygen::generate_binary_lwe_sk(&params);

        let (ct0, rng0) =
            encryption::encrypt_lwe_secret_and_return_randomness(1, &sk, &params, bits);
        let (ct1, rng1) =
            encryption::encrypt_lwe_secret_and_return_randomness(1, &sk, &params, bits);

        let pk = generate_tfhe_sdlp_prover_knowledge(
            &[
                ProofStatement::PrivateKeyEncryption {
                    message_id: 0,
                    ciphertext: &ct0,
                },
                ProofStatement::PrivateKeyEncryption {
                    message_id: 1,
                    ciphertext: &ct1,
                },
            ],
            &[Torus::from(1), Torus::from(1)],
            &[
                Witness::PrivateKeyEncryption {
                    randomness: rng0,
                    private_key: &sk,
                },
                Witness::PrivateKeyEncryption {
                    randomness: rng1,
                    private_key: &sk,
                },
            ],
            &params,
            bits,
        );

        prove_and_verify::<u64>(&pk);
    }

    #[test]
    fn one_public_key() {
        let params = LweDef {
            dim: LweDimension(4),
            ..LWE_512_80
        };
        let bits = PlaintextBits(1);

        let sk = keygen::generate_binary_lwe_sk(&params);
        let pk = keygen::generate_lwe_pk(&sk, &params);

        let (ct, rng) = encryption::encrypt_lwe_and_return_randomness(1, &pk, &params, bits);

        let pk = generate_tfhe_sdlp_prover_knowledge(
            &[ProofStatement::PublicKeyEncryption {
                message_id: 0,
                public_key: &pk,
                ciphertext: &ct,
            }],
            &[Torus::from(1)],
            &[Witness::PublicKeyEncryption { randomness: &rng }],
            &params,
            bits,
        );

        prove_and_verify::<u64>(&pk);
    }

    #[test]
    fn two_public_key() {
        let params = LweDef {
            dim: LweDimension(4),
            ..LWE_512_80
        };
        let bits = PlaintextBits(1);

        let sk = keygen::generate_binary_lwe_sk(&params);
        let pk = keygen::generate_lwe_pk(&sk, &params);

        let (ct0, rng0) = encryption::encrypt_lwe_and_return_randomness(1, &pk, &params, bits);
        let (ct1, rng1) = encryption::encrypt_lwe_and_return_randomness(1, &pk, &params, bits);

        let pk = generate_tfhe_sdlp_prover_knowledge(
            &[
                ProofStatement::PublicKeyEncryption {
                    message_id: 0,
                    public_key: &pk,
                    ciphertext: &ct0,
                },
                ProofStatement::PublicKeyEncryption {
                    message_id: 1,
                    public_key: &pk,
                    ciphertext: &ct1,
                },
            ],
            &[Torus::from(1), Torus::from(1)],
            &[
                Witness::PublicKeyEncryption { randomness: &rng0 },
                Witness::PublicKeyEncryption { randomness: &rng1 },
            ],
            &params,
            bits,
        );

        prove_and_verify::<u64>(&pk);
    }

    #[test]
    fn one_public_one_private() {
        let params = LweDef {
            dim: LweDimension(4),
            ..LWE_512_80
        };
        let bits = PlaintextBits(1);

        let sk = keygen::generate_binary_lwe_sk(&params);
        let pk = keygen::generate_lwe_pk(&sk, &params);

        let (ct_priv, rng_priv) =
            encryption::encrypt_lwe_secret_and_return_randomness(1, &sk, &params, bits);
        let (ct_pub, rng_pub) =
            encryption::encrypt_lwe_and_return_randomness(1, &pk, &params, bits);

        let pk = generate_tfhe_sdlp_prover_knowledge(
            &[
                ProofStatement::PrivateKeyEncryption {
                    message_id: 0,
                    ciphertext: &ct_priv,
                },
                ProofStatement::PublicKeyEncryption {
                    message_id: 0,
                    public_key: &pk,
                    ciphertext: &ct_pub,
                },
            ],
            &[Torus::from(1)],
            &[
                Witness::PrivateKeyEncryption {
                    randomness: rng_priv,
                    private_key: &sk,
                },
                Witness::PublicKeyEncryption {
                    randomness: &rng_pub,
                },
            ],
            &params,
            bits,
        );

        prove_and_verify::<u64>(&pk);
    }

    #[ignore]
    #[test]
    fn complex_examples() {
        let params = LweDef {
            dim: LweDimension(4),
            ..LWE_512_80
        };
        let bits = PlaintextBits(1);

        let case = || {
            let sk = keygen::generate_binary_lwe_sk(&params);
            let pk = keygen::generate_lwe_pk(&sk, &params);

            let num_messages = thread_rng().next_u64() as usize % 7 + 1;
            let num_secret_encryptions = thread_rng().next_u64() as usize % 8;
            let num_public_encryptions = thread_rng().next_u64() as usize % 8;

            let messages = (0..num_messages)
                .map(|_| thread_rng().next_u64() % 2)
                .collect::<Vec<_>>();

            // Skip trivial cases. I don't think SDLP allows it and it's boring..
            if num_public_encryptions == 0 && num_secret_encryptions == 0 {
                return;
            }

            let mut statements = vec![];
            let mut witnesses = vec![];
            let mut private_info = vec![];
            let mut public_info = vec![];

            for _ in 0..num_secret_encryptions {
                let msg_id = thread_rng().next_u64() as usize % num_messages;

                let (ct, noise) = encryption::encrypt_lwe_secret_and_return_randomness(
                    messages[msg_id],
                    &sk,
                    &params,
                    bits,
                );
                private_info.push((ct, noise, msg_id));
            }

            for (ct, noise, msg_id) in private_info.iter() {
                statements.push(ProofStatement::PrivateKeyEncryption {
                    message_id: *msg_id,
                    ciphertext: ct,
                });
                witnesses.push(Witness::PrivateKeyEncryption {
                    randomness: *noise,
                    private_key: &sk,
                });
            }

            for _ in 0..num_public_encryptions {
                let msg_id = thread_rng().next_u64() as usize % num_messages;

                let (ct, noise) = encryption::encrypt_lwe_and_return_randomness(
                    messages[msg_id],
                    &pk,
                    &params,
                    bits,
                );
                public_info.push((ct, noise, msg_id));
            }

            for (ct, noise, msg_id) in public_info.iter() {
                statements.push(ProofStatement::PublicKeyEncryption {
                    message_id: *msg_id,
                    ciphertext: ct,
                    public_key: &pk,
                });
                witnesses.push(Witness::PublicKeyEncryption { randomness: noise });
            }

            let messages = messages.iter().map(|x| Torus::from(*x)).collect::<Vec<_>>();

            let pk = generate_tfhe_sdlp_prover_knowledge(
                &statements,
                &messages,
                &witnesses,
                &params,
                bits,
            );

            prove_and_verify::<u64>(&pk);
        };

        for _ in 0..5 {
            case();
        }
    }
}
