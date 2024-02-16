use crate::{
    dst::{FromMutSlice, FromSlice},
    entities::{LweCiphertext, LweCiphertextRef, LweKeyswitchKeyRef, PolynomialRef},
    ops::{
        ciphertext::{decomposed_scalar_lev_mad, sub_lwe_ciphertexts},
        encryption::trivially_encrypt_lwe_ciphertext,
    },
    radix::PolynomialRadixIterator,
    scratch::allocate_scratch_ref,
    LweDef, PolynomialDegree, RadixDecomposition, TorusOps,
};

/// Switches a ciphertext under the original key to a ciphertext under the new
/// key using a keyswitch key.
///
/// Arguments:
///
/// * output: the output ciphertext
/// * ciphertext_under_original_key: the input ciphertext
/// * keyswitch_key: the keyswitch key
/// * old_params: the parameters of the original ciphertext
/// * new_params: the parameters of the output ciphertext
pub fn keyswitch_lwe_to_lwe<S>(
    output: &mut LweCiphertextRef<S>,
    ciphertext_under_original_key: &LweCiphertextRef<S>,
    keyswitch_key: &LweKeyswitchKeyRef<S>,
    old_params: &LweDef,
    new_params: &LweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    keyswitch_key.assert_valid(old_params, new_params, radix);

    let (ciphertext_a, ciphertext_b) = ciphertext_under_original_key.a_b(old_params);

    let keyswitch_levs = keyswitch_key.rows(new_params, radix);

    let mut a_i_decomp_sum = LweCiphertext::new(new_params);

    allocate_scratch_ref!(scratch, PolynomialRef<S>, (PolynomialDegree(1)));

    // sum_i(<decomp(ciphertext_a_i), lev_i>)
    for (a_i, lev_i) in ciphertext_a.iter().zip(keyswitch_levs) {
        let decomp =
            PolynomialRadixIterator::new(PolynomialRef::from_slice(&[*a_i]), scratch, radix);

        decomposed_scalar_lev_mad(&mut a_i_decomp_sum, decomp, lev_i, new_params);
    }

    // trivial_encrypt(ciphertext_b)
    let mut trivial_b = LweCiphertext::new(new_params);
    trivially_encrypt_lwe_ciphertext(&mut trivial_b, ciphertext_b, new_params);

    // output = trivial_encrypt(ciphertext_b) - sum_i(<decomp(ciphertext_a_i), glev_i>)
    sub_lwe_ciphertexts(output, &trivial_b, &a_i_decomp_sum, new_params);
}

#[cfg(test)]
mod tests {

    use rand::{thread_rng, RngCore};

    use crate::{high_level::*, PlaintextBits};

    #[test]
    fn keyswitch_lwe() {
        let bits = PlaintextBits(4);
        let from_lwe = TEST_LWE_DEF_1;
        let to_lwe = TEST_LWE_DEF_2;
        let radix = TEST_RADIX;

        for _ in 0..50 {
            let original_sk = keygen::generate_binary_lwe_sk(&from_lwe);
            let new_sk = keygen::generate_binary_lwe_sk(&to_lwe);

            let ksk = keygen::generate_ksk(&original_sk, &new_sk, &from_lwe, &to_lwe, &radix);

            let msg = thread_rng().next_u64() % (1 << bits.0);

            let original_ct = original_sk.encrypt(msg, &from_lwe, bits).0;

            let new_ct =
                evaluation::keyswitch_lwe_to_lwe(&original_ct, &ksk, &from_lwe, &to_lwe, &radix);

            let new_decrypted = new_sk.decrypt(&new_ct, &to_lwe, bits);

            assert_eq!(new_decrypted, msg);
        }
    }
}
