use rayon::iter::{IndexedParallelIterator, ParallelIterator};
use sunscreen_math::Zero;

use crate::{
    dst::{AsSlice, FromMutSlice},
    entities::{
        CircuitBootstrappingKeyswitchKeysRef, GlweCiphertextRef, GlweSecretKeyRef,
        LweCiphertextRef, LweSecretKeyRef, PolynomialRef, PrivateFunctionalKeyswitchKeyRef,
    },
    ops::{
        ciphertext::{decomposed_scalar_glev_mad, glwe_negate_inplace},
        encryption::encrypt_glwe_ciphertext_secret,
    },
    radix::{scale_by_decomposition_factor, ScalarRadixIterator},
    scratch::allocate_scratch_ref,
    GlweDef, LweDef, OverlaySize, PrivateFunctionalKeyswitchLweCount, RadixDecomposition, Torus,
    TorusOps,
};

/// Initialize `output`, a
/// [`PrivateFunctionalKeyswitchKey`](crate::entities::PrivateFunctionalKeyswitchKey),
/// under the given scheme parameters for the given secret mapping `map`.
/// Conceptually, this map transforms a list of torus plaintexts into a
/// polynomial plaintext.
///
/// # Remarks
/// `map` must be an R-Lipschitzian morphism `T_q^p -> T_q[X]` where `p = lwe_count`.
///
/// The first parameter in `map` is the output
/// [`Polynomial`](crate::entities::Polynomial) of the morphism. This parameter
/// is initialized to 0.
///
/// The second argument is a [`&[Torus]`](crate::math::Torus) of length `lwe_count`.
///
/// # Security
/// To prevent side channels, `map` must run in constant time.
///
/// # Panics
/// * If `output` is not valid for the given `from_lwe`, `to_glwe`, `radix`, `lwe_count`.
/// * If any of `from_lwe`, `to_glwe`, `radix`, `lwe_count` are invalid.
#[allow(clippy::too_many_arguments)]
pub fn generate_private_functional_keyswitch_key<S, F>(
    output: &mut PrivateFunctionalKeyswitchKeyRef<S>,
    from_key: &LweSecretKeyRef<S>,
    to_key: &GlweSecretKeyRef<S>,
    map: F,
    from_lwe: &LweDef,
    to_glwe: &GlweDef,
    radix: &RadixDecomposition,
    lwe_count: &PrivateFunctionalKeyswitchLweCount,
) where
    S: TorusOps,
    F: Fn(&mut PolynomialRef<Torus<S>>, &[Torus<S>]),
{
    output.assert_is_valid((from_lwe.dim, to_glwe.dim, radix.count, *lwe_count));
    radix.assert_valid::<S>();
    from_key.assert_is_valid(from_lwe.dim);
    to_key.assert_is_valid(to_glwe.dim);
    to_glwe.assert_valid();
    from_lwe.assert_valid();
    lwe_count.assert_valid();

    allocate_scratch_ref!(
        pt_poly,
        PolynomialRef<Torus<S>>,
        (to_glwe.dim.polynomial_degree)
    );
    allocate_scratch_ref!(pt_touri, [Torus<S>], lwe_count.0);

    let mut glevs = output.glevs_mut(to_glwe, radix);
    let minus_one = <S as Zero>::zero().wrapping_sub(&<S as num::One>::one());

    for z in 0..lwe_count.0 {
        for s_i in from_key.s().iter().chain([minus_one].iter()) {
            let glev = glevs.next().unwrap();

            for (j, glwe) in glev.glwe_ciphertexts_mut(to_glwe).enumerate() {
                let scaled_s_i = scale_by_decomposition_factor(*s_i, j, radix);

                pt_poly.clear();
                pt_touri.iter_mut().for_each(|x| *x = Torus::zero());

                pt_touri[z] = Torus::from(scaled_s_i);

                map(pt_poly, pt_touri);

                encrypt_glwe_ciphertext_secret(glwe, pt_poly, to_key, to_glwe);
            }
        }
    }
}

