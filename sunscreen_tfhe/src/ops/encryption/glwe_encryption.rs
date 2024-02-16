use num::Zero;

use crate::{
    entities::{GlweCiphertextRef, GlweSecretKeyRef, Polynomial, PolynomialRef},
    polynomial::{polynomial_add_assign, polynomial_external_mad, polynomial_sub_assign},
    rand::{normal_torus, uniform_torus},
    GlweDef, Torus, TorusOps,
};

pub(crate) fn trivially_encrypt_glwe_with_sk_argument<S>(
    glwe_ciphertext: &mut GlweCiphertextRef<S>,
    msg: &PolynomialRef<Torus<S>>,
    _glwe_secret_key: &GlweSecretKeyRef<S>,
    params: &GlweDef,
) where
    S: TorusOps,
{
    trivially_encrypt_glwe_ciphertext(glwe_ciphertext, msg, params);
}

/// Encrypt `msg` into a into the given GLWE ciphertext `c` using the secret key `sk.`
pub fn encrypt_glwe_ciphertext_secret_generic<S>(
    c: &mut GlweCiphertextRef<S>,
    msg: &PolynomialRef<Torus<S>>,
    sk: &GlweSecretKeyRef<S>,
    params: &GlweDef,
) where
    S: TorusOps,
{
    let mut tmp = Polynomial::zero(params.dim.polynomial_degree.0);

    let (a, b) = c.a_b_mut(params);

    // tmp = A_i * S_i
    for (a_i, s_i) in a.zip(sk.s(params)) {
        // Fill a_i with uniform data
        for c in a_i.coeffs_mut() {
            *c = uniform_torus();
        }

        polynomial_external_mad(&mut tmp, a_i, s_i);
    }

    // b = A * S
    polynomial_add_assign(b, &tmp);

    // b = A * S + m
    polynomial_add_assign(b, msg);

    let e = Polynomial::new(
        &(0..msg.len())
            .map(|_| normal_torus::<S>(params.std))
            .collect::<Vec<_>>(),
    );

    // b = A * S + m + e
    polynomial_add_assign(b, &e);
}

/// Encrypt `msg` into a into the given GLWE ciphertext `c` using the secret key `sk.`
pub fn encrypt_glwe_ciphertext_secret<S>(
    c: &mut GlweCiphertextRef<S>,
    msg: &PolynomialRef<Torus<S>>,
    sk: &GlweSecretKeyRef<S>,
    params: &GlweDef,
) where
    S: TorusOps,
{
    encrypt_glwe_ciphertext_secret_generic(c, msg, sk, params)
}

/// Generate a trivial GLWE encryption. Note that the caller will need to scale
/// the message appropriately; a factor like delta is not automatically applied.
pub fn trivially_encrypt_glwe_ciphertext<S>(
    c: &mut GlweCiphertextRef<S>,
    msg: &PolynomialRef<Torus<S>>,
    params: &GlweDef,
) where
    S: TorusOps,
{
    let (a, b) = c.a_b_mut(params);

    // tmp = A_i * S_i
    for a_i in a {
        // Fill a_i with zero data
        for c in a_i.coeffs_mut() {
            *c = Torus::zero();
        }
    }

    // b = m
    b.clone_from_ref(msg);
}

/// Decrypt GLWE ciphertext `ct` into `msg` using secret key `sk`.
pub fn decrypt_glwe_ciphertext<S>(
    msg: &mut PolynomialRef<Torus<S>>,
    ct: &GlweCiphertextRef<S>,
    sk: &GlweSecretKeyRef<S>,
    params: &GlweDef,
) where
    S: TorusOps,
{
    let (a, b) = ct.a_b(params);

    let mut tmp = Polynomial::zero(b.len());

    // msg = b
    msg.clone_from_ref(b);

    // tmp = A_i * S_i
    for (a_i, s_i) in a.zip(sk.s(params)) {
        polynomial_external_mad(&mut tmp, a_i, s_i);
    }

    // msg = b - A * S = m + e
    polynomial_sub_assign(msg, &tmp);
}

#[cfg(test)]
mod tests {
    use crate::{high_level::*, PlaintextBits};

    use super::*;

    // Encryption

    #[test]
    fn can_encrypt_decrypt() {
        let params = TEST_GLWE_DEF_1;
        let bits = PlaintextBits(4);

        let sk = keygen::generate_binary_glwe_sk(&params);

        let plaintext = Polynomial::new(
            &(0..params.dim.polynomial_degree.0 as u64)
                .map(|x| x % 2)
                .collect::<Vec<_>>(),
        );

        let ct = encryption::encrypt_glwe(&plaintext, &sk, &params, bits);
        let dec = encryption::decrypt_glwe(&ct, &sk, &params, bits);

        assert_eq!(dec, plaintext);
    }

    #[test]
    fn can_encrypt_decrypt_uniform() {
        let params = TEST_GLWE_DEF_1;
        let bits = PlaintextBits(4);

        let sk = keygen::generate_uniform_glwe_sk(&params);

        let plaintext = Polynomial::new(
            &(0..params.dim.polynomial_degree.0 as u64)
                .map(|x| x % 2)
                .collect::<Vec<_>>(),
        );

        let ct = encryption::encrypt_glwe(&plaintext, &sk, &params, bits);
        let dec = encryption::decrypt_glwe(&ct, &sk, &params, bits);

        assert_eq!(dec, plaintext);
    }

    #[test]
    fn trivial_glwe_decrypts() {
        let params = TEST_GLWE_DEF_1;
        let bits = PlaintextBits(4);

        let sk = keygen::generate_binary_glwe_sk(&params);

        let plaintext = Polynomial::new(
            &(0..params.dim.polynomial_degree.0 as u64)
                .map(|x| x % 2)
                .collect::<Vec<_>>(),
        );

        let ct = encryption::trivial_glwe(&plaintext, &params, bits);
        let dec = encryption::decrypt_glwe(&ct, &sk, &params, bits);

        assert_eq!(dec, plaintext);
    }
}
