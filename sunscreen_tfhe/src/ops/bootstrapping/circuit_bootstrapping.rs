use std::array;

use num::Complex;
use sunscreen_math::Zero;

use crate::{
    dst::FromMutSlice, entities::{
        BootstrapKeyFftRef, CircuitBootstrappingKeyswitchKeysRef, GgswCiphertextRef, GlweCiphertext, GlweCiphertextRef, GlweSecretKeyRef, LweCiphertextListRef, LweCiphertextRef, Polynomial, UnivariateLookupTableRef
    }, high_level::encryption::{self, decrypt_glwe, decrypt_lwe}, ops::{
        bootstrapping::{generalized_programmable_bootstrap, programmable_bootstrap_univariate}, ciphertext::sample_extract, encryption::decrypt_glwe_ciphertext, homomorphisms::rotate, keyswitch::private_functional_keyswitch::private_functional_keyswitch
    }, scratch::allocate_scratch_ref, GlweDef, LweDef, PlaintextBits, PrivateFunctionalKeyswitchLweCount, RadixDecomposition, Torus, TorusOps
};

/// Bootstraps a LWE ciphertext to a GGSW ciphertext.
#[allow(clippy::too_many_arguments)]
/// Transform [`LweCiphertextRef`] `input` encrypted under parameters `lwe_0` into
/// the  [`GgswCiphertextRef`] `output` encrypted under parameters `glwe_1` with
/// radix decomposition `cbs_radix`. This resets the noise in `output` in the
/// process.
///
/// [`GgswCiphertext`](crate::entities::GgswCiphertext)s can be used as select
/// inputs for [`cmux`](crate::ops::fft_ops::cmux) operations.
///
/// # Remarks
/// The following diagram illustrates how circuit bootstrapping works
///
/// ![Circuit Bootstrapping](LINK TO GITHUB)
///
/// We perform `cbs_radix.count` programmable bootstrapping (PBS) operations to
/// decompose the original message m under radix `2^cbs_radix.radix_log`. These PBS
/// operations use a bootstrapping key encrypting the level 0 LWE secret key under
/// the level 2 GLWE secret key and internally perform their own radix decomposition
/// parameterized by `pbs_radix`. After performing bootstrapping, we now have
/// `cbs_radix.count` LWE ciphertexts encrypted under the level 2 GLWE secret key
/// (reinterpreted as an LWE key).
///
/// Next, we take each of these `cbs_radix.count` level 2 LWE ciphertexts and
/// perform `glwe_1.dim.size + 1` private functional keyswitching operations (`
/// (glwe_1.dim.size + 1) * cbs_radix.count` in total). For the first `glwe_1.dim.
/// size` rows of the [`GgswCiphertextRef`] output, this multiplies the radix
/// decomposed message by the negative corresponding secret key. For the last
/// row, we simply multiply our radix decomposed messages by 1.
///
/// Recall that [`private_functional_keyswitch`] (PFKS) transforms a list of LWE
/// ciphertexts into a [`GlweCiphertext`](crate::entities::GlweCiphertext). In
/// our case, this list contains a single
/// [`LweCiphertext`](crate::entities::LweCiphertext) for each PFKS operation.
/// Each row of the output [`GgswCiphertext`](crate::entities::GgswCiphertext)
/// corresponds to a different PFKS key, encapsulated in `cbsksk`.
///
/// These PFKS operations switch from a key under parameters `glwe_2` (interpreted
/// as LWE) to `glwe_1` with [`RadixDecomposition`] `pfks_radix`.
///
/// # Panics
/// * If `bsk` is not valid for bootrapping from parameters `lwe_0` to `glwe_2`
/// (reinterpreted as LWE) with radix decomposition `pbs_radix`.
/// * If `cbsksk` is not a valid keyswitch key set for switching from `glwe_2`
/// (reintrerpreted as LWE) to `glwe_1` with `glwe_1.dim.size` entries and radix
/// decomposition `pfks_radix`.
/// * If `output` is not the correct length for a GGSW ciphertext under `glwe_1`
/// parameters with `cbs_radix` decomposition.
/// * If `input` is not a valid LWE ciphertext under `lwe_0` parameters.
/// * If `lwe_0`, `glwe_1`, `glwe_2`, `cbs_radix`, `pfks_radix`, `pbs_radix` are
/// invalid.
///
/// # Example
/// ```
/// use sunscreen_tfhe::{
///   high_level,
///   high_level::{keygen, encryption, fft},
///   entities::GgswCiphertext,
///   ops::bootstrapping::circuit_bootstrap,
///   params::{
///     GLWE_5_256_80,
///     GLWE_1_1024_80,
///     LWE_512_80,
///     PlaintextBits,
///     RadixDecomposition,
///     RadixCount,
///     RadixLog
///   }
/// };
///
/// let pbs_radix = RadixDecomposition {
///   count: RadixCount(2),
///   radix_log: RadixLog(16),
/// };
/// let cbs_radix = RadixDecomposition {
///   count: RadixCount(2),
///   radix_log: RadixLog(5),
/// };
/// let pfks_radix = RadixDecomposition {
///   count: RadixCount(3),
///   radix_log: RadixLog(11),
/// };
///
/// let level_2_params = GLWE_5_256_80;
/// let level_1_params = GLWE_1_1024_80;
/// let level_0_params = LWE_512_80;
///
/// let sk_0 = keygen::generate_binary_lwe_sk(&level_0_params);
/// let sk_1 = keygen::generate_binary_glwe_sk(&level_1_params);
/// let sk_2 = keygen::generate_binary_glwe_sk(&level_2_params);
///
/// let bsk = keygen::generate_bootstrapping_key(
///   &sk_0,
///   &sk_2,
///   &level_0_params,
///   &level_2_params,
///   &pbs_radix,
/// );
/// let bsk =
/// high_level::fft::fft_bootstrap_key(&bsk, &level_0_params, &level_2_params, &pbs_radix);
///
/// let cbsksk = keygen::generate_cbs_ksk(
///   sk_2.to_lwe_secret_key(),
///   &sk_1,
///   &level_2_params.as_lwe_def(),
///   &level_1_params,
///   &pfks_radix,
/// );
///
/// let val = 1;
/// let ct = encryption::encrypt_lwe_secret(val, &sk_0, &level_0_params, PlaintextBits(1));
///
/// let mut ggsw = GgswCiphertext::new(&level_1_params, &cbs_radix);
///
/// // ggsw will contain `val`
/// circuit_bootstrap(
///     &mut ggsw,
///     &ct,
///     &bsk,
///     &cbsksk,
///     &level_0_params,
///     &level_1_params,
///     &level_2_params,
///     &pbs_radix,
///     &cbs_radix,
///     &pfks_radix,
/// );
/// ```
pub fn circuit_bootstrap<S: TorusOps>(
    output: &mut GgswCiphertextRef<S>,
    input: &LweCiphertextRef<S>,
    bsk: &BootstrapKeyFftRef<Complex<f64>>,
    cbsksk: &CircuitBootstrappingKeyswitchKeysRef<S>,
    lwe_0: &LweDef,
    glwe_1: &GlweDef,
    glwe_2: &GlweDef,
    pbs_radix: &RadixDecomposition,
    cbs_radix: &RadixDecomposition,
    pfks_radix: &RadixDecomposition,
) {
    glwe_1.assert_valid();
    glwe_2.assert_valid();
    lwe_0.assert_valid();
    pbs_radix.assert_valid::<S>();
    cbs_radix.assert_valid::<S>();
    pfks_radix.assert_valid::<S>();
    cbsksk.assert_valid(&glwe_2.as_lwe_def(), glwe_1, pfks_radix);
    bsk.assert_valid(lwe_0, glwe_2, pbs_radix);
    output.assert_valid(glwe_1, cbs_radix);
    input.assert_valid(lwe_0);

    // Step 1, for each l in cbs_radix.count, use bootstrapping to base decompose the
    // plaintext in input. We bootstrap from level 0 -> level 2.
    allocate_scratch_ref!(
        level_2_lwes,
        LweCiphertextListRef<S>,
        (glwe_2.as_lwe_def().dim, cbs_radix.count.0)
    );

    level_0_to_level_2(
        level_2_lwes,
        input,
        bsk,
        lwe_0,
        glwe_2,
        pbs_radix,
        cbs_radix,
    );

    level_2_to_level1(
        output,
        level_2_lwes,
        cbsksk,
        glwe_2,
        glwe_1,
        pfks_radix,
        cbs_radix,
    );
}

