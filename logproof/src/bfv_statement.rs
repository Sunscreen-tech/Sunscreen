//! This module provides a mid-level API for generating SDLP prover and verifier knowledge from BFV
//! encryptions, all at the [`seal_fhe`] layer.

use std::{fmt::Debug, marker::PhantomData, ops::Neg};

use crypto_bigint::{NonZero, Uint};
use seal_fhe::{
    Ciphertext, Context, EncryptionParameters, Plaintext, PolynomialArray, PublicKey, SecretKey,
};
use sunscreen_math::{
    poly::Polynomial,
    ring::{BarrettBackend, BarrettConfig, Ring, Zq},
    One, Zero,
};

use crate::{
    linear_algebra::{Matrix, PolynomialMatrix},
    rings::ZqRistretto,
    Bounds, LogProofProverKnowledge, LogProofVerifierKnowledge,
};

/// In SEAL, `u` is sampled from a ternary distribution.
const U_COEFFICIENT_BOUND: u64 = 2;
/// In SEAL, `e` is sampled from a centered binomial distribution with std dev 3.2, and a maximum
/// width multiplier of 6, so max bound is 19.2.
const E_COEFFICIENT_BOUND: u64 = 19;
/// In SEAL, secret keys are sampled from a ternary distribution.
const S_COEFFICIENT_BOUND: u64 = 2;

/// A proof statement verifying that a ciphertext is an encryption of a known plaintext message.
/// Note that these statements are per SEAL plain/ciphertexts, where Sunscreen encodings are at a
/// higher level. A single Sunscreen plaintext may actually encode multiple SEAL plaintexts, and
/// hence multiple proof statements.
#[derive(Debug)]
pub enum BfvProofStatement<C, P> {
    /// A statement that the ciphertext symmetrically encrypts the identified message.
    PrivateKeyEncryption {
        /// Column index in the A matrix, or equivalently the index of the message slice provided
        /// when generating the prover knowledge.
        message_id: usize,
        /// The ciphertext of the encryption statement.
        ciphertext: C,
    },
    /// A statement that the ciphertext asymmetrically encrypts the identified message.
    PublicKeyEncryption {
        /// Column index in the A matrix, or equivalently the index of the message slice provided
        /// when generating the prover knowledge.
        message_id: usize,
        /// The ciphertext of the encryption statement.
        ciphertext: C,
        /// The public key of the encryption statement.
        public_key: P,
    },
}

impl<C, P> BfvProofStatement<C, P> {
    /// Get the message index of this statement.
    pub fn message_id(&self) -> usize {
        match self {
            BfvProofStatement::PrivateKeyEncryption { message_id, .. } => *message_id,
            BfvProofStatement::PublicKeyEncryption { message_id, .. } => *message_id,
        }
    }

    /// Get the ciphertext of this statement.
    pub fn ciphertext(&self) -> &C {
        match self {
            BfvProofStatement::PrivateKeyEncryption { ciphertext, .. } => ciphertext,
            BfvProofStatement::PublicKeyEncryption { ciphertext, .. } => ciphertext,
        }
    }

    /// Return whether or not this is a public encryption statement.
    pub fn is_public(&self) -> bool {
        matches!(self, BfvProofStatement::PublicKeyEncryption { .. })
    }

    /// Return whether or not this is a private encryption statement.
    pub fn is_private(&self) -> bool {
        matches!(self, BfvProofStatement::PrivateKeyEncryption { .. })
    }
}

