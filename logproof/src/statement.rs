// TODO revisit and see if there's a reasonable way to share code between BFV and TFHE logic. The
// lower we go, the more it might be too much of a maintenance shackle than it is worth; at the
// least, we could just have them impl the same high level traits, with impls not quite DRY.

// The exported types here should be in terms of seal_fhe, with internal conversion logic to make
// Prover/Verifier knowledge.

use std::{borrow::Borrow, marker::PhantomData, ops::Neg};

use crypto_bigint::{NonZero, Uint};
use seal_fhe::{Ciphertext, Context, Modulus, Plaintext, PolynomialArray, PublicKey, SecretKey};
use sunscreen_math::{
    poly::Polynomial,
    ring::{BarrettBackend, BarrettConfig, Ring, Zq},
    One, Zero,
};

use crate::{
    linear_algebra::PolynomialMatrix, rings::ZqRistretto, LogProofProverKnowledge,
    LogProofVerifierKnowledge,
};

/// A proof statement verifying that a ciphertext is an encryption of a known plaintext message.
/// Note that these statements are per SEAL plain/ciphertexts, where Sunscreen encodings are at a
/// higher level. A single Sunscreen plaintext may actually encode multiple SEAL plaintexts, and
/// hence multiple proof statements.
//
// Goddamn I miss higher kinded types :(
pub enum BfvProofStatement<C, P> {
    PrivateKeyEncryption {
        message_id: usize,
        ciphertext: C,
    },
    PublicKeyEncryption {
        message_id: usize,
        ciphertext: C,
        public_key: P,
    },
}

impl<C, P> BfvProofStatement<C, P> {
    fn message_id(&self) -> usize {
        match self {
            BfvProofStatement::PrivateKeyEncryption { message_id, .. } => *message_id,
            BfvProofStatement::PublicKeyEncryption { message_id, .. } => *message_id,
        }
    }

    fn ciphertext(&self) -> &C {
        match self {
            BfvProofStatement::PrivateKeyEncryption { ciphertext, .. } => ciphertext,
            BfvProofStatement::PublicKeyEncryption { ciphertext, .. } => ciphertext,
        }
    }

    fn is_public(&self) -> bool {
        matches!(self, BfvProofStatement::PublicKeyEncryption { .. })
    }

    fn is_private(&self) -> bool {
        matches!(self, BfvProofStatement::PrivateKeyEncryption { .. })
    }
}

