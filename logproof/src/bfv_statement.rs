//! This module provides a mid-level API for generating SDLP prover and verifier knowledge from BFV
//! encryptions, all at the [`seal_fhe`] layer.

use std::{
    borrow::Cow,
    fmt::Debug,
    ops::{Div, Neg},
};

use crypto_bigint::{CheckedMul, NonZero, Uint};
use seal_fhe::{
    AsymmetricComponents, Ciphertext, Context, EncryptionParameters, Plaintext, PolynomialArray,
    PublicKey, SecretKey, SymmetricComponents, SymmetricEncryptor,
};
use sunscreen_math::{
    poly::Polynomial,
    ring::{BarrettBackend, BarrettConfig, Ring, Zq},
    One, Zero,
};

use crate::{
    linear_algebra::{Matrix, PolynomialMatrix},
    math::Log2,
    Bounds, LogProofProverKnowledge, LogProofVerifierKnowledge,
};

/// In SEAL, `u` is sampled from a ternary distribution. The number of bits is 1.
const U_COEFFICIENT_BOUND: u32 = 1;
/// In SEAL, `e` is sampled from a centered binomial distribution with std dev 3.2, and a maximum
/// width multiplier of 6, so max bound is 19.2. 19.2.ceil_log2() == 5
const E_COEFFICIENT_BOUND: u32 = 5;
/// In SEAL, secret keys are sampled from a ternary distribution. The number of bits is 1.
const S_COEFFICIENT_BOUND: u32 = 1;

/// A proof statement verifying that a ciphertext is an encryption of a known plaintext message.
/// Note that these statements are per SEAL plain/ciphertexts, where Sunscreen encodings are at a
/// higher level. A single Sunscreen plaintext may actually encode multiple SEAL plaintexts, and
/// hence multiple proof statements.
#[derive(Debug)]
pub enum BfvProofStatement<'p> {
    /// A statement that the ciphertext symmetrically encrypts the identified message.
    PrivateKeyEncryption {
        /// Column index in the A matrix, or equivalently the index of the message slice provided
        /// when generating the prover knowledge.
        message_id: usize,
        /// The ciphertext of the encryption statement.
        ciphertext: Ciphertext,
    },
    /// A statement that the ciphertext asymmetrically encrypts the identified message.
    PublicKeyEncryption {
        /// Column index in the A matrix, or equivalently the index of the message slice provided
        /// when generating the prover knowledge.
        message_id: usize,
        /// The ciphertext of the encryption statement.
        ciphertext: Ciphertext,
        /// The public key of the encryption statement.
        public_key: Cow<'p, PublicKey>,
    },
    /// A statement that the ciphertext decrypts to the identified message. This is really the same
    /// thing as a private key encryption statement, however the creation of the statement is
    /// different when starting from a known ciphertext, as are the bounds, so we separate this
    /// case for convenience.
    Decryption {
        /// Column index in the A matrix, or equivalently the index of the message slice provided
        /// when generating the prover knowledge.
        message_id: usize,
        /// The ciphertext of the encryption statement.
        ciphertext: Ciphertext,
    },
}

impl<'p> BfvProofStatement<'p> {
    /// Get the message index of this statement.
    pub fn message_id(&self) -> usize {
        match self {
            BfvProofStatement::PrivateKeyEncryption { message_id, .. } => *message_id,
            BfvProofStatement::PublicKeyEncryption { message_id, .. } => *message_id,
            BfvProofStatement::Decryption { message_id, .. } => *message_id,
        }
    }

    /// Get the ciphertext of this statement.
    pub fn ciphertext(&self) -> &Ciphertext {
        match self {
            BfvProofStatement::PrivateKeyEncryption { ciphertext, .. } => ciphertext,
            BfvProofStatement::PublicKeyEncryption { ciphertext, .. } => ciphertext,
            BfvProofStatement::Decryption { ciphertext, .. } => ciphertext,
        }
    }

    /// Return whether or not this is a public encryption statement.
    pub fn is_public(&self) -> bool {
        matches!(self, BfvProofStatement::PublicKeyEncryption { .. })
    }

    /// Return whether or not this is a private encryption statement. Note that decryption
    /// statements are technically private encryption statements.
    pub fn is_private(&self) -> bool {
        !self.is_public()
    }
}

/// A witness for a [`BfvProofStatement`].
#[derive(Debug)]
pub enum BfvWitness<'s> {
    /// A witness for the [`BfvProofStatement::PrivateKeyEncryption`] variant.
    PrivateKeyEncryption {
        /// The private key used for the encryption.
        private_key: Cow<'s, SecretKey>,
        /// The symmetric encryption components.
        components: SymmetricComponents,
    },
    /// A witness for the [`BfvProofStatement::PublicKeyEncryption`] variant.
    PublicKeyEncryption(AsymmetricComponents),
    /// A witness for the [`BfvProofStatement::Decryption`] variant.
    // N.B. There should really be symmetric encryption components here; we can add them after
    // modifying seal decryption to return this information. For now, we compute the components
    // manually (see the handling of this variant in `compute_s` below).
    Decryption {
        /// The private key used for the decryption.
        private_key: Cow<'s, SecretKey>,
    },
}