/// Perform a private functional keyswitch. See
/// [`module`](crate::ops::keyswitch::private_functional_keyswitch) documentation for more
/// details.
pub fn private_functional_keyswitch<S: TorusOps>(
    output: &mut GlweCiphertextRef<S>,
    inputs: &[&LweCiphertextRef<S>],
    pfksk: &PrivateFunctionalKeyswitchKeyRef<S>,
    from_lwe: &LweDef,
    to_glwe: &GlweDef,
    radix: &RadixDecomposition,
    lwe_count: &PrivateFunctionalKeyswitchLweCount,
) {
    output.assert_is_valid(to_glwe.dim);
    pfksk.assert_is_valid((from_lwe.dim, to_glwe.dim, radix.count, *lwe_count));
    from_lwe.assert_valid();
    to_glwe.assert_valid();
    radix.assert_valid::<S>();
    lwe_count.assert_valid();

    assert_eq!(lwe_count.0, inputs.len());

    let mut ksk_glevs = pfksk.glevs(to_glwe, radix);

    for input in inputs.iter() {
        for i in 0..from_lwe.dim.0 + 1 {
            // Treating the z'th ciphertext as slice of length n + 1 allows us to iterate
            // over a || b.
            let ab = input.as_slice();

            let glev = ksk_glevs.next().unwrap();
            let decomp = ScalarRadixIterator::new(ab[i], radix);

            decomposed_scalar_glev_mad(output, decomp, glev, to_glwe);
        }
    }

    // Return minus output.
    glwe_negate_inplace(output, to_glwe);
}

/// Generate the keys for a private functional keyswitch.
pub fn generate_circuit_bootstrapping_pfks_keys<S: TorusOps>(
    output: &mut CircuitBootstrappingKeyswitchKeysRef<S>,
    from_key: &LweSecretKeyRef<S>,
    to_key: &GlweSecretKeyRef<S>,
    from_lwe: &LweDef,
    to_glwe: &GlweDef,
    radix: &RadixDecomposition,
) {
    output.assert_is_valid((from_lwe.dim, to_glwe.dim, radix.count));
    from_key.assert_is_valid(from_lwe.dim);
    to_glwe.assert_valid();
    to_key.assert_is_valid(to_glwe.dim);
    radix.assert_valid::<S>();
    from_lwe.assert_valid();

    // Fill in k pfks keys that multiply each of the "a" GLEVs by the corresponding
    // polynomial in the GLWE secret key.
    output
        .keys_par_mut(from_lwe, to_glwe, radix)
        .zip(to_key.s_par(to_glwe))
        .take(to_glwe.dim.size.0)
        .for_each(|(pfksk, s)| {
            let map = |poly: &mut PolynomialRef<Torus<S>>, x: &[Torus<S>]| {
                for (c, a) in poly.coeffs_mut().iter_mut().zip(s.coeffs().iter()) {
                    *c = -x[0] * a;
                }
            };

            generate_private_functional_keyswitch_key(
                pfksk,
                from_key,
                to_key,
                map,
                from_lwe,
                to_glwe,
                radix,
                &PrivateFunctionalKeyswitchLweCount(1),
            );
        });

    // Now fill in the "b" GLEV.
    // TODO: We could compute this row with public key switching. Is it worth it?
    let b = output
        .keys_mut(from_lwe, to_glwe, radix)
        .nth(to_glwe.dim.size.0)
        .unwrap();

    let map = |poly: &mut PolynomialRef<Torus<S>>, x: &[Torus<S>]| {
        poly.clear();
        poly.coeffs_mut()[0] = x[0];
    };

    generate_private_functional_keyswitch_key(
        b,
        from_key,
        to_key,
        map,
        from_lwe,
        to_glwe,
        radix,
        &PrivateFunctionalKeyswitchLweCount(1),
    )
}

#[cfg(test)]
mod tests {
    use rand::{thread_rng, RngCore};

    use crate::{
        entities::{GlweCiphertext, PrivateFunctionalKeyswitchKey},
        high_level::{keygen, TEST_GLWE_DEF_1, TEST_LWE_DEF_1, TEST_RADIX},
        PlaintextBits,
    };

    use super::*;

