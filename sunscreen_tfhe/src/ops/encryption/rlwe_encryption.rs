use crate::{
    dst::FromMutSlice,
    entities::{GlweCiphertext, GlweSecretKeyRef, Polynomial, PolynomialRef, RlwePublicKeyRef},
    ops::encryption::encrypt_glwe_ciphertext_secret,
    polynomial::{polynomial_add_assign, polynomial_external_mad},
    rand::{binary_torus_polynomial, normal_torus_polynomial},
    scratch::allocate_scratch_ref,
    GlweDef, PlaintextBits, Torus, TorusOps,
};

/// The randomness used to generate a public-key RLWE encryption of a message.
/// Useful when generating zero-knowledge proofs.
///
/// # Security
/// This information must remain private. Sharing this information compromises the
/// security of the encrypted message.
///
/// # Remarks
/// See [`rlwe_encrypt_public`] for an explanation of the RLWE public-key encryption
/// algorithm and the significance of `e_1`, `e_2`, and `u`.
pub struct RlwePublicEncryptionRandomness<S>
where
    S: TorusOps,
{
    /// The normal e_1 term.
    pub e0: Polynomial<Torus<S>>,

    /// The normal e_2 term.
    pub e1: Polynomial<Torus<S>>,

    /// The binary u term.
    pub u: Polynomial<S>,
}

/// Generate an RLWE public key into `public_key` for the given `secret_key`.
///
/// # Remarks
/// RLWE is a special case of GLWE where N is a power of 2 as normal, but size is 1.
///
/// An RLWE public key is simply an secret-key RLWE encryption of the zero polynomial.
///
/// # Panics
/// If `glwe.dim.size != 1`.
pub fn rlwe_generate_public_key<S>(
    public_key: &mut RlwePublicKeyRef<S>,
    secret_key: &GlweSecretKeyRef<S>,
    glwe: &GlweDef,
) where
    S: TorusOps,
{
    assert_eq!(glwe.dim.size.0, 1);

    allocate_scratch_ref!(pt, PolynomialRef<Torus<S>>, (glwe.dim.polynomial_degree));
    pt.clear();

    encrypt_glwe_ciphertext_secret(public_key.zero_encryption_mut(), pt, secret_key, glwe);
}

/// Encode and encrypt `msg` into a GLWE ciphertext using the given RLWE public key.
///
/// # Remarks
/// RLWE is a special case of GLWE where N is a power of 2 as normal, but size is 1.
///
/// # Panics
/// If `glwe.dim.size != 1` or if the parameters don't match `ct`, `msg`, or `public_key`.
pub fn rlwe_encode_encrypt_public<S>(
    ct: &mut GlweCiphertext<S>,
    msg: &PolynomialRef<S>,
    public_key: &RlwePublicKeyRef<S>,
    plaintext_bits: &PlaintextBits,
    glwe: &GlweDef,
) -> RlwePublicEncryptionRandomness<S>
where
    S: TorusOps,
{
    allocate_scratch_ref!(encoded, PolynomialRef<Torus<S>>, (msg.degree()));

    for (enc, msg) in encoded.coeffs_mut().iter_mut().zip(msg.coeffs()) {
        *enc = Torus::encode(*msg, *plaintext_bits);
    }

    rlwe_encrypt_public(ct, encoded, public_key, glwe)
}

