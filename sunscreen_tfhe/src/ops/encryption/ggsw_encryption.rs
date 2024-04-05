
use num::Zero;

use crate::{
    dst::FromMutSlice,
    entities::{
        GgswCiphertextRef, GlweCiphertextRef, GlweSecretKeyRef, Polynomial,
        PolynomialRef,
    },
    polynomial::{polynomial_external_mad, polynomial_scalar_mad, polynomial_scalar_mul},
    scratch::allocate_scratch_ref,
    GlweDef, PlaintextBits, RadixDecomposition, Torus, TorusOps,
};

use super::{
    decrypt_glwe_ciphertext, encrypt_glwe_ciphertext_secret,
    trivially_encrypt_glwe_with_sk_argument,
};

/// Perform a ggsw encryption. This is generic in case a trivial GGSW encryption
/// is wanted (for example, for testing purposes).
pub(crate) fn encrypt_ggsw_ciphertext_generic<S>(
    ggsw_ciphertext: &mut GgswCiphertextRef<S>,
    msg: &PolynomialRef<S>,
    glwe_secret_key: &GlweSecretKeyRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
    plaintext_bits: PlaintextBits,
    encrypt: impl Fn(
        &mut GlweCiphertextRef<S>,
        &PolynomialRef<Torus<S>>,
        &GlweSecretKeyRef<S>,
        &GlweDef,
    ),
) where
    S: TorusOps,
{
    let max_val = S::from_u64(0x1 << plaintext_bits.0);
    assert!(msg.coeffs().iter().all(|x| *x < max_val));

    let decomposition_radix_log = radix.radix_log.0;
    let polynomial_degree = params.dim.polynomial_degree.0;
    let glwe_size = params.dim.size.0;

    // k + 1 rows with l columns of glwe ciphertexts. Element (i,j) is a glwe encryption
    // of -M/B^{i+1} * s_j, except for j=k+1, where it's simply an encryption of
    // M/B^{j+1}
    for (i, row) in ggsw_ciphertext.rows_mut(params, radix).enumerate() {
        let mut m_times_s = Polynomial::<Torus<S>>::zero(polynomial_degree);

        let m_times_s = if i < glwe_size {
            // The message is composed of the negated secret key and the message
            // for all but the last row.
            let s = glwe_secret_key.s(params).nth(i).unwrap();
            polynomial_external_mad(&mut m_times_s, msg.as_torus(), s);

            // Negate the product.
            for c in m_times_s.coeffs_mut().iter_mut() {
                // Have to call the trait directly because deref is implemented on Torus
                *c = num::traits::WrappingNeg::wrapping_neg(c);
            }

            &m_times_s
        } else {
            // Last row isn't multiplied by secret key.
            msg.as_torus()
        };

        for (j, col) in row.glwe_ciphertexts_mut(params).enumerate() {
            let mut scaled_msg = Polynomial::zero(polynomial_degree);

            // The factor is q / B^{i+1}. Since B is a power of 2, this is equivalent to
            // multiplying by 2^{log2(q) - log2(B) * (i + 1)}
            let decomp_factor =
                S::from_u64(0x1 << (S::BITS as usize - decomposition_radix_log * (j + 1)));

            polynomial_scalar_mul(&mut scaled_msg, m_times_s, decomp_factor);

            encrypt(col, &scaled_msg, glwe_secret_key, params);
        }
    }
}

/// Encrypt a GGSW ciphertext with a given message polynomial and secret key.
pub fn encrypt_ggsw_ciphertext<S>(
    ggsw_ciphertext: &mut GgswCiphertextRef<S>,
    msg: &PolynomialRef<S>,
    glwe_secret_key: &GlweSecretKeyRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
    plaintext_bits: PlaintextBits,
) where
    S: TorusOps,
{
    encrypt_ggsw_ciphertext_generic(
        ggsw_ciphertext,
        msg,
        glwe_secret_key,
        params,
        radix,
        plaintext_bits,
        encrypt_glwe_ciphertext_secret,
    );
}

/// Encrypt a GGSW ciphertext with a given message polynomial and secret key.
/// This is a trivial encryption that doesn't use the secret key and is not
/// secure.
pub fn trivially_encrypt_ggsw_ciphertext<S>(
    ggsw_ciphertext: &mut GgswCiphertextRef<S>,
    msg: &PolynomialRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
    plaintext_bits: PlaintextBits,
) where
    S: TorusOps,
{
    allocate_scratch_ref!(trivial_key, GlweSecretKeyRef<S>, (params.dim));
    trivial_key.clear();

    encrypt_ggsw_ciphertext_generic(
        ggsw_ciphertext,
        msg,
        trivial_key,
        params,
        radix,
        plaintext_bits,
        trivially_encrypt_glwe_with_sk_argument,
    );
}

