use crate::{
    entities::{LweKeyswitchKeyRef, LweSecretKeyRef},
    ops::encryption::encrypt_lwe_ciphertext,
    LweDef, OverlaySize, RadixDecomposition, Torus, TorusOps,
};

/// Generates a keyswitch key from an original LWE key to a new LWE key. The
/// resulting keyswitch key is encrypted under the new key.
///
/// Arguments:
///
/// * keyswitch_key: the resulting keyswitch key
/// * original_lwe_secret_key: the original LWE secret key
/// * new_lwe_secret_key: the new LWE secret key
/// * new_params: the parameters of the new LWE secret key
pub fn generate_keyswitch_key_lwe<S>(
    keyswitch_key: &mut LweKeyswitchKeyRef<S>,
    original_lwe_secret_key: &LweSecretKeyRef<S>,
    new_lwe_secret_key: &LweSecretKeyRef<S>,
    old_params: &LweDef,
    new_params: &LweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    old_params.assert_valid();
    new_params.assert_valid();
    radix.assert_valid::<S>();
    new_lwe_secret_key.assert_is_valid(new_params.dim);
    original_lwe_secret_key.assert_is_valid(old_params.dim);
    new_lwe_secret_key.assert_is_valid(new_params.dim);
    keyswitch_key.assert_is_valid((old_params.dim, new_params.dim, radix.count));

    let decomposition_radix_log = radix.radix_log.0;

    for (i, row) in keyswitch_key.rows_mut(new_params, radix).enumerate() {
        let s_i = original_lwe_secret_key.s()[i];

        for (j, col) in row.lwe_ciphertexts_mut(new_params).enumerate() {
            // The factor is q / B^{i+1}. Since B is a power of 2, this is equivalent to
            // multiplying by 2^{log2(q) - log2(B) * (i + 1)}
            let decomp_factor =
                S::from_u64(0x1 << (S::BITS as usize - decomposition_radix_log * (j + 1)));

            let msg = decomp_factor * s_i;

            encrypt_lwe_ciphertext(col, new_lwe_secret_key, Torus::from(msg), new_params);
        }
    }
}