/// Encrypts an encoded polynomial message using the given [`RlwePublicKey`](RlwePublicKeyRef).
///
/// # Algorithm
/// This method uses the double-lwe trick, which is efficient but introduces
/// more noise than Regev's trick (i.e. summing many encryptions of zero). We adapt this
/// algorithm from the BFV public key algorithm presented in the Microsoft SEAL manual.
/// While being a different FHE scheme, BFV also uses RLWE encryption, so the algorithm
/// is compatible.
///
/// Given that a [`RlwePublicKey`](RlwePublicKeyRef) is an encryption of zero, we write
/// `(p0, p1) = public_key` and `m = encoded_msg`.
///
/// We next generate the uniform binary polynomial `u` and polynomials `e1`, `e2`
/// sampled from Gaussian distribution using the standard deviation defined in
/// [`GlweDef`].
///
/// We then compute the RLWE ciphertext as `(p0 * u + e0, m + p1 * u + e1)`, write the
/// result into `ct` and return `u`, `e0`, `e1` in an [`RlwePublicEncryptionRandomness`].
///
/// # Panics
/// If `glwe.dim.size != 1` or if the parameters don't match `ct`, `msg`, or `public_key`.
pub fn rlwe_encrypt_public<S>(
    ct: &mut GlweCiphertext<S>,
    encoded_msg: &PolynomialRef<Torus<S>>,
    public_key: &RlwePublicKeyRef<S>,
    glwe: &GlweDef,
) -> RlwePublicEncryptionRandomness<S>
where
    S: TorusOps,
{
    rlwe_encrypt_public_impl(ct, encoded_msg, public_key, glwe)
}

fn rlwe_encrypt_public_impl<S>(
    ct: &mut GlweCiphertext<S>,
    encoded_msg: &PolynomialRef<Torus<S>>,
    public_key: &RlwePublicKeyRef<S>,
    glwe: &GlweDef,
) -> RlwePublicEncryptionRandomness<S>
where
    S: TorusOps,
{
    assert_eq!(glwe.dim.size.0, 1);
    assert_eq!(encoded_msg.len(), glwe.dim.polynomial_degree.0);
    ct.assert_valid(glwe);
    public_key.assert_valid(glwe);

    let mut u = Polynomial::<S>::zero(glwe.dim.polynomial_degree.0);
    binary_torus_polynomial(&mut u);

    let mut e0 = Polynomial::<Torus<S>>::zero(glwe.dim.polynomial_degree.0);
    let mut e1 = e0.clone();
    normal_torus_polynomial(&mut e0, glwe.std);
    normal_torus_polynomial(&mut e1, glwe.std);

    let (p0, p1) = public_key.p0_p1(glwe);
    let (mut a, b) = ct.a_b_mut(glwe);
    let a = a.next().unwrap();

    polynomial_external_mad(a, p0, &u);
    polynomial_add_assign(a, &e0);

    polynomial_external_mad(b, p1, &u);
    polynomial_add_assign(b, &e1);
    polynomial_add_assign(b, encoded_msg);

    RlwePublicEncryptionRandomness { e0, e1, u }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        entities::{GlweSecretKey, RlwePublicKey},
        GLWE_1_1024_128,
    };

    #[test]
    fn rlwe_public_key_encrypts_zero() {
        let glwe = GLWE_1_1024_128;

        let mut pk = RlwePublicKey::<u64>::new(&glwe);
        let sk = GlweSecretKey::generate_binary(&glwe);

        for _ in 0..100 {
            pk.clear();
            rlwe_generate_public_key(&mut pk, &sk, &glwe);

            let acutal = sk.decrypt_decode_glwe(pk.zero_encryption(), &glwe, PlaintextBits(1));

            assert_eq!(acutal, Polynomial::zero(glwe.dim.polynomial_degree.0));
        }
    }

    #[test]
    fn can_rlwe_public_key_encrypt() {
        let glwe = GLWE_1_1024_128;

        let msg = (0..glwe.dim.polynomial_degree.0 as u64)
            .map(|i| i % 2)
            .collect::<Vec<_>>();
        let msg = Polynomial::new(&msg);

        for _ in 0..100 {
            let mut pk = RlwePublicKey::<u64>::new(&glwe);
            let sk = GlweSecretKey::<u64>::generate_binary(&glwe);
            let mut ct = GlweCiphertext::<u64>::new(&glwe);

            rlwe_generate_public_key(&mut pk, &sk, &glwe);
            rlwe_encode_encrypt_public(&mut ct, &msg, &pk, &PlaintextBits(1), &glwe);

            let actual = sk.decrypt_decode_glwe(&ct, &glwe, PlaintextBits(1));

            assert_eq!(msg, actual);
        }
    }
}
