use std::{borrow::Cow, fmt::Debug};

use crypto_bigint::{NonZero, Uint};
use sunscreen_math::{poly::Polynomial as MathPolynomial, ring::{BarrettBackend, BarrettConfig, Ring, Zq}, One, Zero};
use sunscreen_tfhe::{entities::{GlweCiphertext, GlweCiphertextRef, GlweSecretKey, GlweSecretKeyRef, Polynomial, PolynomialRef, RlwePublicKey}, ops::encryption::RlwePublicEncryptionRandomness, GlweDef, TorusOps};

use crate::{linear_algebra::{Matrix, PolynomialMatrix}, Bounds, LogProofProverKnowledge, LogProofVerifierKnowledge};

/// In SEAL, `u` is sampled from a ternary distribution. The number of bits is 1.
const U_COEFFICIENT_BOUND: u32 = 1;
/// In SEAL, `e` is sampled from a centered binomial distribution with std dev 3.2, and a maximum
/// width multiplier of 6, so max bound is 19.2. 19.2.ceil_log2() == 5
const E_COEFFICIENT_BOUND: u32 = 5;
/// In SEAL, secret keys are sampled from a ternary distribution. The number of bits is 1.
const S_COEFFICIENT_BOUND: u32 = 1;

/// A proof statement verifying that a GLWE ciphertext is an encryption of a known 
/// plaintext message.
#[derive(Debug)]
pub enum RlweProofStatement<'p, T: TorusOps> {
    /// A statement that the ciphertext symmetrically encrypts the identified message.
    PrivateKeyEncryption {
        /// Column index in the A matrix, or equivalently the index of the message slice provided
        /// when generating the prover knowledge.
        message_id: usize,

        /// The ciphertext of the encryption statement.
        ciphertext: GlweCiphertext<T>,
    },

    /// A statement that the ciphertext asymmetrically encrypts the identified message.
    PublicKeyEncryption {
        /// Column index in the A matrix, or equivalently the index of the message slice provided
        /// when generating the prover knowledge.
        message_id: usize,

        /// The ciphertext of the encryption statement.
        ciphertext: GlweCiphertext<T>,

        /// The public key of the encryption statement.
        public_key: Cow<'p, RlwePublicKey<T>>
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
        ciphertext: GlweCiphertext<T>,
    },
}

impl<T: TorusOps> RlweProofStatement<'_, T> {
    /// Get the message index of this statement.
    pub fn message_id(&self) -> usize {
        match self {
            RlweProofStatement::PrivateKeyEncryption { message_id, .. } => *message_id,
            RlweProofStatement::PublicKeyEncryption { message_id, .. } => *message_id,
            RlweProofStatement::Decryption { message_id, .. } => *message_id,
        }
    }

    /// Get the ciphertext of this statement.
    pub fn ciphertext(&self) -> &GlweCiphertextRef<T> {
        match self {
            RlweProofStatement::PrivateKeyEncryption { ciphertext, .. } => ciphertext,
            RlweProofStatement::PublicKeyEncryption { ciphertext, .. } => ciphertext,
            RlweProofStatement::Decryption { ciphertext, .. } => ciphertext,
        }
    }

    /// Return whether or not this is a public encryption statement.
    pub fn is_public(&self) -> bool {
        matches!(self, RlweProofStatement::PublicKeyEncryption { .. })
    }

    /// Return whether or not this is a private encryption statement. Note that decryption
    /// statements are technically private encryption statements.
    pub fn is_private(&self) -> bool {
        !self.is_public()
    }
}

/// A witness for a [`RlweProofStatement`].
#[derive(Debug)]
pub enum RlweWitness<'s, T: TorusOps> {
    /// A witness for the [`RlweProofStatement::PrivateKeyEncryption`] variant.
    PrivateKeyEncryption {
        /// The private key used for the encryption.
        private_key: Cow<'s, GlweSecretKey<T>>,
        /// The symmetric encryption components.
        components: (),
    },
    /// A witness for the [`RlweProofStatement::PublicKeyEncryption`] variant.
    PublicKeyEncryption(RlwePublicEncryptionRandomness<T>),
    /// A witness for the [`RlweProofStatement::Decryption`] variant.
    // N.B. There should really be symmetric encryption components here; we can add them after
    // modifying seal decryption to return this information. For now, we compute the components
    // manually (see the handling of this variant in `compute_s` below).
    Decryption {
        /// The private key used for the decryption.
        private_key: Cow<'s, GlweSecretKey<T>>,
    },
}

