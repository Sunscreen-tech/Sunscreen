use crate::{
    dst::FromMutSlice,
    entities::{
        GlweCiphertext, GlweSecretKeyRef, Polynomial, PolynomialRef, RlwePublicKeyRef,
    },
    ops::encryption::encrypt_glwe_ciphertext_secret,
    polynomial::{polynomial_add_assign, polynomial_external_mad},
    rand::{binary_torus_polynomial, normal_torus_polynomial},
    scratch::allocate_scratch_ref,
    GlweDef, PlaintextBits, Torus, TorusOps,
};

/// Generate an RLWE public key into `public_key`.
///
/// # Remarks
/// RLWE is a special case of GLWE where N is a power of 2 as normal, but size is 1.
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
) where
    S: TorusOps,
{
    allocate_scratch_ref!(encoded, PolynomialRef<Torus<S>>, (msg.degree()));

    for (enc, msg) in encoded.coeffs_mut().iter_mut().zip(msg.coeffs()) {
        *enc = Torus::encode(*msg, *plaintext_bits);
    }

    rlwe_encrypt_public(ct, encoded, public_key, glwe);
}

/// TODO
pub fn rlwe_encrypt_public<S>(
    ct: &mut GlweCiphertext<S>,
    encoded_msg: &PolynomialRef<Torus<S>>,
    public_key: &RlwePublicKeyRef<S>,
    glwe: &GlweDef,
) where
    S: TorusOps,
{
    rlwe_encrypt_public_impl(ct, encoded_msg, public_key, glwe);
}

fn rlwe_encrypt_public_impl<S>(
    ct: &mut GlweCiphertext<S>,
    encoded_msg: &PolynomialRef<Torus<S>>,
    public_key: &RlwePublicKeyRef<S>,
    glwe: &GlweDef,
) where
    S: TorusOps,
{
    assert_eq!(glwe.dim.size.0, 1);
    assert_eq!(encoded_msg.len(), glwe.dim.polynomial_degree.0);
    ct.assert_valid(glwe);
    public_key.assert_valid(glwe);

    // TODO: Return the noise
    let mut u = Polynomial::<S>::zero(glwe.dim.polynomial_degree.0);
    binary_torus_polynomial(&mut u);

    let mut e_1 = Polynomial::<Torus<S>>::zero(glwe.dim.polynomial_degree.0);
    let mut e_2 = e_1.clone();
    normal_torus_polynomial(&mut e_1, glwe.std);
    normal_torus_polynomial(&mut e_2, glwe.std);

    let (p0, p1) = public_key.p0_p1(glwe);
    let (mut a, b) = ct.a_b_mut(glwe);
    let a = a.next().unwrap();

    polynomial_external_mad(a, p0, &u);
    polynomial_add_assign(a, &e_1);

    polynomial_external_mad(b, p1, &u);
    polynomial_add_assign(b, &e_2);
    polynomial_add_assign(b, encoded_msg);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{entities::{GlweSecretKey, RlwePublicKey}, GLWE_1_1024_128};

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