/// A witness for a [`BfvProofStatement`].
#[derive(Debug)]
pub enum BfvWitness<S> {
    /// A witness for the [`BfvProofStatement::PrivateKeyEncryption`] variant.
    PrivateKeyEncryption {
        /// The private key used for the encryption.
        private_key: S,
        /// Gaussian error polynomial
        ///
        /// N.B. this polynomial array should always have size one, see note below.
        e: PolynomialArray,
        /// Rounding component after scaling the message by delta.
        r: Plaintext,
    },
    /// A witness for the [`BfvProofStatement::PublicKeyEncryption`] variant.
    PublicKeyEncryption {
        /// Uniform ternary polynomial.
        ///
        /// N.B. this polynomial array should always have size one, i.e. it is a single
        /// polynomial. I believe the type is simply the only reasonable one exported by
        /// `seal_fhe`.
        u: PolynomialArray,
        /// Gaussian error polynomial.
        ///
        /// Note that we currently assume that ciphertexts have length two, i.e.
        /// relinearization happens after every multiplication, and hence this error
        /// polynomial array should also have size two.
        e: PolynomialArray,
        /// Rounding component after scaling the message by delta.
        r: Plaintext,
    },
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
pub fn generate_prover_knowledge<C, P, S, T, B, const N: usize>(
    statements: &[BfvProofStatement<C, P>],
    messages: &[Plaintext], // may want messages AsRef as well.. we'll see
    witness: &[BfvWitness<S>],
    params: &T,
    ctx: &Context,
) -> LogProofProverKnowledge<Z<N, B>>
where
    B: BarrettConfig<N>,
    C: AsRef<Ciphertext>,
    P: AsRef<PublicKey>,
    S: AsRef<SecretKey>,
    T: StatementParams,
{
    let vk = generate_verifier_knowledge(statements, params, ctx);

    let s = compute_s(statements, messages, witness);

    LogProofProverKnowledge { vk, s }
}

/// Generate only the [`LogProofVerifierKnowledge`] for a given set of [`BfvProofStatement`]s.
///
/// See the documentation for [`generate_prover_knowledge`] for more information.
pub fn generate_verifier_knowledge<C, P, T, B, const N: usize>(
    statements: &[BfvProofStatement<C, P>],
    params: &T,
    ctx: &Context,
) -> LogProofVerifierKnowledge<Z<N, B>>
where
    B: BarrettConfig<N>,
    C: AsRef<Ciphertext>,
    P: AsRef<PublicKey>,
    T: StatementParams,
{
    let a = compute_a(statements, params, ctx);
    let t = compute_t(statements, ctx);
    let bounds = compute_bounds(statements, params);
    let f = Polynomial {
        coeffs: {
            let degree = params.degree() as usize;
            let mut cs = vec![Zq::zero(); degree + 1];
            cs[0] = Zq::one();
            cs[degree] = Zq::one();
            cs
        },
    };

    LogProofVerifierKnowledge { a, t, bounds, f }
}

fn compute_a<C, P, T, B, const N: usize>(
    statements: &[BfvProofStatement<C, P>],
    params: &T,
    ctx: &Context,
) -> PolynomialMatrix<Z<N, B>>
where
    B: BarrettConfig<N>,
    C: AsRef<Ciphertext>,
    P: AsRef<PublicKey>,
    T: StatementParams,
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
                let c1 = (ctx, ciphertext.as_ref()).as_poly_vec().pop().unwrap();
                a.set(row, offsets.private_a, c1);
                a.set(row, offsets.private_e, Polynomial::one());
                offsets.inc_private();

                row += 1;
            }
            // pk, e0, e1 blocks
            BfvProofStatement::PublicKeyEncryption { public_key, .. } => {
                let mut pk = (ctx, public_key.as_ref()).as_poly_vec();
                let p1 = pk.pop().unwrap();
                let p0 = pk.pop().unwrap();
                a.set(row, offsets.public_key, p0);
                a.set(row + 1, offsets.public_key, p1);
                a.set(row, offsets.public_e_0, Polynomial::one());
                a.set(row + 1, offsets.public_e_1, Polynomial::one());
                offsets.inc_public();

                row += 2;
            }
        }
    }

    a
}