#[allow(dead_code)]
#[inline(always)]
fn level_0_to_level_2<S: TorusOps>(
    lwes_2: &mut LweCiphertextListRef<S>,
    input: &LweCiphertextRef<S>,
    bsk: &BootstrapKeyFftRef<Complex<f64>>,
    lwe_0: &LweDef,
    glwe_2: &GlweDef,
    pbs_radix: &RadixDecomposition,
    cbs_radix: &RadixDecomposition,
) {
    allocate_scratch_ref!(glwe_out, GlweCiphertextRef<S>, (glwe_2.dim));
    allocate_scratch_ref!(lut, UnivariateLookupTableRef<S>, (glwe_2.dim));
    allocate_scratch_ref!(lwe_rotated, LweCiphertextRef<S>, (lwe_0.dim));
    allocate_scratch_ref!(extracted, LweCiphertextRef<S>, (glwe_2.as_lwe_def().dim));
    assert!(cbs_radix.count.0 < 8);

    // Rotate our input by q/4, putting 0 centered on q/4 and 1 centered on
    // -q/4.
    rotate(
        lwe_rotated,
        input,
        Torus::encode(S::one(), PlaintextBits(2)),
        lwe_0,
    );

    let log_v = if cbs_radix.count.0.is_power_of_two() {
        cbs_radix.count.0.ilog2()
    } else {
        cbs_radix.count.0.ilog2() + 1
    };

    fill_multifunctional_cbs_decomposition_lut(lut, glwe_2, cbs_radix);

    generalized_programmable_bootstrap(glwe_out, lwe_rotated, lut, bsk, 0, log_v, lwe_0, glwe_2, pbs_radix);
    
    for (i, lwe_2) in lwes_2.ciphertexts_mut(&glwe_2.as_lwe_def()).enumerate() {
        let cur_level = i + 1;
        let plaintext_bits = PlaintextBits((cbs_radix.radix_log.0 * cur_level + 1) as u32);

        sample_extract(extracted, &glwe_out, i, glwe_2);

        // Now we rotate our message containing -1 or 1 by 1 (wrt plaintext_bits).
        // This will overflow -1 to 0 and cause 1 to wrap to 2.
        rotate(
            lwe_2,
            extracted,
            Torus::encode(S::one(), plaintext_bits),
            &glwe_2.as_lwe_def(),
        );
    }
}

