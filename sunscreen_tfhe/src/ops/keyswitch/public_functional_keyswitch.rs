use num::Complex;

use crate::dst::FromMutSlice;
use crate::entities::{
    GlevCiphertextFftRef, GlweCiphertextRef, LweCiphertextRef, LweSecretKeyRef, PolynomialRef,
};
use crate::ops::ciphertext::glwe_negate_inplace;
use crate::ops::encryption::encrypt_glwe_ciphertext_secret;
use crate::ops::fft_ops::decomposed_polynomial_glev_mad;
use crate::polynomial::polynomial_add_assign;
use crate::radix::PolynomialRadixIterator;
use crate::scratch::allocate_scratch;
use crate::{
    entities::{GlweCiphertextFftRef, GlweSecretKeyRef, PublicFunctionalKeyswitchKeyRef},
    radix::scale_by_decomposition_factor,
    scratch::allocate_scratch_ref,
    GlweDef, LweDef, RadixDecomposition, TorusOps,
};
use crate::{OverlaySize, Torus};

/// Generate a public functional keyswitch key, which is used to transform a
/// list of LWE ciphertexts into a GLWE ciphertext while applying a provided
/// function that converts the scalars in the LWE ciphertexts to the polynomial
/// message space in the GLWE ciphertext.
///
/// See
/// [`public_functional_keyswitch`](crate::ops::keyswitch::public_functional_keyswitch)
/// for more details.
pub fn generate_public_functional_keyswitch_key<S: TorusOps>(
    output: &mut PublicFunctionalKeyswitchKeyRef<S>,
    from_sk: &LweSecretKeyRef<S>,
    to_sk: &GlweSecretKeyRef<S>,
    from_lwe: &LweDef,
    to_glwe: &GlweDef,
    radix: &RadixDecomposition,
) {
    from_sk.assert_is_valid(from_lwe.dim);
    to_sk.assert_is_valid(to_glwe.dim);
    output.assert_is_valid((from_lwe.dim, to_glwe.dim, radix.count));

    allocate_scratch_ref!(pt, PolynomialRef<Torus<S>>, (to_glwe.dim.polynomial_degree));
    pt.clear();

    for (s_i, glev) in from_sk.s().iter().zip(output.glevs_mut(to_glwe, radix)) {
        for (j, glwe_ct) in (0..radix.count.0).zip(glev.glwe_ciphertexts_mut(to_glwe)) {
            let x = scale_by_decomposition_factor(*s_i, j, radix);

            pt.coeffs_mut()[0] = Torus::from(x);

            encrypt_glwe_ciphertext_secret(glwe_ct, pt, to_sk, to_glwe);
        }
    }
}