/// An RLWE message, which is a [`Polyomial`] and an optional coefficient bound.
#[derive(Debug)]
pub struct RlweMessage<T: TorusOps> {
    /// The plaintext message.
    pub plaintext: Polynomial<T>,
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
pub fn generate_prover_knowledge<P, B, T: TorusOps, const N: usize>(
    statements: &[RlweProofStatement<'_, T>],
    messages: &[RlweMessage<T>],
    witness: &[RlweWitness<'_, T>],
    params: &GlweDef,
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
        generate_verifier_knowledge(statements, &msg_bounds, params);

    let s = compute_s(statements, messages, witness, params);

    LogProofProverKnowledge::new(&a, &s, &t, &bounds, &f)
}

/// Generate only the [`LogProofVerifierKnowledge`] for a given set of [`BfvProofStatement`]s.
///
/// See the documentation for [`generate_prover_knowledge`] for more information.
pub fn generate_verifier_knowledge<B, T: TorusOps, const N: usize>(
    statements: &[RlweProofStatement<'_, T>],
    msg_bounds: &[Option<Bounds>],
    params: &GlweDef,
) -> LogProofVerifierKnowledge<Z<N, B>>
where
    B: BarrettConfig<N>,
{
    let a = compute_a(statements, params);
    let t = compute_t(statements);
    let bounds = compute_bounds::<GlweDef, B, T, N>(statements, msg_bounds, params);
    let f = compute_f(params);

    LogProofVerifierKnowledge::new(a, t, f, bounds)
}

fn compute_a<B, T: TorusOps, const N: usize>(
    statements: &[RlweProofStatement<'_, T>],
    params: &GlweDef,
) -> PolynomialMatrix<Z<N, B>>
where
    B: BarrettConfig<N>,
{
    let mut offsets = IdxOffsets::new(statements);
    let (rows, cols) = offsets.a_shape();
    let mut a = PolynomialMatrix::new(rows, cols);

    let d = sunscreen_math::poly::Polynomial {
        coeffs: vec![params.delta()],
    };

    let mut row = 0;
    for s in statements {
        // m*d block
        let msg_idx = s.message_id();
        a.set(row, msg_idx, d.clone());

        // r block
        a.set(row, offsets.remainder, MathPolynomial::one());

        match s {
            // sk, e blocks
            RlweProofStatement::PrivateKeyEncryption { ciphertext, .. } => {
                todo!();
                /*
                let c1 = ciphertext.a_b(params).0.next();
                a.set(row, offsets.private_a, c1);
                a.set(row, offsets.private_e, Polynomial::one());
                offsets.inc_private();

                row += 1; 
                */
            }
            // pk, e0, e1 blocks
            RlweProofStatement::PublicKeyEncryption { public_key, .. } => {
                //let mut pk = WithCtx(ctx, public_key.as_ref()).as_poly_vec();
                let (p0, p1) = public_key.p0_p1(params);

                a.set(row, offsets.public_key, p0);
                a.set(row + 1, offsets.public_key, p1);
                a.set(row, offsets.public_e_0, MathPolynomial::one());
                a.set(row + 1, offsets.public_e_1, MathPolynomial::one());
                offsets.inc_public();

                row += 2;
            }
            // sk, e blocks from decryption
            RlweProofStatement::Decryption { ciphertext, .. } => {
                todo!();
                /*
                a.set(row, offsets.private_a, c1);
                a.set(row, offsets.private_e, Polynomial::one());
                offsets.inc_private();

                row += 1;
                 */
            }
        }
    }

    a
}

fn compute_s<P, B, T: TorusOps, const N: usize>(
    statements: &[RlweProofStatement<'_, T>],
    messages: &[RlweMessage<T>],
    witness: &[RlweWitness<'_, T>],
    params: &P,
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
            RlweWitness::PrivateKeyEncryption {
                private_key,
                components: (),
            } => {
                todo!();
                /*
                let r = r.as_poly();
                let sk = WithCtx(ctx, private_key.as_ref()).as_poly();
                let e = e.as_poly_vec().pop().unwrap();
                s.set(offsets.remainder, 0, r);
                s.set(offsets.private_a, 0, sk.neg());
                s.set(offsets.private_e, 0, e.neg());
                offsets.inc_private();
                 */
            }
            // r_i, u_i, e_i
            RlweWitness::PublicKeyEncryption(RlwePublicEncryptionRandomness { u, e0, e1 }) => {
                let u = u.as_poly_vec().pop().unwrap();
                let e0 = e0.as_poly();
                let e1 = e1.as_poly_vec();
                
                s.set(offsets.public_key, 0, u);
                s.set(offsets.public_e_0, 0, e0);
                s.set(offsets.public_e_1, 0, e1);
                offsets.inc_public();
            }
            RlweWitness::Decryption { private_key } => {
                todo!();
                /*
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
                 */
            }
        }
    }

    s
}

fn compute_t<B, T: TorusOps, const N: usize>(
    statements: &[RlweProofStatement<'_, T>],
) -> PolynomialMatrix<Z<N, B>>
where
    B: BarrettConfig<N>,
{
    let rows = statements
        .iter()
        .flat_map(|s| {
            let mut c = s.ciphertext();
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

fn compute_bounds<P, B, T: TorusOps, const N: usize>(
    statements: &[RlweProofStatement<'_, T>],
    msg_bounds: &[Option<Bounds>],
    params: &P,
) -> Matrix<Bounds>
where
    P: StatementParams,
    B: BarrettConfig<N>,
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
    let delta_div_2_bits = params
        .delta::<N, B>()
        .into_bigint()
        .div(NonZero::from_uint(Uint::from(2u8)))
        .ceil_log2();
    let decrypt_e_bound = Bounds(vec![delta_div_2_bits; degree]);

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
            RlweProofStatement::PrivateKeyEncryption { .. } => {
                todo!();
                bounds.set(offsets.private_a, 0, s_bound.clone());
                bounds.set(offsets.private_e, 0, e_bound.clone());
                offsets.inc_private();
            }
            RlweProofStatement::PublicKeyEncryption { .. } => {
                bounds.set(offsets.public_key, 0, u_bound.clone());
                bounds.set(offsets.public_e_0, 0, e_bound.clone());
                bounds.set(offsets.public_e_1, 0, e_bound.clone());
                offsets.inc_public();
            }
            RlweProofStatement::Decryption { .. } => {
                todo!();
                bounds.set(offsets.private_a, 0, s_bound.clone());
                bounds.set(offsets.private_e, 0, decrypt_e_bound.clone());
                offsets.inc_private();
            }
        }
    }
    bounds
}

fn compute_f<P, B, const N: usize>(params: &P) -> sunscreen_math::poly::Polynomial<Z<N, B>>
where
    B: BarrettConfig<N>,
    P: StatementParams,
{
    sunscreen_math::poly::Polynomial {
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
    fn new(statements: &[RlweProofStatement<'_>]) -> Self {
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

    fn num_messages(statements: &[RlweProofStatement<'_>]) -> usize {
        statements
            .iter()
            .fold(0usize, |max, s| usize::max(max, s.message_id()))
            + 1
    }

    fn num_private(statements: &[RlweProofStatement<'_>]) -> usize {
        statements.iter().filter(|s| s.is_private()).count()
    }

    fn num_public(statements: &[RlweProofStatement<'_>]) -> usize {
        statements.len() - Self::num_private(statements)
    }
}

/// A generic way to pass in the necessary TFHE parameters.
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

impl StatementParams for GlweDef {
    fn degree(&self) -> u64 {
        self.dim.polynomial_degree.0 as u64
    }

    fn plain_modulus(&self) -> u64 {
        2
    }

    fn ciphertext_modulus(&self) -> Vec<u64> {
        self.get_coefficient_modulus()
            .iter()
            .map(|q| q.value())
            .collect()
    }
}

trait ToMathPolynomial<R> where R: Ring {
    fn to_math_poly(&self) -> MathPolynomial<R>;
}

impl<const N: usize, B, T> ToMathPolynomial<Z<N, B>> for &PolynomialRef<T> where R: Ring, T: TorusOps, B: BarrettConfig<N> {
    fn to_math_poly(&self) -> MathPolynomial<Z<N, B>> {
        MathPolynomial {
            coeffs: self.coeffs().iter().map(|x| Z::from(x.to_u64())).collect()
        }
    }
}

/// Set entry in a matrix, with a debug assertion that the current entry is zero.
trait MatrixSet<T> {
    fn set(&mut self, row: usize, col: usize, entry: T);
}
impl<T> MatrixSet<T> for Matrix<T> where T: Zero + Clone + Debug + PartialEq {
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