fn fill_multifunctional_cbs_decomposition_lut<S: TorusOps>(
    lut: &mut UnivariateLookupTableRef<S>,
    glwe: &GlweDef,
    cbs_radix: &RadixDecomposition,
) {
    lut.clear();

    // Pick a largish number of levels nobody would ever exceed.
    let mut levels = [Torus::zero(); 16];

    assert!(cbs_radix.count.0 < levels.len());

    // Compute our base decomposition factors.
    // Exploiting the fact that our LUT is negacyclic, we can encode -1 in T_{b^l+1}
    // everywhere. Any lookup < q/2 will give -1 and any lookup > q/2 will
    // give 1. Since we've shifted our input lwe by q/4, a 1 plaintext
    // value will map to 1 and a 0 will map to -1.
    for (i, x) in levels.iter_mut().enumerate() {
        let i = i + 1;
        if i * cbs_radix.radix_log.0 + 1 < S::BITS as usize {
            let plaintext_bits = PlaintextBits((cbs_radix.radix_log.0 * i + 1) as u32);
        
            let minus_one = (S::one() << plaintext_bits.0 as usize) - S::one();
            *x = Torus::encode(minus_one, plaintext_bits);
        }
    }

    // Fill the table with alternating factors padded with zeros to a power of 2
    let log_v = if cbs_radix.count.0.is_power_of_two() {
        cbs_radix.count.0.ilog2()
    } else {
        cbs_radix.count.0.ilog2() + 1
    };

    let v = 0x1usize << log_v;

    for (i, x) in lut.glwe_mut().b_mut(glwe).coeffs_mut().iter_mut().enumerate() {
        let fn_id = i % v;

        *x = if fn_id < cbs_radix.count.0 {
            levels[fn_id]
        } else {
            Torus::zero()
        };
    }
}

