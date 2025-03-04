use crate::{
    dst::FromMutSlice,
    entities::{
        GlevCiphertextRef, GlweCiphertextRef, GlweSecretKeyRef, PolynomialRef, RlwePublicKeyRef,
    },
    ops::encryption::rlwe_encrypt_public,
    polynomial::polynomial_scalar_mul,
    scratch::allocate_scratch_ref,
    GlweDef, OverlaySize, RadixDecomposition, Torus, TorusOps,
};

use super::{
    decrypt_glwe_ciphertext, encrypt_glwe_ciphertext_secret,
    trivially_encrypt_glwe_with_sk_argument,
};

/// Perform a GLev encryption. This is generic in case a trivial GLev encryption
/// is wanted (for example, for testing purposes).
///
/// # Panics
/// If `radix` parameters are invalid.
/// If `glev_cipertext`, `msg`, `glwe_secret_key` are not valid under `params`.
pub(crate) fn encrypt_secret_glev_ciphertext_generic<S>(
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
    radix.assert_valid::<S>();
    glev_ciphertext.assert_is_valid((params.dim, radix.count));
    msg.assert_is_valid(params.dim.polynomial_degree);
    glwe_secret_key.assert_is_valid(params.dim);

    let decomposition_radix_log = radix.radix_log.0;

    allocate_scratch_ref!(
        scaled_msg,
        PolynomialRef<Torus<S>>,
        (params.dim.polynomial_degree)
    );

    for (j, glwe) in glev_ciphertext.glwe_ciphertexts_mut(params).enumerate() {
        scale_msg_by_gadget_factor(scaled_msg, msg, decomposition_radix_log, j);
        encrypt(glwe, scaled_msg, glwe_secret_key, params);
    }
}

/// Multiplies each [`Torus`] coefficient in `msg` by `1/beta^(j + 1)`, writing the result
/// to `scaled_msg`.
///
/// # Remarks
/// GLEV ciphertexts feature redundant encryptions of `msg` where each message is scaled
/// by a corresponding gadget factor. This sets up some clever algebraic cancellation
/// that enables the GGSW-times-GLWE outer product.
pub fn scale_msg_by_gadget_factor<S>(
    scaled_msg: &mut PolynomialRef<Torus<S>>,
    msg: &PolynomialRef<Torus<S>>,
    decomposition_radix_log: usize,
    j: usize,
) where
    S: TorusOps,
{
    // The factor is q / B^{i+1}. Since B is a power of 2, this is equivalent to
    // multiplying by 2^{log2(q) - log2(B) * (i + 1)}
    let decomp_factor = S::from_u64(0x1 << (S::BITS as usize - decomposition_radix_log * (j + 1)));

    polynomial_scalar_mul(scaled_msg, msg, decomp_factor);
}