/// Perform a public functional keyswitch, where a list of LWE ciphertexts are
/// transformed into a GLWE ciphertext while applying a provided function.
/// Conceptually, this map transforms a list of torus plaintexts into a
/// polynomial plaintext.
///
/// This operation is called "public" because the function F is public; a
/// variant of this operation called
/// [`private_functional_keyswitch`](crate::ops::keyswitch::private_functional_keyswitch)
/// is also available, where the function F is secret encoded in the keyswitch
/// key.
///
/// # Remarks
/// `map` must be an R-Lipschitzian morphism `T_q^p -> T_q[X]` where `p = lwe_count`.
///
/// The first parameter in `map` is the output
/// [`Polynomial`](crate::entities::Polynomial) of the morphism. This parameter
/// is initialized to 0.
///
/// The second argument is a [`&[Torus]`](crate::math::Torus) of length `lwe_count`.
pub fn public_functional_keyswitch<S, F>(
    output: &mut GlweCiphertextRef<S>,
    inputs: &[&LweCiphertextRef<S>],
    pufksk: &PublicFunctionalKeyswitchKeyRef<S>,
    f: F,
    from_lwe: &LweDef,
    to_glwe: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
    F: Fn(&mut PolynomialRef<Torus<S>>, &[Torus<S>]),
{
    pufksk.assert_is_valid((from_lwe.dim, to_glwe.dim, radix.count));
    output.assert_is_valid(to_glwe.dim);

    for i in inputs {
        i.assert_is_valid(from_lwe.dim);
    }

    assert!(inputs.len() <= to_glwe.dim.polynomial_degree.0);

    allocate_scratch_ref!(
        poly,
        PolynomialRef<Torus<S>>,
        (to_glwe.dim.polynomial_degree)
    );
    output.clear();
    allocate_scratch_ref!(
        decomp_scratch,
        PolynomialRef<S>,
        (to_glwe.dim.polynomial_degree)
    );
    let mut a_buf = allocate_scratch::<Torus<S>>(inputs.len());
    let lwe_vals = a_buf.as_mut_slice();
    allocate_scratch_ref!(
        glev_fft,
        GlevCiphertextFftRef<Complex<f64>>,
        (to_glwe.dim, radix.count)
    );
    allocate_scratch_ref!(
        output_fft,
        GlweCiphertextFftRef<Complex<f64>>,
        (to_glwe.dim)
    );

    output_fft.clear();

    // Compute all the a terms
    for (i, row) in pufksk.glevs(to_glwe, radix).enumerate() {
        for (j, a_i) in inputs.iter().map(|x| x.a(from_lwe)[i]).enumerate() {
            lwe_vals[j] = a_i;
        }

        row.fft(glev_fft, to_glwe);

        f(poly, lwe_vals);

        let decomp = PolynomialRadixIterator::new(poly, decomp_scratch, radix);

        decomposed_polynomial_glev_mad(output_fft, decomp, glev_fft, to_glwe);
    }

    // Compute the b term
    for (j, b) in inputs.iter().map(|x| x.b(from_lwe)).enumerate() {
        lwe_vals[j] = *b;
    }

    f(poly, lwe_vals);

    output_fft.ifft(output, to_glwe);

    // Compute (0, b) - output
    glwe_negate_inplace(output, to_glwe);
    polynomial_add_assign(output.b_mut(to_glwe), poly);
}

#[cfg(test)]
mod tests {

    use rand::{thread_rng, RngCore};

    use crate::{
        entities::{GlweCiphertext, PublicFunctionalKeyswitchKey},
        high_level::{encryption, keygen, TEST_GLWE_DEF_1, TEST_LWE_DEF_1, TEST_RADIX},
        PlaintextBits,
    };

    use super::*;

    #[test]
    fn can_generate_public_functional_keyswitch_key() {
        let lwe_params = TEST_LWE_DEF_1;
        let glwe_params = TEST_GLWE_DEF_1;
        let radix = TEST_RADIX;

        let mut pufksk = PublicFunctionalKeyswitchKey::new(&lwe_params, &glwe_params, &TEST_RADIX);

        let lwe_sk = keygen::generate_binary_lwe_sk(&lwe_params);
        let glwe_sk = keygen::generate_binary_glwe_sk(&glwe_params);

        generate_public_functional_keyswitch_key(
            &mut pufksk,
            &lwe_sk,
            &glwe_sk,
            &lwe_params,
            &glwe_params,
            &radix,
        );

        for (s_i, glev) in lwe_sk.s().iter().zip(pufksk.glevs(&glwe_params, &radix)) {
            for (j, glwe_ct) in (0..radix.count.0).zip(glev.glwe_ciphertexts(&glwe_params)) {
                let plaintext_bits = ((j + 1) * radix.radix_log.0) as u32;
                let plaintext_bits = PlaintextBits(plaintext_bits);

                let pt = encryption::decrypt_glwe(glwe_ct, &glwe_sk, &glwe_params, plaintext_bits);

                assert_eq!(pt.coeffs()[0], *s_i);

                for x in pt.coeffs().iter().skip(1) {
                    assert_eq!(*x, 0);
                }
            }
        }
    }

    #[test]
    fn can_public_functional_keyswitch() {
        let lwe_params = TEST_LWE_DEF_1;
        let glwe_params = TEST_GLWE_DEF_1;
        let radix = TEST_RADIX;

        let mut pufksk = PublicFunctionalKeyswitchKey::new(&lwe_params, &glwe_params, &TEST_RADIX);

        let lwe_sk = keygen::generate_binary_lwe_sk(&lwe_params);
        let glwe_sk = keygen::generate_binary_glwe_sk(&glwe_params);

        let plaintext_bits = PlaintextBits(4);

        generate_public_functional_keyswitch_key(
            &mut pufksk,
            &lwe_sk,
            &glwe_sk,
            &lwe_params,
            &glwe_params,
            &radix,
        );

        for _ in 0..10 {
            let lwe_count = thread_rng().next_u64() as usize % glwe_params.dim.polynomial_degree.0;

            let pts = (0..lwe_count)
                .map(|_| thread_rng().next_u64() % (0x1 << plaintext_bits.0))
                .collect::<Vec<_>>();

            let lwes = pts
                .iter()
                .map(|x| encryption::encrypt_lwe_secret(*x, &lwe_sk, &lwe_params, plaintext_bits))
                .collect::<Vec<_>>();

            let mut lwe_refs: Vec<&LweCiphertextRef<u64>> = vec![];

            for x in lwes.iter() {
                lwe_refs.push(x);
            }

            let mut output = GlweCiphertext::new(&glwe_params);

            fn map<S: TorusOps>(poly: &mut PolynomialRef<Torus<S>>, tori: &[Torus<S>]) {
                for (c, t) in poly.coeffs_mut().iter_mut().zip(tori.iter()) {
                    *c = *t;
                }
            }

            public_functional_keyswitch(
                &mut output,
                &lwe_refs,
                &pufksk,
                map,
                &lwe_params,
                &glwe_params,
                &radix,
            );

            let actual = encryption::decrypt_glwe(&output, &glwe_sk, &glwe_params, plaintext_bits);

            for (a, e) in actual.coeffs().iter().zip(pts.iter()) {
                assert_eq!(a, e);
            }
        }
    }
}
