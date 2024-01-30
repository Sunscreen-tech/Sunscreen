use std::borrow::Cow;

use seal_fhe::{
    BFVScalarEncoder, BfvEncryptionParametersBuilder, CoefficientModulus, Context, Decryptor,
    Encryptor, KeyGenerator, PlainModulus, SecurityLevel,
};
use sunscreen_math::{
    poly::Polynomial,
    ring::{BarrettBackend, BarrettConfig, Ring, Zq},
};

use crate::{
    bfv_statement::{generate_prover_knowledge, BfvMessage, BfvProofStatement, BfvWitness},
    linear_algebra::Matrix,
    Bounds, LogProofProverKnowledge,
};

/// All information for a problem of the form `AS = T` in `Z_q[X]/f`. Useful for
/// demonstrating full knowledge proofs for small testing polynomials.
pub struct LatticeProblem<Q>
where
    Q: Ring,
{
    /// Public A
    pub a: Matrix<Polynomial<Q>>,

    /// Private message and encryption components S
    pub s: Matrix<Polynomial<Q>>,

    /// Result of A * S
    pub t: Matrix<Polynomial<Q>>,

    /// Polynomial divisor
    pub f: Polynomial<Q>,

    /// Bounds on elements in S
    pub b: Matrix<Bounds>,
}

/**
 * Generate a lattice problem for the BFV scheme.
 */
pub fn seal_bfv_encryption_linear_relation<B, const N: usize>(
    message: u64,
    degree: u64,
    plain_modulus: u64,
) -> LogProofProverKnowledge<Zq<N, BarrettBackend<N, B>>>
where
    B: BarrettConfig<N>,
{
    let plain_modulus = PlainModulus::raw(plain_modulus).unwrap();
    let coeff_modulus = CoefficientModulus::bfv_default(degree, SecurityLevel::TC128).unwrap();
    let params = BfvEncryptionParametersBuilder::new()
        .set_poly_modulus_degree(degree)
        .set_coefficient_modulus(coeff_modulus)
        .set_plain_modulus(plain_modulus)
        .build()
        .unwrap();

    let ctx = Context::new(&params, false, SecurityLevel::TC128).unwrap();
    let gen = KeyGenerator::new(&ctx).unwrap();

    let public_key = gen.create_public_key();
    let secret_key = gen.secret_key();

    let encryptor = Encryptor::with_public_and_secret_key(&ctx, &public_key, &secret_key).unwrap();
    let decryptor = Decryptor::new(&ctx, &secret_key).unwrap();

    // Generate plaintext data
    let encoder = BFVScalarEncoder::new();
    // Generate plaintext data
    let plaintext = encoder.encode_unsigned(message).unwrap();

    let (ciphertext, u, e, r) = encryptor.encrypt_return_components(&plaintext).unwrap();

    let decrypted = decryptor.decrypt(&ciphertext).unwrap();
    let data = encoder.decode_unsigned(&decrypted).unwrap();
    assert_eq!(message, data, "decryption failed.");

    let message = BfvMessage {
        plaintext,
        bounds: None,
    };
    let statement = BfvProofStatement::PublicKeyEncryption {
        message_id: 0,
        ciphertext,
        public_key,
    };
    let witness = BfvWitness::PublicKeyEncryption {
        u: Cow::Owned(u),
        e: Cow::Owned(e),
        r: Cow::Owned(r),
    };
    generate_prover_knowledge(&[statement], &[message], &[witness], &params, &ctx)
}