#[allow(dead_code)]
/// Encrypt a GLev ciphertext with a given message polynomial and secret key.
pub fn encrypt_secret_glev_ciphertext<S>(
    glev_ciphertext: &mut GlevCiphertextRef<S>,
    msg: &PolynomialRef<Torus<S>>,
    glwe_secret_key: &GlweSecretKeyRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    encrypt_secret_glev_ciphertext_generic(
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
pub fn trivially_encrypt_glev_ciphertext<S>(
    glev_ciphertext: &mut GlevCiphertextRef<S>,
    msg: &PolynomialRef<Torus<S>>,
    params: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    allocate_scratch_ref!(trivial_key, GlweSecretKeyRef<S>, (params.dim));
    trivial_key.clear();

    encrypt_secret_glev_ciphertext_generic(
        glev_ciphertext,
        msg,
        trivial_key,
        params,
        radix,
        trivially_encrypt_glwe_with_sk_argument,
    );
}

/// Encrypts `msg` as an RLEV ciphertext using `rlwe_public_key`.
///
/// # Remarks
/// RLEV is a special case of GLEV where `params.dim.size == 1`.
/// Coefficients in `msg` must be binary.
///
/// # Panics
/// If `radix` is invalid.
/// If `msg`, `rlev_ciphertext`, or `rlwe_public_key` are invalid for the given `params`
/// and `radix`. This requires that `params.dim.size == 1`.
pub fn encrypt_rlev_ciphertext<S>(
    rlev_ciphertext: &mut GlevCiphertextRef<S>,
    msg: &PolynomialRef<Torus<S>>,
    rlwe_public_key: &RlwePublicKeyRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    radix.assert_valid::<S>();
    msg.assert_is_valid(params.dim.polynomial_degree);
    rlev_ciphertext.assert_is_valid((params.dim, radix.count));
    rlwe_public_key.assert_is_valid(params.dim);

    allocate_scratch_ref!(
        scaled_msg,
        PolynomialRef<Torus<S>>,
        (params.dim.polynomial_degree)
    );

    for (j, glwe) in rlev_ciphertext.glwe_ciphertexts_mut(params).enumerate() {
        scale_msg_by_gadget_factor(scaled_msg, msg, radix.radix_log.0, j);

        dbg!(&scaled_msg.coeffs()[0..16]);

        rlwe_encrypt_public(glwe, scaled_msg, rlwe_public_key, params);
    }
}

pub(crate) fn decrypt_glwe_in_glev<S>(
    msg: &mut PolynomialRef<Torus<S>>,
    glev_ciphertext: &GlevCiphertextRef<S>,
    glwe_secret_key: &GlweSecretKeyRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
    index: usize,
) where
    S: TorusOps,
{
    radix.assert_valid::<S>();
    msg.assert_is_valid(params.dim.polynomial_degree);
    params.assert_valid();
    glev_ciphertext.assert_is_valid((params.dim, radix.count));
    glwe_secret_key.assert_is_valid(params.dim);

    let decomposition_radix_log = radix.radix_log.0;

    // To decrypt a GLev ciphertext, it suffices to decrypt the first GLWE ciphertext in
    // and divide by its decomposition factor.
    let glwe = glev_ciphertext.glwe_ciphertexts(params).nth(index).unwrap();

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
}

#[allow(dead_code)]
/// Decrypt a GLev ciphertext with a given secret key.
///
/// # Remarks
/// This method does *not* decode the message.
///
/// # Panics
/// If `radix` is invalid.
/// If `msg`, `glev_ciphertext`, or `glwe_secret_key` are invalid for `params` and `radix`.
pub fn decrypt_glev_ciphertext<S>(
    msg: &mut PolynomialRef<Torus<S>>,
    glev_ciphertext: &GlevCiphertextRef<S>,
    glwe_secret_key: &GlweSecretKeyRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    decrypt_glwe_in_glev(msg, glev_ciphertext, glwe_secret_key, params, radix, 0)
}

#[cfg(test)]
mod tests {
    use crate::{
        entities::{GlevCiphertext, Polynomial},
        high_level::*,
    };

    use super::*;

    fn encrypt_decrypt_glev_const_coeff() {
        let params = &TEST_GLWE_DEF_1;
        let radix = &TEST_RADIX;

        let sk = keygen::generate_binary_glwe_sk(params);

        let msg = 1u64;
        let mut poly_msg = Polynomial::zero(params.dim.polynomial_degree.0);
        poly_msg.coeffs_mut()[0] = msg;
        let poly_msg = poly_msg.as_torus();

        let mut glev_ciphertext = GlevCiphertext::new(params, radix);
        let mut output_msg = Polynomial::zero(params.dim.polynomial_degree.0);

        encrypt_secret_glev_ciphertext(&mut glev_ciphertext, poly_msg, &sk, params, radix);
        decrypt_glev_ciphertext(&mut output_msg, &glev_ciphertext, &sk, params, radix);

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
        encrypt_secret_glev_ciphertext(&mut ct, &msg, &sk, &params, &radix);

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

            decrypt_glwe_in_glev(&mut pt, &ct, &sk, &params, &radix, i);

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

            decrypt_glwe_in_glev(&mut pt, &ct, &sk, &params, &radix, i);

            assert_eq!(pt, scaled_msg);
        }
    }

    #[test]
    fn can_encrypt_rlev() {
        let params = TEST_RLWE_DEF;
        let radix = TEST_RADIX;

        let sk = keygen::generate_binary_glwe_sk(&params);
        let pk = keygen::generate_rlwe_public_key(&sk, &params);

        let msg = Polynomial::new(
            &(0..params.dim.polynomial_degree.0 as u64)
                .map(|x| x % 2)
                .collect::<Vec<_>>(),
        );

        let mut ct = GlevCiphertext::new(&params, &radix);

        for _ in 0..100 {
            encrypt_rlev_ciphertext(&mut ct, msg.as_torus(), &pk, &params, &radix);

            let mut actual = Polynomial::zero(params.dim.polynomial_degree.0);

            decrypt_glev_ciphertext(&mut actual, &ct, &sk, &params, &radix);

            assert_eq!(actual.as_ref(), msg.as_torus());
        }
    }
}
