use crate::{
    entities::{
        GlweCiphertextRef, GlweKeyswitchKeyRef, GlweSecretKeyRef, Polynomial, PolynomialRef,
    },
    ops::encryption::encrypt_glwe_ciphertext_secret_generic,
    polynomial::polynomial_scalar_mul,
    GlweDef, RadixDecomposition, Torus, TorusOps,
};

fn encrypt_glwe_ciphertext_secret_with_keyswitch_noise<S>(
    c: &mut GlweCiphertextRef<S>,
    msg: &PolynomialRef<Torus<S>>,
    sk: &GlweSecretKeyRef<S>,
    params: &GlweDef,
) where
    S: TorusOps,
{
    encrypt_glwe_ciphertext_secret_generic(c, msg, sk, params);
}

/**
 * Generates a keyswitch key from the original key to the new key. The resulting
 * keyswitch key is encrypted under the new key. This function is generic over
 * the encrypt function should there be a need.
 *
 * The specific operation on each GLev ciphertext row inside a keyswitch key is
 *
 * ```text
 * KSK_i = (GLWE_{s', })
 * ```
 */
fn encrypt_keyswitch_key_generic<S>(
    keyswitch_key: &mut GlweKeyswitchKeyRef<S>,
    original_glwe_secret_key: &GlweSecretKeyRef<S>,
    new_glwe_secret_key: &GlweSecretKeyRef<S>,
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

    for (i, row) in keyswitch_key.rows_mut(params, radix).enumerate() {
        let s = original_glwe_secret_key
            .s(params)
            .nth(i)
            .unwrap()
            .map(|x| Torus::from(*x));

        for (j, col) in row.glwe_ciphertexts_mut(params).enumerate() {
            let mut scaled_original_key = Polynomial::zero(polynomial_degree);
            // The factor is q / B^{i+1}. Since B is a power of 2, this is equivalent to
            // multiplying by 2^{log2(q) - log2(B) * (i + 1)}
            let decomp_factor =
                S::from_u64(0x1 << (S::BITS as usize - decomposition_radix_log * (j + 1)));

            polynomial_scalar_mul(&mut scaled_original_key, &s, decomp_factor);

            encrypt(col, &scaled_original_key, new_glwe_secret_key, params);
        }
    }
}

/// Generate a keyswitch key from the original key to the new key.
/// For use with
/// [`keyswitch_glwe_to_glwe`](crate::ops::keyswitch::glwe_keyswitch::keyswitch_glwe_to_glwe).
pub fn generate_keyswitch_key_glwe<S>(
    keyswitch_key: &mut GlweKeyswitchKeyRef<S>,
    original_glwe_secret_key: &GlweSecretKeyRef<S>,
    new_glwe_secret_key: &GlweSecretKeyRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    encrypt_keyswitch_key_generic(
        keyswitch_key,
        original_glwe_secret_key,
        new_glwe_secret_key,
        params,
        radix,
        encrypt_glwe_ciphertext_secret_with_keyswitch_noise,
    )
}

#[cfg(test)]
mod tests {

    use crate::{
        dst::{AsSlice, FromSlice},
        entities::{GlweKeyswitchKey, GlweKeyswitchKeyRef},
        high_level::{TEST_GLWE_DEF_1, TEST_RADIX},
        Torus,
    };

    #[test]
    fn test_generate_keyswitch_key_glwe() {
        // Size of the arrary should be (k + 1) * l * k * poly_degree as we are
        // GLev encrypting all S_i with a given radix count and base.
        let ksk = GlweKeyswitchKey::<u64>::new(&TEST_GLWE_DEF_1, &TEST_RADIX);

        let k = TEST_GLWE_DEF_1.dim.size.0;
        let l = TEST_RADIX.count.0;
        let poly_degree = TEST_GLWE_DEF_1.dim.polynomial_degree.0;
        assert_eq!(ksk.as_slice().len(), (k + 1) * l * k * poly_degree);

        // Generate fake data to iterate through.
        let ksk_data = (0..ksk.as_slice().len())
            .map(|x| Torus::from(x as u64))
            .collect::<Vec<Torus<u64>>>();

        let ksk = GlweKeyswitchKeyRef::<u64>::from_slice(&ksk_data);

        // Check that the data is correct.
        let glwe_size = TEST_GLWE_DEF_1.dim.polynomial_degree.0 * (TEST_GLWE_DEF_1.dim.size.0 + 1);
        let mut count = 0;
        for row in ksk.rows(&TEST_GLWE_DEF_1, &TEST_RADIX) {
            for glwe in row.glwe_ciphertexts(&TEST_GLWE_DEF_1) {
                let (a, b) = glwe.a_b(&TEST_GLWE_DEF_1);

                let expected_vector = (count..(glwe_size + count))
                    .map(|x| Torus::from(x as u64))
                    .collect::<Vec<_>>();

                let (a_expected, b_expected) = expected_vector
                    .split_at(TEST_GLWE_DEF_1.dim.size.0 * TEST_GLWE_DEF_1.dim.polynomial_degree.0);

                let a_i_expected = a_expected
                    .chunks(TEST_GLWE_DEF_1.dim.polynomial_degree.0)
                    .map(|x| x.to_vec())
                    .collect::<Vec<Vec<Torus<u64>>>>();

                for (a_j, a_j_expected) in a.zip(a_i_expected) {
                    assert_eq!(a_j.coeffs(), a_j_expected);
                }

                assert_eq!(b.coeffs(), b_expected);

                count += glwe_size;
            }
        }
    }
}