/// A BFV message, which is a SEAL plaintext and an optional coefficient bound.
#[derive(Debug)]
pub struct BfvMessage {
    /// The plaintext message.
    pub plaintext: Plaintext,
    /// An optional bound on the plaintext message.
    ///
    /// By default, we use a conservative coefficient bound equal to the plaintext modulus for
    /// every coefficient in the lattice dimension. This is a _much_ higher bound than is
    /// necessary for common numeric plaintext encodings. For example, if you are encoding a
    /// 64-bit signed integer in 2s complement, you likely don't need 1024 coefficients to be
    /// nonzero.
    ///
    /// Note that the bounds should be a vector of length equal to the lattice dimension.
    pub bounds: Option<Bounds>,
}

type Z<const N: usize, B> = Zq<N, BarrettBackend<N, B>>;

/// Generate the full [`LogProofProverKnowledge`] for a given set of [`BfvProofStatement`]s.
///
/// Some constraints to be aware of:
///
/// 1. We assume a common set of parameters is used across all statements.
/// 2. Statements must reference message indices existing in the argument provided.
/// 3. Witnesses must be provided in the same order as the statements to which they correspond.
///
/// The prover knowledge consists of a matrix triple `A, S, T` where `AS = T`. The verifier
/// knowledge consists of just `A, T`. In the following description, we'll use "row" terminology
/// referring to matrix `A`:
///
/// 1. Public key statements each take up two rows.
/// 2. Private key statements each take up one row.
/// 3. The offsets occur in blocks for each variable in the encryption statement; that is, given
///    that `c[0] = d * m + r + u * p[0] + e[0]` and `c[1] = u * p[1] + e[1]` for a public key
///    encryption and `c[0] = d * m + r - (a * s + e)` and `c[1] = a` for a private key encryption,
///    the offsets are ordered in blocks `d, r, pk, e[0], e[1], sk, e`, with the size of each block
///    depending on the number of messages, statements, and public vs. private statements. This is
///    almost impossible to express via text, but should be easy to follow in the example below.
///
/// For example, if we have two public key statements and one private key statement for three
/// separate messages:
/// ```text
///                         A                     *   S        =     T
/// (    d     r         pk     e[0] e[1] sk  e )
/// [ [d 0 0 1 0 0 p_1[0] 0      1 0 0 0  0   0 ]   [   m_1  ]   [ c_1[0] ]
/// [ [0 0 0 0 0 0 p_1[1] 0      0 0 1 0  0   0 ]   [   m_2  ]   [ c_1[1] ]
/// [ [0 d 0 0 1 0 0      p_2[0] 0 1 0 0  0   0 ] * [   m_3  ] = [ c_2[0] ]
/// [ [0 0 0 0 0 0 0      p_2[1] 0 0 0 1  0   0 ]   [   r_1  ]   [ c_2[1] ]
/// [ [0 0 d 0 0 1 0      0      0 0 0 0  a_3 1 ]   [   r_2  ]   [ c_3[0] ]
///                                                 [   r_3  ]
///                                                 [   u_1  ]
///                                                 [   u_2  ]
///                                                 [ e_1[0] ]
///                                                 [ e_2[0] ]
///                                                 [ e_1[1] ]
///                                                 [ e_2[1] ]
///                                                 [   -s   ]
///                                                 [  -e_3  ]
/// ```
///
/// If the private key statement is also encrypting the first message, this can be compacted:
/// ```text
///                     A                       *   S        =     T
/// (    d   r         pk     e[0] e[1] sk  e )
/// [ [d 0 1 0 0 p_1[0] 0      1 0 0 0  0   0 ]   [   m_1  ]   [ c_1[0] ]
/// [ [0 0 0 0 0 p_1[1] 0      0 0 1 0  0   0 ]   [   m_2  ]   [ c_1[1] ]
/// [ [0 d 0 1 0 0      p_2[0] 0 1 0 0  0   0 ] * [   r_1  ] = [ c_2[0] ]
/// [ [0 0 0 0 0 0      p_2[1] 0 0 0 1  0   0 ]   [   r_2  ]   [ c_2[1] ]
/// [ [d 0 0 0 1 0      0      0 0 0 0  a_3 1 ]   [   r_3  ]   [ c_3[0] ]
///                                               [   u_1  ]
///                                               [   u_2  ]
///                                               [ e_1[0] ]
///                                               [ e_2[0] ]
///                                               [ e_1[1] ]
///                                               [ e_2[1] ]
///                                               [   -s   ]
///                                               [  -e_3  ]
///
/// ```
///
/// # Remarks
/// The remainder for a given (plaintext, plaintext modulus, ciphertext modulus) trio should be
/// constant, and thus it should technically be possible to reuse the remainder for multiple
/// encryptions (public or private) of a single plaintext message, like we do for the delta scaling
/// parameter. However, since the remainder is held in each [`BfvWitness`], I've gone with the less
/// surprising implementation where we have a remainder witness for each statement.
pub fn generate_prover_knowledge<P, B, const N: usize>(
    statements: &[BfvProofStatement<'_>],
    messages: &[BfvMessage],
    witness: &[BfvWitness<'_>],
    params: &P,
    ctx: &Context,
) -> LogProofProverKnowledge<Z<N, B>>
where
    B: BarrettConfig<N>,
    P: StatementParams,
{
    let msg_bounds = messages
        .iter()
        .map(|m| m.bounds.clone())
        .collect::<Vec<_>>();
    let LogProofVerifierKnowledge { a, t, bounds, f } =
        generate_verifier_knowledge(statements, &msg_bounds, params, ctx);

    let s = compute_s(statements, messages, witness, params, ctx);

    LogProofProverKnowledge::new(&a, &s, &t, &bounds, &f)
}

/// Generate only the [`LogProofVerifierKnowledge`] for a given set of [`BfvProofStatement`]s.
///
/// See the documentation for [`generate_prover_knowledge`] for more information.
pub fn generate_verifier_knowledge<P, B, const N: usize>(
    statements: &[BfvProofStatement<'_>],
    msg_bounds: &[Option<Bounds>],
    params: &P,
    ctx: &Context,
) -> LogProofVerifierKnowledge<Z<N, B>>
where
    B: BarrettConfig<N>,
    P: StatementParams,
{
    let a = compute_a(statements, params, ctx);
    let t = compute_t(statements, ctx);
    let bounds = compute_bounds(statements, msg_bounds, params);
    let f = compute_f(params);

    LogProofVerifierKnowledge::new(a, t, f, bounds)
}

fn compute_a<P, B, const N: usize>(
    statements: &[BfvProofStatement<'_>],
    params: &P,
    ctx: &Context,
) -> PolynomialMatrix<Z<N, B>>
where
    B: BarrettConfig<N>,
    P: StatementParams,
{
    let mut offsets = IdxOffsets::new(statements);
    let (rows, cols) = offsets.a_shape();
    let mut a = PolynomialMatrix::new(rows, cols);

    let d = Polynomial {
        coeffs: vec![params.delta()],
    };

    let mut row = 0;
    for s in statements {
        // m*d block
        let msg_idx = s.message_id();
        a.set(row, msg_idx, d.clone());

        // r block
        a.set(row, offsets.remainder, Polynomial::one());

        match s {
            // sk, e blocks
            BfvProofStatement::PrivateKeyEncryption { ciphertext, .. } => {
                let c1 = WithCtx(ctx, ciphertext).as_poly_vec().pop().unwrap();
                a.set(row, offsets.private_a, c1);
                a.set(row, offsets.private_e, Polynomial::one());
                offsets.inc_private();

                row += 1;
            }
            // pk, e0, e1 blocks
            BfvProofStatement::PublicKeyEncryption { public_key, .. } => {
                let mut pk = WithCtx(ctx, public_key.as_ref()).as_poly_vec();
                let p1 = pk.pop().unwrap();
                let p0 = pk.pop().unwrap();
                a.set(row, offsets.public_key, p0);
                a.set(row + 1, offsets.public_key, p1);
                a.set(row, offsets.public_e_0, Polynomial::one());
                a.set(row + 1, offsets.public_e_1, Polynomial::one());
                offsets.inc_public();

                row += 2;
            }
            // sk, e blocks from decryption
            BfvProofStatement::Decryption { ciphertext, .. } => {
                let c1 = WithCtx(ctx, ciphertext).as_poly_vec().pop().unwrap();
                a.set(row, offsets.private_a, c1);
                a.set(row, offsets.private_e, Polynomial::one());
                offsets.inc_private();

                row += 1;
            }
        }
    }

    a
}

fn compute_s<P, B, const N: usize>(
    statements: &[BfvProofStatement<'_>],
    messages: &[BfvMessage],
    witness: &[BfvWitness<'_>],
    params: &P,
    ctx: &Context,
) -> PolynomialMatrix<Z<N, B>>
where
    B: BarrettConfig<N>,
    P: StatementParams,
{
    let mut offsets = IdxOffsets::new(statements);
    let mut s = PolynomialMatrix::new(offsets.a_shape().1, 1);
    let f = compute_f(params);

    // m_i block
    for (i, m) in messages.iter().enumerate() {
        s.set(i, 0, m.plaintext.as_poly());
    }

    // r_i, u_i, e_i, sk, e blocks
    for (i, w) in witness.iter().enumerate() {
        match w {
            // sk, e
            BfvWitness::PrivateKeyEncryption {
                private_key,
                components: SymmetricComponents { e, r },
            } => {
                let r = r.as_poly();
                let sk = WithCtx(ctx, private_key.as_ref()).as_poly();
                let e = e.as_poly_vec().pop().unwrap();
                s.set(offsets.remainder, 0, r);
                s.set(offsets.private_a, 0, sk.neg());
                s.set(offsets.private_e, 0, e.neg());
                offsets.inc_private();
            }
            // r_i, u_i, e_i
            BfvWitness::PublicKeyEncryption(AsymmetricComponents { u, e, r }) => {
                let r = r.as_poly();
                let u = u.as_poly_vec().pop().unwrap();
                let mut e = e.as_poly_vec();
                debug_assert_eq!(e.len(), 2, "ciphertexts must have length two");
                let e1 = e.pop().unwrap();
                let e0 = e.pop().unwrap();
                s.set(offsets.remainder, 0, r);
                s.set(offsets.public_key, 0, u);
                s.set(offsets.public_e_0, 0, e0);
                s.set(offsets.public_e_1, 0, e1);
                offsets.inc_public();
            }
            BfvWitness::Decryption { private_key } => {
                let pt = &messages[statements[i].message_id()].plaintext;
                let r = SymmetricEncryptor::new(ctx, private_key)
                    .unwrap()
                    .encrypt_symmetric_return_components(pt)
                    .unwrap()
                    .1
                    .r
                    .as_poly();
                let sk = WithCtx(ctx, private_key.as_ref()).as_poly();
                let ct = WithCtx(ctx, statements[i].ciphertext()).as_poly_vec();
                let m = pt.as_poly();
                let delta = params.delta();
                let e = &m * delta + &r - &ct[0] - &ct[1] * &sk;
                let e = e.vartime_div_rem_restricted_rhs(&f).1;
                // Assert AS = T
                if cfg!(debug_assertions) {
                    let lhs = m * delta + &r - &ct[1] * &sk - &e;
                    let lhs = lhs.vartime_div_rem_restricted_rhs(&f).1;
                    debug_assert_eq!(lhs, ct[0], "the AS=T equation");
                }
                s.set(offsets.remainder, 0, r);
                s.set(offsets.private_a, 0, sk.neg());
                s.set(offsets.private_e, 0, e.neg());
                offsets.inc_private();
            }
        }
    }

    s
}

fn compute_t<B, const N: usize>(
    statements: &[BfvProofStatement<'_>],
    ctx: &Context,
) -> PolynomialMatrix<Z<N, B>>
where
    B: BarrettConfig<N>,
{
    let rows = statements
        .iter()
        .flat_map(|s| {
            let mut c = WithCtx(ctx, s.ciphertext()).as_poly_vec();
            // only include first ciphertext element for private statements
            if s.is_private() {
                c.pop().unwrap();
            }
            c
        })
        .collect::<Vec<_>>();
    let t = PolynomialMatrix::from(rows);

    let offsets = IdxOffsets::new(statements);
    debug_assert_eq!(t.rows, offsets.a_shape().0);
    debug_assert_eq!(t.cols, 1);

    t
}

fn compute_bounds<P>(
    statements: &[BfvProofStatement<'_>],
    msg_bounds: &[Option<Bounds>],
    params: &P,
) -> Matrix<Bounds>
where
    P: StatementParams,
{
    let mut offsets = IdxOffsets::new(statements);
    let mut bounds = Matrix::<Bounds>::new(offsets.a_shape().1, 1);
    let degree = params.degree() as usize;

    // calculate bounds
    let m_default_bound = Bounds(vec![params.plain_modulus().ceil_log2(); degree]);
    let r_bound = m_default_bound.clone();
    let u_bound = Bounds(vec![U_COEFFICIENT_BOUND; degree]);
    let e_bound = Bounds(vec![E_COEFFICIENT_BOUND; degree]);
    let s_bound = Bounds(vec![S_COEFFICIENT_BOUND; degree]);
    // very liberal bound, the max that satisfies correctness
    let q_div_2_bits = calculate_ciphertext_modulus(params.ciphertext_modulus())
        .div(NonZero::from_uint(Uint::from(2u8)))
        .ceil_log2();
    let decrypt_e_bound = Bounds(vec![q_div_2_bits; degree]);

    // insert them
    for i in 0..IdxOffsets::num_messages(statements) {
        bounds.set(
            i,
            0,
            msg_bounds
                .get(i)
                .and_then(|o| o.as_ref())
                .unwrap_or(&m_default_bound)
                .clone(),
        );
    }
    for s in statements {
        bounds.set(offsets.remainder, 0, r_bound.clone());
        match s {
            BfvProofStatement::PrivateKeyEncryption { .. } => {
                bounds.set(offsets.private_a, 0, s_bound.clone());
                bounds.set(offsets.private_e, 0, e_bound.clone());
                offsets.inc_private();
            }
            BfvProofStatement::PublicKeyEncryption { .. } => {
                bounds.set(offsets.public_key, 0, u_bound.clone());
                bounds.set(offsets.public_e_0, 0, e_bound.clone());
                bounds.set(offsets.public_e_1, 0, e_bound.clone());
                offsets.inc_public();
            }
            BfvProofStatement::Decryption { .. } => {
                bounds.set(offsets.private_a, 0, s_bound.clone());
                bounds.set(offsets.private_e, 0, decrypt_e_bound.clone());
                offsets.inc_private();
            }
        }
    }
    bounds
}

fn compute_f<P, B, const N: usize>(params: &P) -> Polynomial<Z<N, B>>
where
    B: BarrettConfig<N>,
    P: StatementParams,
{
    Polynomial {
        coeffs: {
            let degree = params.degree() as usize;
            let mut cs = vec![Zq::zero(); degree + 1];
            cs[0] = Zq::one();
            cs[degree] = Zq::one();
            cs
        },
    }
}

/// Represents the column offsets in `A` and the row offsets in `S` for the various fields.
//
// Hm. This could be an iterator that spits out the next ProofStatement with the appropriate indices.
struct IdxOffsets {
    /// The remainder block occurs after the delta/message block.
    remainder: usize,
    /// The public key block occurs after the remainders.
    public_key: usize,
    /// The public key statement's first error component block occurs after the public keys.
    public_e_0: usize,
    /// The public key statement's second error component block occurs after the first.
    public_e_1: usize,
    /// The private key block occurs next.
    private_a: usize,
    /// The private key statement's error component block occurs last.
    private_e: usize,
}

impl IdxOffsets {
    fn new(statements: &[BfvProofStatement<'_>]) -> Self {
        // Counts
        let num_messages = Self::num_messages(statements);
        let num_public = Self::num_public(statements);
        let num_private = Self::num_private(statements);
        let num_statements = statements.len();

        // Offsets
        let remainder = num_messages;
        let public_key = remainder + num_statements;
        let public_e_0 = public_key + num_public;
        let public_e_1 = public_e_0 + num_public;
        let private_a = public_e_1 + num_public;
        let private_e = private_a + num_private;

        Self {
            remainder,
            public_key,
            public_e_0,
            public_e_1,
            private_a,
            private_e,
        }
    }

    /// Return the (row, col) shape of A.
    fn a_shape(&self) -> (usize, usize) {
        let num_private = self.private_e - self.private_a;
        let num_public = self.public_e_0 - self.public_key;
        (num_public * 2 + num_private, self.private_e + num_private)
    }

    /// Record that a private statement or witness has been inserted into `A` or `S`, respectively
    /// bumping the indices.
    fn inc_private(&mut self) {
        self.remainder += 1;
        self.private_a += 1;
        self.private_e += 1;
    }

    /// Record that a public statement or witness has been inserted into `A` or `S`, respectively
    /// bumping the indices.
    fn inc_public(&mut self) {
        self.remainder += 1;
        self.public_key += 1;
        self.public_e_0 += 1;
        self.public_e_1 += 1;
    }

    fn num_messages(statements: &[BfvProofStatement<'_>]) -> usize {
        statements
            .iter()
            .fold(0usize, |max, s| usize::max(max, s.message_id()))
            + 1
    }

    fn num_private(statements: &[BfvProofStatement<'_>]) -> usize {
        statements.iter().filter(|s| s.is_private()).count()
    }

    fn num_public(statements: &[BfvProofStatement<'_>]) -> usize {
        statements.len() - Self::num_private(statements)
    }
}

trait AsPolynomial<R: Ring> {
    fn as_poly(&self) -> Polynomial<R>;
}

trait AsPolynomials<R: Ring> {
    fn as_poly_vec(&self) -> Vec<Polynomial<R>>;
}

struct WithCtx<'a, T>(&'a Context, &'a T);

impl<const N: usize, B: BarrettConfig<N>> AsPolynomial<Z<N, B>> for Plaintext {
    fn as_poly(&self) -> Polynomial<Z<N, B>> {
        Polynomial {
            coeffs: strip_trailing_value(
                (0..self.len())
                    .map(|i| Zq::from(self.get_coefficient(i)))
                    .collect::<Vec<_>>(),
                Zq::zero(),
            ),
        }
    }
}

impl<const N: usize, B: BarrettConfig<N>> AsPolynomial<Z<N, B>> for WithCtx<'_, SecretKey> {
    fn as_poly(&self) -> Polynomial<Z<N, B>> {
        let poly_array = PolynomialArray::new_from_secret_key(self.0, self.1).unwrap();
        poly_array.as_poly_vec().pop().unwrap()
    }
}

impl<const N: usize, B: BarrettConfig<N>> AsPolynomials<Z<N, B>> for PolynomialArray {
    fn as_poly_vec(&self) -> Vec<Polynomial<Z<N, B>>> {
        let chunk_size = self.coeff_modulus_size() as usize;

        let bigint_values = self
            .as_multiprecision_u64s()
            .unwrap()
            .chunks(chunk_size)
            // SEAL sometimes encodes a multiprecision integer with more limbs
            // than needed. The trailing limbs can be safely removed since they
            // are 0.
            .map(|x| Uint::<N>::from_words(x[0..N].try_into().unwrap()))
            .collect::<Vec<_>>();

        bigint_values
            .chunks(self.poly_modulus_degree() as usize)
            .map(|x| {
                let leading_zeros_removed = strip_trailing_value(x.to_vec(), Uint::<N>::ZERO);
                Polynomial {
                    coeffs: leading_zeros_removed
                        .iter()
                        .map(|y| Zq::try_from(*y).unwrap())
                        .collect::<Vec<_>>(),
                }
            })
            .collect()
    }
}

impl<const N: usize, B: BarrettConfig<N>> AsPolynomials<Z<N, B>> for WithCtx<'_, Ciphertext> {
    fn as_poly_vec(&self) -> Vec<Polynomial<Z<N, B>>> {
        let poly_array = PolynomialArray::new_from_ciphertext(self.0, self.1).unwrap();
        poly_array.as_poly_vec()
    }
}

impl<const N: usize, B: BarrettConfig<N>> AsPolynomials<Z<N, B>> for WithCtx<'_, PublicKey> {
    fn as_poly_vec(&self) -> Vec<Polynomial<Z<N, B>>> {
        let poly_array = PolynomialArray::new_from_public_key(self.0, self.1).unwrap();
        poly_array.as_poly_vec()
    }
}

/// A generic way to pass in the necessary BFV parameters.
pub trait StatementParams {
    /// Lattice degree.
    fn degree(&self) -> u64;
    /// Plaintext modulus.
    fn plain_modulus(&self) -> u64;
    /// Ciphertext modulus.
    fn ciphertext_modulus(&self) -> Vec<u64>;
    /// Calculate delta, the scaling parameter.
    fn delta<const N: usize, B: BarrettConfig<N>>(&self) -> Z<N, B> {
        calculate_delta(self.plain_modulus(), self.ciphertext_modulus())
    }
}

impl StatementParams for EncryptionParameters {
    fn degree(&self) -> u64 {
        self.get_poly_modulus_degree()
    }

    fn plain_modulus(&self) -> u64 {
        self.get_plain_modulus().value()
    }

    fn ciphertext_modulus(&self) -> Vec<u64> {
        self.get_coefficient_modulus()
            .iter()
            .map(|q| q.value())
            .collect()
    }
}

/// Set entry in a matrix, with a debug assertion that the current entry is zero.
trait MatrixSet<T> {
    fn set(&mut self, row: usize, col: usize, entry: T);
}
impl<T: Zero + Clone + Debug + PartialEq> MatrixSet<T> for Matrix<T> {
    #[inline(always)]
    fn set(&mut self, row: usize, col: usize, entry: T) {
        debug_assert_eq!(self[(row, col)], T::zero());
        self[(row, col)] = entry;
    }
}

fn calculate_ciphertext_modulus(qs: Vec<u64>) -> Uint<4> {
    // Calculate the data coefficient modulus, which for fields with more
    // that one modulus in the coefficient modulus set is equal to the
    // product of all but the last moduli in the set.
    let mut data_modulus = Uint::<4>::from_u8(1);
    if qs.len() == 1 {
        data_modulus = data_modulus
            .checked_mul(&Uint::<1>::from_u64(qs[0]))
            .unwrap();
    } else {
        for q in qs.iter().take(qs.len() - 1) {
            data_modulus = data_modulus.checked_mul(&Uint::<1>::from_u64(*q)).unwrap();
        }
    }
    data_modulus
}

fn calculate_delta<const N: usize, B: BarrettConfig<N>>(p: u64, qs: Vec<u64>) -> Z<N, B> {
    let q_bigint = calculate_ciphertext_modulus(qs);
    let p_bigint = NonZero::new(Uint::from(p)).unwrap();
    let delta = q_bigint.div_rem(&p_bigint).0;
    let limbs = delta.as_limbs().map(|l| l.into());
    let delta_uint = Uint::<N>::from_words(limbs[0..N].try_into().unwrap());
    Zq::try_from(delta_uint).unwrap()
}

fn strip_trailing_value<T>(mut v: Vec<T>, trim_value: T) -> Vec<T>
where
    T: Eq,
{
    while v.last().map_or(false, |c| *c == trim_value) {
        v.pop();
    }

    v
}

#[cfg(test)]
mod tests {
    use merlin::Transcript;
    use rand::Rng;
    use seal_fhe::{
        BfvEncryptionParametersBuilder, CoefficientModulus, Context, Encryptor, KeyGenerator,
        PlainModulus, SecurityLevel, SymAsym,
    };

    use crate::{
        rings::{ZqSeal128_1024, ZqSeal128_4096},
        InnerProductVerifierKnowledge, LogProof, LogProofGenerators, ProofError,
    };

    use super::*;

    #[test]
    fn idx_offsets() {
        let ctx = BFVTestContext::new();
        let test_fixture = ctx.random_fixture_with(2, 0, 0, 1);
        let idx_offsets = IdxOffsets::new(&test_fixture.statements);

        assert_eq!(idx_offsets.remainder, 2);
        assert_eq!(idx_offsets.public_key, 2 + 3);
        assert_eq!(idx_offsets.public_e_0, 2 + 3 + 2);
        assert_eq!(idx_offsets.public_e_1, 2 + 3 + 2 + 2);
        assert_eq!(idx_offsets.private_a, 2 + 3 + 2 + 2 + 2);
        assert_eq!(idx_offsets.private_e, 2 + 3 + 2 + 2 + 2 + 1);
    }

    #[test]
    fn delta_calculation() {
        let delta: ZqSeal128_1024 = calculate_delta(3, vec![11]);
        assert_eq!(delta.val.as_words(), &[11 / 3]);

        // ignores last moduli 11
        let delta: ZqSeal128_4096 = calculate_delta(4, vec![53, 53, 11]);
        assert_eq!(delta.val.as_words(), &[53 * 53 / 4, 0]);
    }

    #[test]
    fn one_public_statement() {
        test_statements_with(1, 0, 0, 0)
    }

    #[test]
    fn one_private_statement() {
        test_statements_with(0, 1, 0, 0)
    }

    #[test]
    fn private_and_public_statement_about_separate_msgs() {
        test_statements_with(1, 1, 0, 0)
    }

    #[test]
    fn private_and_public_statement_about_same_msg() {
        test_statements_with(1, 0, 0, 1)
    }

    #[test]
    fn decryption_statement() {
        let ctx = BFVTestContext::new();
        let mut test_fixture = ctx.random_fixture();
        let ix = 0;
        let ct = ctx
            .encryptor
            .encrypt(&test_fixture.messages[ix].plaintext)
            .unwrap();
        test_fixture.statements.push(BfvProofStatement::Decryption {
            message_id: ix,
            ciphertext: ct,
        });
        test_fixture.witness.push(BfvWitness::Decryption {
            private_key: Cow::Borrowed(&ctx.secret_key),
        });

        ctx.prove_and_verify(&test_fixture).unwrap();
    }

    fn test_statements_with(
        num_public_statements: usize,
        num_private_statements: usize,
        num_duplicate_public_msgs: usize,
        num_duplicate_private_msgs: usize,
    ) {
        let ctx = BFVTestContext::new();
        let test_fixture = ctx.random_fixture_with(
            num_public_statements,
            num_private_statements,
            num_duplicate_public_msgs,
            num_duplicate_private_msgs,
        );
        let prover_knowledge = generate_prover_knowledge(
            &test_fixture.statements,
            &test_fixture.messages,
            &test_fixture.witness,
            &ctx.params,
            &ctx.ctx,
        );
        let result = prove_and_verify(&prover_knowledge);
        if result.is_err() {
            panic!(
                "SDLP from BFV statements failed: \n\
                    - statements: {statements:#?} \n\
                    - witnesses: {witness:#?} \n\
                    - messages: {messages:#?} \n\
                    - error: {error:#?}",
                statements = test_fixture.statements,
                witness = test_fixture.witness,
                messages = test_fixture.messages,
                error = result.err().unwrap(),
            );
        }
    }

    fn prove_and_verify(pk: &LogProofProverKnowledge<ZqSeal128_1024>) -> Result<(), ProofError> {
        let gen: LogProofGenerators = LogProofGenerators::new(pk.vk.l() as usize);
        let u = InnerProductVerifierKnowledge::get_u();
        let mut p_t = Transcript::new(b"test");
        let proof = LogProof::create(&mut p_t, pk, &gen.g, &gen.h, &u);
        let mut v_t = Transcript::new(b"test");

        proof.verify(&mut v_t, &pk.vk, &gen.g, &gen.h, &u)
    }

    struct TestFixture<'p, 's> {
        statements: Vec<BfvProofStatement<'p>>,
        messages: Vec<BfvMessage>,
        witness: Vec<BfvWitness<'s>>,
    }

    struct BFVTestContext {
        ctx: Context,
        params: EncryptionParameters,
        public_key: PublicKey,
        secret_key: SecretKey,
        encryptor: Encryptor<SymAsym>,
    }

    impl BFVTestContext {
        fn new() -> Self {
            let plain_modulus = PlainModulus::raw(32).unwrap();
            let coeff_modulus =
                CoefficientModulus::bfv_default(1024, SecurityLevel::TC128).unwrap();
            let params = BfvEncryptionParametersBuilder::new()
                .set_poly_modulus_degree(64)
                .set_coefficient_modulus(coeff_modulus)
                .set_plain_modulus(plain_modulus)
                .build()
                .unwrap();
            let ctx = Context::new_insecure(&params, false).unwrap();
            let gen = KeyGenerator::new(&ctx).unwrap();
            let public_key = gen.create_public_key();
            let secret_key = gen.secret_key();
            let encryptor =
                Encryptor::with_public_and_secret_key(&ctx, &public_key, &secret_key).unwrap();

            BFVTestContext {
                ctx,
                params,
                public_key,
                secret_key,
                encryptor,
            }
        }

        // If we ever speed up SDLP, this would be nice to run in a loop. As is, it's too slow.
        fn random_fixture(&self) -> TestFixture {
            let mut rng = rand::thread_rng();
            let num_public_statements = rng.gen_range(1..=3);
            let num_private_statements = rng.gen_range(1..=3);
            let num_duplicate_public_msgs = rng.gen_range(0..num_public_statements);
            let num_duplicate_private_msgs = rng.gen_range(0..num_private_statements);
            self.random_fixture_with(
                num_public_statements,
                num_private_statements,
                num_duplicate_public_msgs,
                num_duplicate_private_msgs,
            )
        }

        fn random_fixture_with(
            &self,
            num_unique_public_statements: usize,
            num_unique_private_statements: usize,
            num_duplicate_public_msgs: usize,
            num_duplicate_private_msgs: usize,
        ) -> TestFixture {
            let num_msgs = num_unique_public_statements + num_unique_private_statements;
            let num_duplicate_msgs = num_duplicate_public_msgs + num_duplicate_private_msgs;
            let num_statements = num_msgs + num_duplicate_msgs;

            // all the messages
            let messages = (0..num_msgs)
                .map(|_| BfvMessage {
                    plaintext: self.random_plaintext(),
                    bounds: None,
                })
                .collect::<Vec<_>>();

            let mut statements = Vec::with_capacity(num_statements);
            let mut witness = Vec::with_capacity(num_statements);

            // statements without duplicate messages
            for (i, m) in messages.iter().enumerate() {
                if i < num_unique_public_statements {
                    let (ct, components) = self
                        .encryptor
                        .encrypt_return_components(&m.plaintext)
                        .unwrap();
                    statements.push(BfvProofStatement::PublicKeyEncryption {
                        message_id: i,
                        ciphertext: ct,
                        public_key: Cow::Borrowed(&self.public_key),
                    });
                    witness.push(BfvWitness::PublicKeyEncryption(components));
                } else {
                    let (ct, components) = self
                        .encryptor
                        .encrypt_symmetric_return_components(&m.plaintext)
                        .unwrap();
                    statements.push(BfvProofStatement::PrivateKeyEncryption {
                        message_id: i,
                        ciphertext: ct,
                    });
                    witness.push(BfvWitness::PrivateKeyEncryption {
                        private_key: Cow::Borrowed(&self.secret_key),
                        components,
                    });
                }
            }

            // add in the public statements about existing messages
            let mut rng = rand::thread_rng();
            for _ in 0..num_duplicate_public_msgs {
                let i = rng.gen_range(0..num_msgs);
                let (ct, components) = self
                    .encryptor
                    .encrypt_return_components(&messages[i].plaintext)
                    .unwrap();
                statements.push(BfvProofStatement::PublicKeyEncryption {
                    message_id: i,
                    ciphertext: ct,
                    public_key: Cow::Borrowed(&self.public_key),
                });
                witness.push(BfvWitness::PublicKeyEncryption(components));
            }
            for _ in 0..num_duplicate_private_msgs {
                let i = rng.gen_range(0..num_msgs);
                let (ct, components) = self
                    .encryptor
                    .encrypt_symmetric_return_components(&messages[i].plaintext)
                    .unwrap();
                statements.push(BfvProofStatement::PrivateKeyEncryption {
                    message_id: i,
                    ciphertext: ct,
                });
                witness.push(BfvWitness::PrivateKeyEncryption {
                    private_key: Cow::Borrowed(&self.secret_key),
                    components,
                });
            }

            TestFixture {
                statements,
                messages,
                witness,
            }
        }

        fn random_plaintext(&self) -> Plaintext {
            let mut rng = rand::thread_rng();
            let mut pt = Plaintext::new().unwrap();
            let modulus = self.params.plain_modulus();
            let len = self.params.get_poly_modulus_degree() as usize;

            let size = rng.gen_range(0..len);
            pt.resize(size);

            for i in 0..size {
                pt.set_coefficient(i, rng.gen_range(0..modulus));
            }

            pt
        }

        fn prove_and_verify(&self, fixture: &TestFixture) -> Result<(), ProofError> {
            let pk = generate_prover_knowledge(
                &fixture.statements,
                &fixture.messages,
                &fixture.witness,
                &self.params,
                &self.ctx,
            );
            prove_and_verify(&pk)
        }
    }
}