/// Encrypt scalar (i.e. degree 0 polynomial) msg as a GGSW ciphertext.
pub fn encrypt_ggsw_ciphertext_scalar<S>(
    ggsw_ciphertext: &mut GgswCiphertextRef<S>,
    msg: S,
    glwe_secret_key: &GlweSecretKeyRef<S>,
    glwe_def: &GlweDef,
    radix: &RadixDecomposition,
    plaintext_bits: PlaintextBits,
) where
    S: TorusOps,
{
    assert!(plaintext_bits.0 < S::BITS);
    radix.assert_valid::<S>();
    glwe_def.assert_valid();
    glwe_secret_key.assert_valid(glwe_def);
    ggsw_ciphertext.assert_valid(glwe_def, radix);

    let max_val = S::from_u64(0x1 << plaintext_bits.0);
    assert!(msg < max_val);

    let decomposition_radix_log = radix.radix_log.0;
    let polynomial_degree = glwe_def.dim.polynomial_degree.0;
    let glwe_size = glwe_def.dim.size.0;

    // k + 1 rows with l columns of glwe ciphertexts. Element (i,j) is a glwe encryption
    // of -M/B^{i+1} * s_j, except for j=k+1, where it's simply an encryption of
    // M/B^{j+1}
    for (i, row) in ggsw_ciphertext.rows_mut(glwe_def, radix).enumerate() {
        let mut m_times_s = Polynomial::<Torus<S>>::zero(polynomial_degree);
        let m_times_s = if i < glwe_size {
            let s = glwe_secret_key.s(glwe_def).nth(i).unwrap();
            polynomial_scalar_mad(&mut m_times_s, s.as_torus(), msg);
            &m_times_s
        } else {
            // Last row isn't multiplied by secret key.
            m_times_s.clear();
            m_times_s.coeffs_mut()[0] = Torus::from(msg);
            &m_times_s
        };

        for (j, col) in row.glwe_ciphertexts_mut(glwe_def).enumerate() {
            let mut scaled_msg = Polynomial::zero(polynomial_degree);
            // The factor is q / B^{i+1}. Since B is a power of 2, this is equivalent to
            // multiplying by 2^{log2(q) - log2(B) * (i + 1)}
            let decomp_factor =
                S::from_u64(0x1 << (S::BITS as usize - decomposition_radix_log * (j + 1)));

            if i < glwe_size {
                let decomp_factor = decomp_factor.wrapping_neg();

                polynomial_scalar_mul(&mut scaled_msg, m_times_s, decomp_factor);
            } else {
                scaled_msg.coeffs_mut()[0] = Torus::from(msg.wrapping_mul(&decomp_factor));

                for c in scaled_msg.coeffs_mut().iter_mut().skip(1) {
                    *c = Torus::zero();
                }
            }

            encrypt_glwe_ciphertext_secret(col, &scaled_msg, glwe_secret_key, glwe_def);
        }
    }
}

fn decrypt_glwe_in_ggsw<S>(
    msg: &mut PolynomialRef<Torus<S>>,
    ggsw_ciphertext: &GgswCiphertextRef<S>,
    glwe_secret_key: &GlweSecretKeyRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
    row: usize,
    column: usize,
) -> Option<()>
where
    S: TorusOps,
{
    let decomposition_radix_log = radix.radix_log.0;

    // To decrypt a GGSW ciphertext, it suffices to decrypt the first GLWE ciphertext in
    // the last row and divide by its decomposition factor.
    let glev = ggsw_ciphertext.rows(params, radix).nth(row)?;
    let glwe = glev.glwe_ciphertexts(params).nth(column)?;

    // Decrypt that specific GLWE ciphertext, which should have a message of
    // q / beta ^ {column + 1} * SM, where SM is the message times the secret
    // every row but the last (-SM) and M for the last row.
    decrypt_glwe_ciphertext(msg, glwe, glwe_secret_key, params);

    let mask = (0x1 << decomposition_radix_log) - 1;

    for c in msg.coeffs_mut() {
        let val = c.inner() >> (S::BITS as usize - decomposition_radix_log * (column + 1));
        let r = (c.inner() >> (S::BITS as usize - decomposition_radix_log * (column + 1) - 1))
            & S::from_u64(0x1);

        *c = Torus::from((val + r) & S::from_u64(mask));
    }

    Some(())
}

/// Decrypt a GGSW ciphertext with a given secret key.
pub fn decrypt_ggsw_ciphertext<S>(
    msg: &mut PolynomialRef<Torus<S>>,
    ggsw_ciphertext: &GgswCiphertextRef<S>,
    glwe_secret_key: &GlweSecretKeyRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    assert_eq!(msg.len(), params.dim.polynomial_degree.0);
    params.assert_valid();
    radix.assert_valid::<S>();
    ggsw_ciphertext.assert_valid(params, radix);
    glwe_secret_key.assert_valid(params);

    let row = params.dim.size.0;

    decrypt_glwe_in_ggsw(msg, ggsw_ciphertext, glwe_secret_key, params, radix, row, 0).unwrap();
}

#[cfg(test)]
mod tests {
    use crate::{entities::GgswCiphertext, high_level::*};

    use super::*;

