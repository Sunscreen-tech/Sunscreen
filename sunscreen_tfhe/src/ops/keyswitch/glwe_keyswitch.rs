use crate::{
    dst::FromMutSlice,
    entities::{GlweCiphertext, GlweCiphertextRef, GlweKeyswitchKeyRef, PolynomialRef},
    ops::{
        ciphertext::{decomposed_polynomial_glev_mad, sub_glwe_ciphertexts},
        encryption::trivially_encrypt_glwe_ciphertext,
    },
    radix::PolynomialRadixIterator,
    scratch::allocate_scratch_ref,
    GlweDef, RadixDecomposition, TorusOps,
};

/// Switches a ciphertext under the original key to a ciphertext under the new
/// key using a keyswitch key.
///
/// # Remark
///
/// This performs the following operation:
///
/// ```text
/// switched_ciphertext = trivial_encrypt(ciphertext_b) - sum_i(<decomp(ciphertext_a_i), glev_i>)
/// ```
///
/// where `trivial_encrypt` is the encryption of the body of the original
/// ciphertext.
pub fn keyswitch_glwe_to_glwe<S>(
    output: &mut GlweCiphertextRef<S>,
    ciphertext_under_original_key: &GlweCiphertextRef<S>,
    keyswitch_key: &GlweKeyswitchKeyRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    let (ciphertext_a, ciphertext_b) = ciphertext_under_original_key.a_b(params);

    let keyswitch_glevs = keyswitch_key.rows(params, radix);

    let mut a_i_decomp_sum = GlweCiphertext::new(params);
    allocate_scratch_ref!(scratch, PolynomialRef<S>, (params.dim.polynomial_degree));

    // sum_i(<decomp(ciphertext_a_i), glev_i>)
    for (a_i, glev_i) in ciphertext_a.zip(keyswitch_glevs) {
        let decomp = PolynomialRadixIterator::new(a_i, scratch, radix);

        decomposed_polynomial_glev_mad(&mut a_i_decomp_sum, decomp, glev_i, params);
    }

    // trivial_encrypt(ciphertext_b)
    let mut trivial_b = GlweCiphertext::new(params);
    trivially_encrypt_glwe_ciphertext(&mut trivial_b, ciphertext_b, params);

    // output = trivial_encrypt(ciphertext_b) - sum_i(<decomp(ciphertext_a_i), glev_i>)
    sub_glwe_ciphertexts(output, &trivial_b, &a_i_decomp_sum, params);
}

#[cfg(test)]
mod tests {

    use crate::{
        entities::{GlweCiphertext, GlweKeyswitchKey, Polynomial},
        high_level::*,
        ops::keyswitch::{
            glwe_keyswitch::keyswitch_glwe_to_glwe, glwe_keyswitch_key::generate_keyswitch_key_glwe,
        },
        PlaintextBits,
    };

    #[test]
    fn keyswitch_glwe() {
        let glwe = TEST_GLWE_DEF_1;
        let bits = PlaintextBits(1);

        let original_sk = keygen::generate_binary_glwe_sk(&glwe);
        let new_sk = keygen::generate_binary_glwe_sk(&glwe);

        let mut ksk = GlweKeyswitchKey::<u64>::new(&TEST_GLWE_DEF_1, &TEST_RADIX);
        generate_keyswitch_key_glwe(
            &mut ksk,
            &original_sk,
            &new_sk,
            &TEST_GLWE_DEF_1,
            &TEST_RADIX,
        );

        let msg = Polynomial::new(
            &(0..glwe.dim.polynomial_degree.0 as u64)
                .map(|x| x % 2)
                .collect::<Vec<_>>(),
        );

        let original_ct = original_sk.encode_encrypt_glwe(&msg, &glwe, bits);

        let mut new_ct = GlweCiphertext::new(&glwe);
        keyswitch_glwe_to_glwe(
            &mut new_ct,
            &original_ct,
            &ksk,
            &TEST_GLWE_DEF_1,
            &TEST_RADIX,
        );

        let new_decrypted = new_sk.decrypt_decode_glwe(&new_ct, &glwe, bits);

        assert_eq!(new_decrypted.coeffs(), msg.coeffs());
    }
}