    #[test]
    fn can_create_private_functional_keyswitch_key() {
        for _ in 0..5 {
            let lwe_count =
                PrivateFunctionalKeyswitchLweCount((thread_rng().next_u64() as usize % 8) + 1);

            let lwe_key = keygen::generate_binary_lwe_sk(&TEST_LWE_DEF_1);
            let glwe_key = keygen::generate_binary_glwe_sk(&TEST_GLWE_DEF_1);

            let mut pfks_key = PrivateFunctionalKeyswitchKey::<u64>::new(
                &TEST_LWE_DEF_1,
                &TEST_GLWE_DEF_1,
                &TEST_RADIX,
                &lwe_count,
            );

            fn map<S: TorusOps>(poly: &mut PolynomialRef<Torus<S>>, inputs: &[Torus<S>]) {
                for (i, input) in inputs.iter().enumerate() {
                    poly.coeffs_mut()[i] = *input;
                }
            }

            generate_private_functional_keyswitch_key(
                &mut pfks_key,
                &lwe_key,
                &glwe_key,
                map,
                &TEST_LWE_DEF_1,
                &TEST_GLWE_DEF_1,
                &TEST_RADIX,
                &lwe_count,
            );

            let mut glevs = pfks_key.glevs(&TEST_GLWE_DEF_1, &TEST_RADIX);

            let minus_one = u64::MAX;

            for z in 0..lwe_count.0 {
                for s_i in lwe_key.s().iter().chain([minus_one].iter()) {
                    let glev = glevs.next().unwrap();

                    for (j, glwe) in glev.glwe_ciphertexts(&TEST_GLWE_DEF_1).enumerate() {
                        let plaintext_bits = (j + 1) * TEST_RADIX.radix_log.0;
                        let plaintext_bits = PlaintextBits(plaintext_bits as u32);

                        let pt =
                            glwe_key.decrypt_decode_glwe(glwe, &TEST_GLWE_DEF_1, plaintext_bits);

                        for i in 0..pt.coeffs().len() {
                            if *s_i == minus_one && i == z {
                                let expected = (0x1u64 << ((j + 1) * TEST_RADIX.radix_log.0)) - 1;
                                let actual = pt.coeffs()[i];

                                assert_eq!(actual, expected);
                            } else if i == z {
                                assert_eq!(pt.coeffs()[i], *s_i);
                            } else {
                                assert_eq!(pt.coeffs()[i], 0);
                            }
                        }
                    }
                }
            }
        }
    }

    #[test]
    fn can_private_functional_keyswitch() {
        for _ in 0..5 {
            let lwe_count =
                PrivateFunctionalKeyswitchLweCount((thread_rng().next_u64() as usize % 8) + 1);

            let lwe_key = keygen::generate_binary_lwe_sk(&TEST_LWE_DEF_1);
            let glwe_key = keygen::generate_binary_glwe_sk(&TEST_GLWE_DEF_1);

            let mut pfks_key = PrivateFunctionalKeyswitchKey::<u64>::new(
                &TEST_LWE_DEF_1,
                &TEST_GLWE_DEF_1,
                &TEST_RADIX,
                &lwe_count,
            );

            fn map<S: TorusOps>(poly: &mut PolynomialRef<Torus<S>>, inputs: &[Torus<S>]) {
                for (i, input) in inputs.iter().enumerate() {
                    poly.coeffs_mut()[i] = *input;
                }
            }

            generate_private_functional_keyswitch_key(
                &mut pfks_key,
                &lwe_key,
                &glwe_key,
                map,
                &TEST_LWE_DEF_1,
                &TEST_GLWE_DEF_1,
                &TEST_RADIX,
                &lwe_count,
            );

            let plaintext_bits = PlaintextBits(4);

            let pts = (0..lwe_count.0)
                .map(|_x| thread_rng().next_u64() % (0x1u64 << plaintext_bits.0))
                .collect::<Vec<u64>>();
            let lwe_cts = pts
                .iter()
                .map(|x| lwe_key.encrypt(*x, &TEST_LWE_DEF_1, plaintext_bits))
                .collect::<Vec<_>>();
            let mut lwe_ct_refs: Vec<&LweCiphertextRef<_>> = vec![];

            for ct in lwe_cts.iter() {
                lwe_ct_refs.push(&ct.0);
            }

            let mut result = GlweCiphertext::new(&TEST_GLWE_DEF_1);

            private_functional_keyswitch(
                &mut result,
                &lwe_ct_refs,
                &pfks_key,
                &TEST_LWE_DEF_1,
                &TEST_GLWE_DEF_1,
                &TEST_RADIX,
                &lwe_count,
            );

            let actual = glwe_key.decrypt_decode_glwe(&result, &TEST_GLWE_DEF_1, plaintext_bits);

            for (i, (c, pt)) in actual
                .coeffs()
                .iter()
                .zip(pts.iter().cycle().take(actual.coeffs().len()))
                .enumerate()
            {
                if i < lwe_count.0 {
                    assert_eq!(*c, *pt);
                } else {
                    assert_eq!(*c, 0);
                }
            }
        }
    }
}