    #[test]
    fn can_encrypt_decrypt_gsw_const_coeff() {
        let params = TEST_GLWE_DEF_1;
        let radix = &TEST_RADIX;
        let bits = PlaintextBits(1);

        let sk = keygen::generate_binary_glwe_sk(&params);

        let msg = 1;

        let ct = encryption::encrypt_ggsw(msg, &sk, &params, radix, bits);
        let pt = encryption::decrypt_ggsw(&ct, &sk, &params, radix, bits);

        assert_eq!(pt.coeffs()[0], msg);

        for c in pt.coeffs().iter().skip(1) {
            assert_eq!(*c, 0);
        }
    }

    /// Test that each of the rows in the GGSW ciphertext is a GLWE ciphertext that encodes the
    /// appropriate message (usually the decomposed message times the secret key)
    #[test]
    fn can_decrypt_all_elements_ggsw() {
        let params = TEST_GLWE_DEF_1;
        let radix = TEST_RADIX;
        let bits = PlaintextBits(1);

        let sk = keygen::generate_binary_glwe_sk(&params);

        let coeffs = (0..params.dim.polynomial_degree.0 as u64)
            .map(|x| x % 2)
            .collect::<Vec<_>>();
        let msg = Polynomial::new(&coeffs);

        let mut ct = GgswCiphertext::new(&params, &radix);
        encrypt_ggsw_ciphertext(&mut ct, &msg, &sk, &params, &radix, bits);

        let mut pt = Polynomial::zero(params.dim.polynomial_degree.0);
        decrypt_ggsw_ciphertext(&mut pt, &ct, &sk, &params, &radix);
        let pt = pt.map(|x| x.inner());

        // Ensure that the basic decryption works.
        assert_eq!(pt, msg);

        let n_rows = ct.rows(&params, &radix).len();
        let n_cols = ct
            .rows(&params, &radix)
            .next()
            .unwrap()
            .glwe_ciphertexts(&params)
            .len();

        // Beta
        let decomposition_radix_log = radix.radix_log.0;

        for i in 0..n_rows {
            let mut m_times_s = Polynomial::zero(params.dim.polynomial_degree.0);
            let m_times_s = if i < params.dim.size.0 {
                // The message is composed of the negated secret key and the message
                // for all but the last row.
                let s = sk.s(&params).nth(i).unwrap();
                polynomial_external_mad(&mut m_times_s, msg.as_torus(), s);

                // Negate the product.
                for c in m_times_s.coeffs_mut().iter_mut() {
                    // Have to call the trait directly because deref is implemented on Torus
                    *c = num::traits::WrappingNeg::wrapping_neg(c);
                }

                &m_times_s
            } else {
                // Last row isn't multiplied by secret key.
                msg.as_torus()
            };

            for j in 0..n_cols {
                let mut pt = Polynomial::zero(params.dim.polynomial_degree.0);
                let mut msg = m_times_s.to_owned();

                let mask = (0x1 << decomposition_radix_log) - 1;

                for c in msg.coeffs_mut() {
                    *c = Torus::from(c.inner() & mask);
                }

                decrypt_glwe_in_ggsw(&mut pt, &ct, &sk, &params, &radix, i, j).unwrap();

                assert_eq!(pt, msg);
            }
        }
    }

    #[test]
    fn can_trivially_decrypy_ggsw() {
        let params = TEST_GLWE_DEF_1;
        let radix = TEST_RADIX;
        let bits = PlaintextBits(1);

        let sk = keygen::generate_binary_glwe_sk(&params);

        let coeffs = (0..params.dim.polynomial_degree.0 as u64)
            .map(|x| x % 2)
            .collect::<Vec<_>>();
        let msg = Polynomial::new(&coeffs);

        let mut ct = GgswCiphertext::new(&params, &radix);
        trivially_encrypt_ggsw_ciphertext(&mut ct, &msg, &params, &radix, bits);

        let mut pt = Polynomial::zero(params.dim.polynomial_degree.0);
        decrypt_ggsw_ciphertext(&mut pt, &ct, &sk, &params, &radix);
        let pt = pt.map(|x| x.inner());

        // Ensure that the basic decryption works.
        assert_eq!(pt, msg);

        let n_rows = ct.rows(&params, &radix).len();
        let n_cols = ct
            .rows(&params, &radix)
            .next()
            .unwrap()
            .glwe_ciphertexts(&params)
            .len();

        // Beta
        let decomposition_radix_log = radix.radix_log.0;

        for i in 0..n_rows {
            let m_times_s = Polynomial::zero(params.dim.polynomial_degree.0);
            let m_times_s = if i == params.dim.size.0 {
                msg.as_torus()
            } else {
                &m_times_s
            };

            for j in 0..n_cols {
                let mut pt = Polynomial::zero(params.dim.polynomial_degree.0);
                let mut msg = m_times_s.to_owned();

                let mask = (0x1 << decomposition_radix_log) - 1;

                for c in msg.coeffs_mut() {
                    *c = Torus::from(c.inner() & mask);
                }

                decrypt_glwe_in_ggsw(&mut pt, &ct, &sk, &params, &radix, i, j).unwrap();

                assert_eq!(pt, msg);
            }
        }
    }
}