/// A witness for a [`BfvProofStatement`].
pub enum Witness<S> {
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

/// Generate the full [`LogProofProverKnowledge`] for a given set of [`BfvProofStatement`]s. Some
/// constraints to be aware of:
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
///    encryption and `c[0] = d * m + r - (u * s + e)` and `c[1] = u` for a private key encryption,
///    the offsets are ordered in blocks `d, r, pk, e[0], e[1], sk, e`, with the size of each block
///    depending on the number of messages, statements, and public vs. private statements. This is
///    almost impossible to express via text, but should be easy to follow in the example below.
///
/// For example, if we have two public key statements and one private key statement for three
/// separate messages:
/// ```ignore
///                         A                     *   S        =     T
/// (    d     r         pk     e[0] e[1] s   e )
/// [ [d 0 0 1 0 0 p_1[0] 0      1 0 0 0  0   0 ]   [   m_1  ]   [ c_1[0] ]
/// [ [0 0 0 0 0 0 p_1[1] 0      0 0 1 0  0   0 ]   [   m_2  ]   [ c_1[1] ]
/// [ [0 d 0 0 1 0 0      p_2[0] 0 1 0 0  0   0 ] * [   m_3  ] = [ c_2[0] ]
/// [ [0 0 0 0 0 0 0      p_2[1] 0 0 0 1  0   0 ]   [   r_1  ]   [ c_2[1] ]
/// [ [0 0 d 0 0 1 0      0      0 0 0 0  u_3 1 ]   [   r_2  ]   [ c_3[0] ]
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
/// ```ignore
///                     A                       *   S        =     T
/// (    d   r         pk     e[0] e[1] s   e )
/// [ [d 0 1 0 0 p_1[0] 0      1 0 0 0  0   0 ]   [   m_1  ]   [ c_1[0] ]
/// [ [0 0 0 0 0 p_1[1] 0      0 0 1 0  0   0 ]   [   m_2  ]   [ c_1[1] ]
/// [ [0 d 0 1 0 0      p_2[0] 0 1 0 0  0   0 ] * [   r_1  ] = [ c_2[0] ]
/// [ [0 0 0 0 0 0      p_2[1] 0 0 0 1  0   0 ]   [   r_2  ]   [ c_2[1] ]
/// [ [d 0 0 0 1 0      0      0 0 0 0  u_3 1 ]   [   r_3  ]   [ c_3[0] ]
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
/// Note that the remainder for a given (plaintext, plaintext modulus, ciphertext modulus) trio
/// should be constant, and thus it should technically be possible to reuse the remainder for
/// multiple encryptions (public or private) of a single plaintext message, like we do for the
/// delta scaling parameter. However, since the remainder is held in each [`Witness`], I've gone
/// with the less surprising implementation where we have a remainder witness for each statement.
pub fn generate_prover_knowledge<C, P, S, D, B, const N: usize>(
    statements: &[BfvProofStatement<C, P>],
    messages: &[Plaintext], // may want messages AsRef as well.. we'll see
    witness: &[Witness<S>],
    params: D,
    ctx: &Context,
) -> LogProofProverKnowledge<Z<N, B>>
where
    B: BarrettConfig<N>,
    C: Borrow<Ciphertext>,
    P: Borrow<PublicKey>,
    D: AsDelta<N, B>,
    S: Borrow<SecretKey>,
{
    let vk = generate_verifier_knowledge(statements, params, ctx);

    let s = compute_s(statements, messages, witness);

    LogProofProverKnowledge { vk, s }
}

pub fn generate_verifier_knowledge<C, P, D, B, const N: usize>(
    statements: &[BfvProofStatement<C, P>],
    params: D,
    ctx: &Context,
) -> LogProofVerifierKnowledge<Z<N, B>>
where
    B: BarrettConfig<N>,
    C: Borrow<Ciphertext>,
    P: Borrow<PublicKey>,
    D: AsDelta<N, B>,
{
    let a = compute_a(statements, params, ctx);
    let t = compute_t(statements, ctx);

    LogProofVerifierKnowledge {
        a,
        t,
        bounds: todo!(),
        f: todo!(),
    }
}

fn compute_a<C, P, D, B, const N: usize>(
    statements: &[BfvProofStatement<C, P>],
    params: D,
    ctx: &Context,
) -> PolynomialMatrix<Z<N, B>>
where
    B: BarrettConfig<N>,
    C: Borrow<Ciphertext>,
    P: Borrow<PublicKey>,
    D: AsDelta<N, B>,
{
    let mut offsets = IdxOffsets::new(statements);
    let (rows, cols) = offsets.a_shape();
    let mut a = PolynomialMatrix::new(rows, cols);

    let d = Polynomial {
        coeffs: vec![params.as_delta()],
    };

    let mut row = 0;
    for s in statements {
        // m*d block
        let msg_idx = s.message_id();
        debug_assert_eq!(a[(row, msg_idx)], Polynomial::zero());
        a[(row, msg_idx)] = d.clone();

        // r block
        debug_assert_eq!(a[(row, offsets.remainder)], Polynomial::zero());
        a[(row, offsets.remainder)] = Polynomial::one();

        match s {
            // s, e blocks
            BfvProofStatement::PrivateKeyEncryption { ciphertext, .. } => {
                let u = (ctx, ciphertext.borrow()).as_poly_vec().pop().unwrap();
                debug_assert_eq!(a[(row, offsets.private_u)], Polynomial::zero());
                debug_assert_eq!(a[(row, offsets.private_e)], Polynomial::zero());
                a[(row, offsets.private_u)] = u;
                a[(row, offsets.private_e)] = Polynomial::one();
                offsets.inc_private();

                row += 1;
            }
            // pk, e0, e1 blocks
            BfvProofStatement::PublicKeyEncryption { public_key, .. } => {
                let mut pk = (ctx, public_key.borrow()).as_poly_vec();
                let p1 = pk.pop().unwrap();
                let p0 = pk.pop().unwrap();
                debug_assert_eq!(a[(row, offsets.public_key)], Polynomial::zero());
                debug_assert_eq!(a[(row + 1, offsets.public_key)], Polynomial::zero());
                debug_assert_eq!(a[(row, offsets.public_e_0)], Polynomial::zero());
                debug_assert_eq!(a[(row + 1, offsets.public_e_1)], Polynomial::zero());
                a[(row, offsets.public_key)] = p0;
                a[(row + 1, offsets.public_key)] = p1;
                a[(row, offsets.public_e_0)] = Polynomial::one();
                a[(row + 1, offsets.public_e_1)] = Polynomial::one();
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
    witness: &[Witness<S>],
) -> PolynomialMatrix<Z<N, B>>
where
    B: BarrettConfig<N>,
    C: Borrow<Ciphertext>,
    P: Borrow<PublicKey>,
    S: Borrow<SecretKey>,
{
    let mut offsets = IdxOffsets::new(statements);
    let mut s = PolynomialMatrix::new(offsets.a_shape().1, 1);

    // m_i block
    for (i, m) in messages.iter().enumerate() {
        debug_assert_eq!(s[(i, 0)], Polynomial::zero());
        s[(i, 0)] = m.as_poly();
    }

    // r_i, u_i, e_i, s, e blocks
    for w in witness {
        match w {
            // s, e
            Witness::PrivateKeyEncryption { private_key, e, r } => {
                let r = r.as_poly();
                let sk = private_key.borrow().as_poly();
                let e = e.as_poly_vec().pop().unwrap();
                debug_assert_eq!(s[(offsets.remainder, 0)], Polynomial::zero());
                debug_assert_eq!(s[(offsets.private_u, 0)], Polynomial::zero());
                debug_assert_eq!(s[(offsets.private_e, 0)], Polynomial::zero());
                s[(offsets.remainder, 0)] = r;
                s[(offsets.private_u, 0)] = sk.neg();
                s[(offsets.private_e, 0)] = e.neg();
                offsets.inc_private();
            }
            // r_i, u_i, e_i
            Witness::PublicKeyEncryption { u, e, r } => {
                let r = r.as_poly();
                let u = u.as_poly_vec().pop().unwrap();
                let mut e = e.as_poly_vec();
                debug_assert_eq!(e.len(), 2, "ciphertexts must have length two");
                let e1 = e.pop().unwrap();
                let e0 = e.pop().unwrap();
                debug_assert_eq!(s[(offsets.remainder, 0)], Polynomial::zero());
                debug_assert_eq!(s[(offsets.public_key, 0)], Polynomial::zero());
                debug_assert_eq!(s[(offsets.public_e_0, 0)], Polynomial::zero());
                debug_assert_eq!(s[(offsets.public_e_1, 0)], Polynomial::zero());
                s[(offsets.remainder, 0)] = r;
                s[(offsets.public_key, 0)] = u;
                s[(offsets.public_e_0, 0)] = e0;
                s[(offsets.public_e_1, 0)] = e1;
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
    C: Borrow<Ciphertext>,
    P: Borrow<PublicKey>,
{
    let rows = statements
        .iter()
        .flat_map(|s| {
            let mut c = (ctx, s.ciphertext().borrow()).as_poly_vec();
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

/// Represents the column offsets in `A` and the row offsets in `S` for the various fields.
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
    private_u: usize,
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
        let private_u = public_e_1 + num_public;
        let private_e = private_u + num_private;

        Self {
            remainder,
            public_key,
            public_e_0,
            public_e_1,
            private_u,
            private_e,
            _phantom: PhantomData,
        }
    }

    /// Return the (row, col) shape of A.
    fn a_shape(&self) -> (usize, usize) {
        let num_private = self.private_e - self.private_u;
        let num_public = self.public_e_0 - self.public_key;
        (self.private_e + num_private, num_public * 2 + num_private)
    }

    /// Record that a private statement or witness has been inserted into `A` or `S`, respectively
    /// bumping the indices.
    fn inc_private(&mut self) {
        self.remainder += 1;
        self.private_u += 1;
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

/// A generic way to pass in the necessary BFV parameters (i.e. the plain & coeff moduli).
pub trait AsDelta<const N: usize, B: BarrettConfig<N>> {
    fn as_delta(&self) -> Z<N, B>;
}

impl<const N: usize, B: BarrettConfig<N>> AsDelta<N, B> for (Modulus, Vec<Modulus>) {
    fn as_delta(&self) -> Z<N, B> {
        let (p, qs) = self;
        (p.value(), qs.iter().map(|q| q.value()).collect()).as_delta()
    }
}

impl<const N: usize, B: BarrettConfig<N>> AsDelta<N, B> for (u64, Vec<u64>) {
    fn as_delta(&self) -> Z<N, B> {
        let (p, qs) = self;

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
        let p_bigint = NonZero::new(Uint::from(*p)).unwrap();
        let delta = data_modulus.into_bigint().div_rem(&p_bigint).0;
        let limbs = delta.as_limbs().map(|l| l.into());
        let delta_uint = Uint::<N>::from_words(limbs[0..N].try_into().unwrap());
        Zq::try_from(delta_uint).unwrap()
    }
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
    use rand::seq::IteratorRandom;
    use seal_fhe::{
        BFVScalarEncoder, BfvEncryptionParametersBuilder, CoefficientModulus, Context, Decryptor,
        Encryptor, KeyGenerator, PlainModulus, SecurityLevel,
    };

    use crate::rings::{SealQ128_1024, ZqSeal128_1024, ZqSeal128_4096};

    use super::*;

    #[test]
    fn test_idx_offsets() {
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
        assert_eq!(idx_offsets.private_u, 2 + 3 + 2 + 2 + 2);
        assert_eq!(idx_offsets.private_e, 2 + 3 + 2 + 2 + 2 + 1);
    }

    #[test]
    fn test_delta() {
        let moduli = (3, vec![11]);
        let delta: ZqSeal128_1024 = moduli.as_delta();
        assert_eq!(delta.val.as_words()[0], 11 / 3);

        let moduli = (4, vec![11, 13]);
        let delta: ZqSeal128_4096 = moduli.as_delta();
        assert_eq!(delta.val.as_words()[0], 11 * 13 / 4);
    }

    struct TestFixture {
        statements: Vec<BfvProofStatement<Ciphertext, PublicKey>>,
        messages: Vec<Plaintext>,
        witness: Vec<Witness<SecretKey>>,
    }

    struct BFVTestContext {
        ctx: Context,
        public_key: PublicKey,
        secret_key: SecretKey,
        encryptor: Encryptor,
        decryptor: Decryptor,
        encoder: BFVScalarEncoder,
    }

    impl TestFixture {
        // TODO add private statements once we have a way to generate them
        fn random() -> Self {
            let ctx = BFVTestContext::new();
            let mut rng = rand::thread_rng();

            let statement_count = (1..=10).choose(&mut rng).unwrap();
            let duplicate_msg_count = (0..statement_count).choose(&mut rng).unwrap();
            let msg_count = statement_count - duplicate_msg_count;

            // all the messages
            let messages = (0..msg_count)
                .map(|_| ctx.encoder.encode_unsigned(rand::random()).unwrap())
                .collect::<Vec<_>>();

            let mut statements = Vec::with_capacity(statement_count);
            let mut witness = Vec::with_capacity(statement_count);

            // statements without duplicate messages
            for (i, msg) in messages.iter().enumerate() {
                let (ct, u, e, r) = ctx.encryptor.encrypt_return_components(msg).unwrap();
                statements.push(BfvProofStatement::PublicKeyEncryption {
                    message_id: i,
                    ciphertext: ct,
                    public_key: ctx.public_key.clone(),
                });
                witness.push(Witness::PublicKeyEncryption { u, e, r });
            }

            // add in the statements about existing messages
            for _ in 0..duplicate_msg_count {
                let i = (0..msg_count).choose(&mut rng).unwrap();
                let (ct, u, e, r) = ctx
                    .encryptor
                    .encrypt_return_components(&messages[i])
                    .unwrap();
                statements.push(BfvProofStatement::PublicKeyEncryption {
                    message_id: i,
                    ciphertext: ct,
                    public_key: ctx.public_key.clone(),
                });
                witness.push(Witness::PublicKeyEncryption { u, e, r });
            }

            Self {
                statements,
                messages,
                witness,
            }
        }
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
            let decryptor = Decryptor::new(&ctx, &secret_key).unwrap();
            let encoder = BFVScalarEncoder::new();

            BFVTestContext {
                ctx,
                public_key,
                secret_key,
                encryptor,
                decryptor,
                encoder,
            }
        }
    }
}
