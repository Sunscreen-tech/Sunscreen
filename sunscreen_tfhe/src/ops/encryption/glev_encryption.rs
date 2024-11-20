use crate::{
    dst::FromMutSlice,
    entities::{GlevCiphertextRef, GlweCiphertextRef, GlweSecretKeyRef, Polynomial, PolynomialRef},
    polynomial::polynomial_scalar_mul,
    scratch::allocate_scratch_ref,
    GlweDef, RadixDecomposition, Torus, TorusOps,
};

use super::{
    decrypt_glwe_ciphertext, encrypt_glwe_ciphertext_secret,
    trivially_encrypt_glwe_with_sk_argument,
};

/// Perform a GLev encryption. This is generic in case a trivial GLev encryption
/// is wanted (for example, for testing purposes).
pub(crate) fn encrypt_glev_ciphertext_generic<S>(
    glev_ciphertext: &mut GlevCiphertextRef<S>,
    msg: &PolynomialRef<Torus<S>>,
    glwe_secret_key: &GlweSecretKeyRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
    encrypt: impl Fn(
        &mut GlweCiphertextRef<S>,
        &PolynomialRef<Torus<S>>,
        &GlweSecretKeyRef<S>,
        &GlweDef,
    ),
) where
    S: TorusOps,
{
    let decomposition_radix_log = radix.radix_log.0;
    let polynomial_degree = params.dim.polynomial_degree.0;

    for (j, glwe) in glev_ciphertext.glwe_ciphertexts_mut(params).enumerate() {
        let mut scaled_msg = Polynomial::zero(polynomial_degree);

        // The factor is q / B^{i+1}. Since B is a power of 2, this is equivalent to
        // multiplying by 2^{log2(q) - log2(B) * (i + 1)}
        let decomp_factor =
            S::from_u64(0x1 << (S::BITS as usize - decomposition_radix_log * (j + 1)));

        polynomial_scalar_mul(&mut scaled_msg, msg, decomp_factor);

        encrypt(glwe, &scaled_msg, glwe_secret_key, params);
    }
}

#[allow(dead_code)]
/// Encrypt a GLev ciphertext with a given message polynomial and secret key.
pub(crate) fn encrypt_glev_ciphertext<S>(
    glev_ciphertext: &mut GlevCiphertextRef<S>,
    msg: &PolynomialRef<Torus<S>>,
    glwe_secret_key: &GlweSecretKeyRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    encrypt_glev_ciphertext_generic(
        glev_ciphertext,
        msg,
        glwe_secret_key,
        params,
        radix,
        encrypt_glwe_ciphertext_secret,
    );
}

#[allow(dead_code)]
/// Encrypt a GLev ciphertext with a given message polynomial and secret key.
/// This is a trivial encryption that doesn't use the secret key and is not
/// secure.
pub(crate) fn trivially_encrypt_glev_ciphertext<S>(
    glev_ciphertext: &mut GlevCiphertextRef<S>,
    msg: &PolynomialRef<Torus<S>>,
    params: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    allocate_scratch_ref!(trivial_key, GlweSecretKeyRef<S>, (params.dim));
    trivial_key.clear();

    encrypt_glev_ciphertext_generic(
        glev_ciphertext,
        msg,
        trivial_key,
        params,
        radix,
        trivially_encrypt_glwe_with_sk_argument,
    );
}

pub(crate) fn decrypt_glwe_in_glev<S>(
    msg: &mut PolynomialRef<Torus<S>>,
    glev_ciphertext: &GlevCiphertextRef<S>,
    glwe_secret_key: &GlweSecretKeyRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
    index: usize,
) -> Option<()>
where
    S: TorusOps,
{
    let decomposition_radix_log = radix.radix_log.0;

    // To decrypt a GLev ciphertext, it suffices to decrypt the first GLWE ciphertext in
    // and divide by its decomposition factor.
    let glwe = glev_ciphertext.glwe_ciphertexts(params).nth(index)?;

    // Decrypt that specific GLWE ciphertext, which should have a message of
    // q / beta ^ {column + 1} * SM, where SM is the message times the secret
    // every row but the last (-SM) and M for the last row.
    decrypt_glwe_ciphertext(msg, glwe, glwe_secret_key, params);

    let mask = (0x1 << decomposition_radix_log) - 1;

    for c in msg.coeffs_mut() {
        let val = c.inner() >> (S::BITS as usize - decomposition_radix_log * (index + 1));
        let r = (c.inner() >> (S::BITS as usize - decomposition_radix_log * (index + 1) - 1))
            & S::from_u64(0x1);

        *c = Torus::from((val + r) & S::from_u64(mask));
    }

    Some(())
}