fn compute_s<C, P, S, B, const N: usize>(
    statements: &[BfvProofStatement<C, P>],
    messages: &[Plaintext],
    witness: &[BfvWitness<S>],
) -> PolynomialMatrix<Z<N, B>>
where
    B: BarrettConfig<N>,
    S: AsRef<SecretKey>,
{
    let mut offsets = IdxOffsets::new(statements);
    let mut s = PolynomialMatrix::new(offsets.a_shape().1, 1);

    // m_i block
    for (i, m) in messages.iter().enumerate() {
        s.set(i, 0, m.as_poly());
    }

    // r_i, u_i, e_i, sk, e blocks
    for w in witness {
        match w {
            // sk, e
            BfvWitness::PrivateKeyEncryption { private_key, e, r } => {
                let r = r.as_poly();
                let sk = private_key.as_ref().as_poly();
                let e = e.as_poly_vec().pop().unwrap();
                s.set(offsets.remainder, 0, r);
                s.set(offsets.private_a, 0, sk.neg());
                s.set(offsets.private_e, 0, e.neg());
                offsets.inc_private();
            }
            // r_i, u_i, e_i
            BfvWitness::PublicKeyEncryption { u, e, r } => {
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
        }
    }

    s
}

fn compute_t<C, P, B, const N: usize>(
    statements: &[BfvProofStatement<C, P>],
    ctx: &Context,
) -> PolynomialMatrix<Z<N, B>>
where
    B: BarrettConfig<N>,
    C: AsRef<Ciphertext>,
{
    let rows = statements
        .iter()
        .flat_map(|s| {
            let mut c = (ctx, s.ciphertext().as_ref()).as_poly_vec();
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

fn compute_bounds<C, P, T>(statements: &[BfvProofStatement<C, P>], params: &T) -> Matrix<Bounds>
where
    T: StatementParams,
{
    let mut offsets = IdxOffsets::new(statements);
    let mut bounds = Matrix::<Bounds>::new(offsets.a_shape().1, 1);
    let degree = params.degree() as usize;

    // calculate bounds
    let m_bound = Bounds(vec![params.plain_modulus(); degree]);
    let r_bound = m_bound.clone();
    let u_bound = Bounds(vec![U_COEFFICIENT_BOUND; degree]);
    let e_bound = Bounds(vec![E_COEFFICIENT_BOUND; degree]);
    let s_bound = Bounds(vec![S_COEFFICIENT_BOUND; degree]);

    // insert them
    for i in 0..IdxOffsets::num_messages(statements) {
        bounds.set(i, 0, m_bound.clone());
    }
    for s in statements {
        bounds.set(offsets.remainder, 0, r_bound.clone());
        if s.is_private() {
            bounds.set(offsets.private_a, 0, s_bound.clone());
            bounds.set(offsets.private_e, 0, e_bound.clone());
            offsets.inc_private();
        } else {
            bounds.set(offsets.public_key, 0, u_bound.clone());
            bounds.set(offsets.public_e_0, 0, e_bound.clone());
            bounds.set(offsets.public_e_1, 0, e_bound.clone());
            offsets.inc_public();
        }
    }
    bounds
}

/// Represents the column offsets in `A` and the row offsets in `S` for the various fields.
//
// Hm. This could be an iterator that spits out the next ProofStatement with the appropriate indices.
struct IdxOffsets<C, P> {
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
    _phantom: PhantomData<(C, P)>,
}

impl<C, P> IdxOffsets<C, P> {
    fn new(statements: &[BfvProofStatement<C, P>]) -> Self {
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
            _phantom: PhantomData,
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

    fn num_messages(statements: &[BfvProofStatement<C, P>]) -> usize {
        statements
            .iter()
            .fold(0usize, |max, s| usize::max(max, s.message_id()))
            + 1
    }

    fn num_private(statements: &[BfvProofStatement<C, P>]) -> usize {
        statements.iter().filter(|s| s.is_private()).count()
    }

    fn num_public(statements: &[BfvProofStatement<C, P>]) -> usize {
        statements.len() - Self::num_private(statements)
    }
}

trait AsPolynomial<R: Ring> {
    fn as_poly(&self) -> Polynomial<R>;
}

trait AsPolynomials<R: Ring> {
    fn as_poly_vec(&self) -> Vec<Polynomial<R>>;
}

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

impl<const N: usize, B: BarrettConfig<N>> AsPolynomial<Z<N, B>> for SecretKey {
    fn as_poly(&self) -> Polynomial<Z<N, B>> {
        todo!()
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

impl<const N: usize, B: BarrettConfig<N>> AsPolynomials<Z<N, B>> for (&Context, &Ciphertext) {
    fn as_poly_vec(&self) -> Vec<Polynomial<Z<N, B>>> {
        let poly_array = PolynomialArray::new_from_ciphertext(self.0, self.1).unwrap();
        poly_array.as_poly_vec()
    }
}

impl<const N: usize, B: BarrettConfig<N>> AsPolynomials<Z<N, B>> for (&Context, &PublicKey) {
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

fn calculate_delta<const N: usize, B: BarrettConfig<N>>(p: u64, qs: Vec<u64>) -> Z<N, B> {
    // Calculate the data coefficient modulus, which for fields with more
    // that one modulus in the coefficient modulus set is equal to the
    // product of all but the last moduli in the set.
    let mut data_modulus = ZqRistretto::from(1);
    if qs.len() == 1 {
        data_modulus = data_modulus * ZqRistretto::from(qs[0]);
    } else {
        for q in qs.iter().take(qs.len() - 1) {
            data_modulus = data_modulus * ZqRistretto::from(*q);
        }
    }
    let p_bigint = NonZero::new(Uint::from(p)).unwrap();
    let delta = data_modulus.into_bigint().div_rem(&p_bigint).0;
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
        PlainModulus, SecurityLevel,
    };

    use crate::{
        rings::{ZqSeal128_1024, ZqSeal128_4096},
        InnerProductVerifierKnowledge, LogProof, LogProofGenerators, ProofError,
    };

    use super::*;

    #[test]
    fn idx_offsets() {
        // recreating the example in the docs
        let statements = vec![
            BfvProofStatement::PublicKeyEncryption {
                message_id: 0,
                ciphertext: 0xdeadbeef_u32,
                public_key: 100_u32,
            },
            BfvProofStatement::PublicKeyEncryption {
                message_id: 1,
                ciphertext: 0xdeedbeaf_u32,
                public_key: 100_u32,
            },
            BfvProofStatement::PrivateKeyEncryption {
                message_id: 0,
                ciphertext: 0xbeefdead_u32,
            },
        ];

        let idx_offsets = IdxOffsets::new(&statements);

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
    fn one_statement() {
        test_statements_with(1, 0)
    }

    #[test]
    fn two_separate_statements() {
        test_statements_with(2, 0)
    }

    #[test]
    fn two_statements_about_same_msg() {
        test_statements_with(2, 1)
    }

    fn test_statements_with(num_statements: usize, num_duplicate_msgs: usize) {
        let ctx = BFVTestContext::new();
        let test_fixture = ctx.random_fixture_with(num_statements, num_duplicate_msgs);
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

    struct TestFixture {
        statements: Vec<BfvProofStatement<Ciphertext, PublicKey>>,
        messages: Vec<Plaintext>,
        witness: Vec<BfvWitness<SecretKey>>,
    }

    struct BFVTestContext {
        ctx: Context,
        params: EncryptionParameters,
        public_key: PublicKey,
        encryptor: Encryptor,
    }

    impl BFVTestContext {
        fn new() -> Self {
            let plain_modulus = PlainModulus::raw(1153).unwrap();
            let coeff_modulus =
                CoefficientModulus::bfv_default(1024, SecurityLevel::TC128).unwrap();
            let params = BfvEncryptionParametersBuilder::new()
                .set_poly_modulus_degree(1024)
                .set_coefficient_modulus(coeff_modulus)
                .set_plain_modulus(plain_modulus)
                .build()
                .unwrap();
            let ctx = Context::new(&params, false, SecurityLevel::TC128).unwrap();
            let gen = KeyGenerator::new(&ctx).unwrap();
            let public_key = gen.create_public_key();
            let secret_key = gen.secret_key();
            let encryptor =
                Encryptor::with_public_and_secret_key(&ctx, &public_key, &secret_key).unwrap();

            BFVTestContext {
                ctx,
                params,
                public_key,
                encryptor,
            }
        }

        // If we ever speed up SDLP, this would be nice to run in a loop. As is, it's too slow.
        #[allow(unused)]
        fn random_fixture(&self) -> TestFixture {
            let mut rng = rand::thread_rng();
            let num_statements = rng.gen_range(1..=3);
            let num_duplicate_msgs = rng.gen_range(0..num_statements);
            self.random_fixture_with(num_statements, num_duplicate_msgs)
        }

        /// Note that `num_duplicate_msgs` is in _addition_ to the first message about a given
        /// index. So [0, 0, 0] contains `num_duplicate_msgs == 2`.
        //
        // TODO add private statements once we have a way to generate them, accepting
        // num_public_statements, num_private_statements.
        fn random_fixture_with(
            &self,
            num_statements: usize,
            num_duplicate_msgs: usize,
        ) -> TestFixture {
            assert!(num_duplicate_msgs < num_statements);
            let num_msgs = num_statements - num_duplicate_msgs;

            // all the messages
            let messages = (0..num_msgs)
                .map(|_| self.random_plaintext())
                .collect::<Vec<_>>();

            let mut statements = Vec::with_capacity(num_statements);
            let mut witness = Vec::with_capacity(num_statements);

            // statements without duplicate messages
            for (i, msg) in messages.iter().enumerate() {
                let (ct, u, e, r) = self.encryptor.encrypt_return_components(msg).unwrap();
                statements.push(BfvProofStatement::PublicKeyEncryption {
                    message_id: i,
                    ciphertext: ct,
                    public_key: self.public_key.clone(),
                });
                witness.push(BfvWitness::PublicKeyEncryption { u, e, r });
            }

            // add in the statements about existing messages
            let mut rng = rand::thread_rng();
            for _ in 0..num_duplicate_msgs {
                let i = rng.gen_range(0..num_msgs);
                let (ct, u, e, r) = self
                    .encryptor
                    .encrypt_return_components(&messages[i])
                    .unwrap();
                statements.push(BfvProofStatement::PublicKeyEncryption {
                    message_id: i,
                    ciphertext: ct,
                    public_key: self.public_key.clone(),
                });
                witness.push(BfvWitness::PublicKeyEncryption { u, e, r });
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

            let size = rng.gen_range(0..100);
            pt.resize(size);

            for i in 0..size {
                pt.set_coefficient(i, rng.gen_range(0..modulus));
            }

            pt
        }
    }
}