/// Bootstraps a level 2 GLWE ciphertext to a level 1 GLWE ciphertext.
pub fn level_2_to_level1<S: TorusOps>(
    result: &mut GgswCiphertextRef<S>,
    lwes_2: &LweCiphertextListRef<S>,
    cbsksk: &CircuitBootstrappingKeyswitchKeysRef<S>,
    glwe_2: &GlweDef,
    glwe_1: &GlweDef,
    pfks_radix: &RadixDecomposition,
    cbs_radix: &RadixDecomposition,
) {
    for (glev, pfksk) in result.rows_mut(glwe_1, cbs_radix).zip(cbsksk.keys(
        &glwe_2.as_lwe_def(),
        glwe_1,
        pfks_radix,
    )) {
        for (decomp, glwe) in lwes_2
            .ciphertexts(&glwe_2.as_lwe_def())
            .zip(glev.glwe_ciphertexts_mut(glwe_1))
        {
            private_functional_keyswitch(
                glwe,
                &[decomp],
                pfksk,
                &glwe_2.as_lwe_def(),
                glwe_1,
                pfks_radix,
                &PrivateFunctionalKeyswitchLweCount(1),
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use rand::{thread_rng, RngCore};

    use crate::{
        entities::{GgswCiphertext, GlweSecretKey, GlweSecretKeyRef, LweCiphertextList, LweSecretKey, LweSecretKeyRef}, high_level::{self, encryption, fft, keygen, TEST_LWE_DEF_1}, scratch::allocate_scratch_ref, PlaintextBits, RadixCount, RadixDecomposition, RadixLog, GLWE_1_1024_80, GLWE_5_256_80, LWE_512_80, dst::FromMutSlice
    };

    use super::{circuit_bootstrap, level_0_to_level_2};

    #[test]
    fn can_level_0_to_level_2() {
        let pbs_radix = RadixDecomposition {
            count: RadixCount(2),
            radix_log: RadixLog(16),
        };
        let cbs_radix = RadixDecomposition {
            count: RadixCount(2),
            radix_log: RadixLog(5),
        };

        let glwe_params = GLWE_5_256_80;

        let mut level_2 =
            LweCiphertextList::<u64>::new(&glwe_params.as_lwe_def(), cbs_radix.count.0);

        let sk = keygen::generate_binary_lwe_sk(&TEST_LWE_DEF_1);
        let glwe_sk = keygen::generate_binary_glwe_sk(&glwe_params);

        let bsk = keygen::generate_bootstrapping_key(
            &sk,
            &glwe_sk,
            &TEST_LWE_DEF_1,
            &glwe_params,
            &pbs_radix,
        );
        let bsk = fft::fft_bootstrap_key(&bsk, &TEST_LWE_DEF_1, &glwe_params, &pbs_radix);

        let lwe = sk.encrypt(0, &TEST_LWE_DEF_1, PlaintextBits(1)).0;

        level_0_to_level_2(
            &mut level_2,
            &lwe,
            &bsk,
            &TEST_LWE_DEF_1,
            &glwe_params,
            &pbs_radix,
            &cbs_radix,
        );

        for (i, lwe_2) in level_2.ciphertexts(&glwe_params.as_lwe_def()).enumerate() {
            let cur_level = i + 1;

            let bits = PlaintextBits((cbs_radix.radix_log.0 * cur_level) as u32);

            let actual =
                glwe_sk
                    .to_lwe_secret_key()
                    .decrypt(lwe_2, &glwe_params.as_lwe_def(), bits);

            assert_eq!(actual, 0);
        }

        let lwe = sk.encrypt(1, &TEST_LWE_DEF_1, PlaintextBits(1)).0;

        level_0_to_level_2(
            &mut level_2,
            &lwe,
            &bsk,
            &TEST_LWE_DEF_1,
            &glwe_params,
            &pbs_radix,
            &cbs_radix,
        );

        for (i, lwe_2) in level_2.ciphertexts(&glwe_params.as_lwe_def()).enumerate() {
            let cur_level = i + 1;

            let bits = PlaintextBits((cbs_radix.radix_log.0 * cur_level) as u32);

            let actual =
                glwe_sk
                    .to_lwe_secret_key()
                    .decrypt(lwe_2, &glwe_params.as_lwe_def(), bits);

            assert_eq!(actual, 1);
        }
    }

    #[test]
    fn can_circuit_bootstrap() {
        let pbs_radix = RadixDecomposition {
            count: RadixCount(2),
            radix_log: RadixLog(16),
        };
        let cbs_radix = RadixDecomposition {
            count: RadixCount(2),
            radix_log: RadixLog(5),
        };
        let pfks_radix = RadixDecomposition {
            count: RadixCount(3),
            radix_log: RadixLog(11),
        };

        let level_2_params = GLWE_5_256_80;
        let level_1_params = GLWE_1_1024_80;
        let level_0_params = LWE_512_80;

        let sk_0 = keygen::generate_binary_lwe_sk(&level_0_params);
        let sk_1 = keygen::generate_binary_glwe_sk(&level_1_params);
        let sk_2 = keygen::generate_binary_glwe_sk(&level_2_params);

        let bsk = keygen::generate_bootstrapping_key(
            &sk_0,
            &sk_2,
            &level_0_params,
            &level_2_params,
            &pbs_radix,
        );
        let bsk =
            high_level::fft::fft_bootstrap_key(&bsk, &level_0_params, &level_2_params, &pbs_radix);

        let cbsksk = keygen::generate_cbs_ksk(
            sk_2.to_lwe_secret_key(),
            &sk_1,
            &level_2_params.as_lwe_def(),
            &level_1_params,
            &pfks_radix,
        );

        for _ in 0..1 {
            let val = thread_rng().next_u64() % 2;

            let ct = encryption::encrypt_lwe_secret(val, &sk_0, &level_0_params, PlaintextBits(1));

            let mut actual = GgswCiphertext::new(&level_1_params, &cbs_radix);

            circuit_bootstrap(
                &mut actual,
                &ct,
                &bsk,
                &cbsksk,
                &level_0_params,
                &level_1_params,
                &level_2_params,
                &pbs_radix,
                &cbs_radix,
                &pfks_radix,
            );

            let expected =
                encryption::encrypt_ggsw(val, &sk_1, &level_1_params, &cbs_radix, PlaintextBits(1));

            for (a, e) in actual
                .rows(&level_1_params, &cbs_radix)
                .zip(expected.rows(&level_1_params, &cbs_radix))
            {
                for (i, (a, e)) in a
                    .glwe_ciphertexts(&level_1_params)
                    .zip(e.glwe_ciphertexts(&level_1_params))
                    .enumerate()
                {
                    let plaintext_bits = (i + 1) * cbs_radix.radix_log.0;
                    let plaintext_bits = PlaintextBits(plaintext_bits as u32);

                    let a = encryption::decrypt_glwe(a, &sk_1, &level_1_params, plaintext_bits);
                    let e = encryption::decrypt_glwe(e, &sk_1, &level_1_params, plaintext_bits);

                    assert_eq!(a, e);
                }
            }
        }
    }
}