#[allow(dead_code)]
/// Decrypt a GLev ciphertext with a given secret key.
pub(crate) fn decrypt_glev_ciphertext<S>(
    msg: &mut PolynomialRef<Torus<S>>,
    glev_ciphertext: &GlevCiphertextRef<S>,
    glwe_secret_key: &GlweSecretKeyRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    assert_eq!(msg.len(), params.dim.polynomial_degree.0);
    params.assert_valid();
    radix.assert_valid::<S>();
    glev_ciphertext.assert_valid(params, radix);
    glwe_secret_key.assert_valid(params);

    decrypt_glwe_in_glev(msg, glev_ciphertext, glwe_secret_key, params, radix, 0).unwrap();
}

#[cfg(test)]
mod tests {
    use crate::{entities::GlevCiphertext, high_level::*};

    use super::*;

    fn encrypt_decrypt_glev_const_coeff() {
        let params = &TEST_GLWE_DEF_1;
        let radix = &TEST_RADIX;

        let sk = keygen::generate_binary_glwe_sk(&params);

        let msg = 1u64;
        let mut poly_msg = Polynomial::zero(params.dim.polynomial_degree.0);
        poly_msg.coeffs_mut()[0] = msg;
        let poly_msg = poly_msg.as_torus();

        let mut glev_ciphertext = GlevCiphertext::new(params, radix);
        let mut output_msg = Polynomial::zero(params.dim.polynomial_degree.0);

        encrypt_glev_ciphertext(&mut glev_ciphertext, poly_msg, &sk, &params, radix);
        decrypt_glev_ciphertext(&mut output_msg, &glev_ciphertext, &sk, &params, radix);

        assert_eq!(output_msg.coeffs()[0], msg.into());

        for c in output_msg.coeffs().iter().skip(1) {
            assert_eq!(*c, 0.into());
        }
    }

    #[test]
    fn can_encrypt_decrypt_glev_const_coeff() {
        for _ in 0..10 {
            encrypt_decrypt_glev_const_coeff();
        }
    }

    /// Test that each of the rows in the GLev ciphertext is a GLWE ciphertext that encodes the
    /// appropriate message (usually the decomposed message times the secret key)
    #[test]
    fn can_decrypt_all_elements_glev() {
        let params = TEST_GLWE_DEF_1;
        let radix = TEST_RADIX;

        let sk = keygen::generate_binary_glwe_sk(&params);

        let coeffs = (0..params.dim.polynomial_degree.0 as u64)
            .map(|x| x % 2)
            .collect::<Vec<_>>();
        let msg = Polynomial::new(&coeffs).as_torus().to_owned();

        let mut ct = GlevCiphertext::new(&params, &radix);
        encrypt_glev_ciphertext(&mut ct, &msg, &sk, &params, &radix);

        let mut pt = Polynomial::zero(params.dim.polynomial_degree.0);
        decrypt_glev_ciphertext(&mut pt, &ct, &sk, &params, &radix);

        // Ensure that the basic decryption works.
        assert_eq!(pt, msg.to_owned());

        let n_glwes = ct.glwe_ciphertexts(&params).len();

        // Beta
        let decomposition_radix_log = radix.radix_log.0;

        for i in 0..n_glwes {
            let mut pt = Polynomial::zero(params.dim.polynomial_degree.0);
            let mut scaled_msg = msg.to_owned();

            let mask = (0x1 << decomposition_radix_log) - 1;

            for c in scaled_msg.coeffs_mut() {
                *c = Torus::from(c.inner() & mask);
            }

            decrypt_glwe_in_glev(&mut pt, &ct, &sk, &params, &radix, i).unwrap();

            assert_eq!(pt, scaled_msg.to_owned());
        }
    }

    #[test]
    fn can_trivially_decrypy_glev() {
        let params = TEST_GLWE_DEF_1;
        let radix = TEST_RADIX;

        let sk = keygen::generate_binary_glwe_sk(&params);

        let coeffs = (0..params.dim.polynomial_degree.0 as u64)
            .map(|x| x % 2)
            .collect::<Vec<_>>();
        let msg = Polynomial::new(&coeffs).as_torus().to_owned();

        let mut ct = GlevCiphertext::new(&params, &radix);
        trivially_encrypt_glev_ciphertext(&mut ct, &msg, &params, &radix);

        let mut pt = Polynomial::zero(params.dim.polynomial_degree.0);
        decrypt_glev_ciphertext(&mut pt, &ct, &sk, &params, &radix);

        // Ensure that the basic decryption works.
        assert_eq!(pt, msg);

        let n_glwe = ct.glwe_ciphertexts(&params).len();

        // Beta
        let decomposition_radix_log = radix.radix_log.0;

        for i in 0..n_glwe {
            let mut pt = Polynomial::zero(params.dim.polynomial_degree.0);
            let mut scaled_msg = msg.to_owned();

            let mask = (0x1 << decomposition_radix_log) - 1;

            for c in scaled_msg.coeffs_mut() {
                *c = Torus::from(c.inner() & mask);
            }

            decrypt_glwe_in_glev(&mut pt, &ct, &sk, &params, &radix, i).unwrap();

            assert_eq!(pt, scaled_msg);
        }
    }
}
