use num::Complex;
use rayon::iter::{IndexedParallelIterator, IntoParallelRefIterator, ParallelIterator};

use crate::{
    dst::FromMutSlice,
    entities::{
        BivariateLookupTableRef, BootstrapKeyFftRef, BootstrapKeyRef, GlweCiphertextRef,
        GlweSecretKeyRef, LweCiphertextRef, LweSecretKeyRef, Polynomial, PolynomialRef,
        UnivariateLookupTableRef,
    },
    ops::{
        bootstrapping::rotate_glwe_positive_monomial_negacyclic,
        ciphertext::{
            add_lwe_inplace, lwe_ciphertext_modulus_switch, sample_extract,
            scalar_mul_ciphertext_mad,
        },
        encryption::encrypt_ggsw_ciphertext_scalar,
        fft_ops::cmux,
    },
    scratch::allocate_scratch_ref,
    CarryBits, GlweDef, LweDef, PlaintextBits, RadixDecomposition, Torus, TorusOps,
};

use super::rotate_glwe_negative_monomial_negacyclic;

/// Generate a bootstrap key from a LWE secret key to a GLWE secret key.
///
/// Mathematically, this key is a list of GGSW ciphertexts, one for each bit of
/// the secret key being encrypted.
///
/// See
/// [`programmable_bootstrap`](crate::ops::bootstrapping::programmable_bootstrap)
/// for an example of how to use this key.
pub fn generate_bootstrap_key<S>(
    bootstrap_key: &mut BootstrapKeyRef<S>,
    sk_to_encrypt: &LweSecretKeyRef<S>,
    sk: &GlweSecretKeyRef<S>,
    lwe: &LweDef,
    glwe: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    lwe.assert_valid();
    glwe.assert_valid();
    radix.assert_valid::<S>();
    bootstrap_key.assert_valid(lwe, glwe, radix);
    sk.assert_valid(glwe);
    sk_to_encrypt.assert_valid(lwe);

    sk_to_encrypt
        .s()
        .par_iter()
        .zip(bootstrap_key.rows_par_mut(glwe, radix))
        .for_each(|(s_i, ggsw)| {
            encrypt_ggsw_ciphertext_scalar(ggsw, *s_i, sk, glwe, radix, PlaintextBits(1));
        });
}

/// Generate a negacyclic LUT for bootstrapping. Another name for this structure
/// is a test polynomial.
///
/// The map function passed in must have the following negacyclic property,
/// where N is the size of the polynomial:
///
/// ```text
/// map(N + i) = -map(i)
/// ```
#[allow(dead_code)]
fn generate_negacyclic_lut<S, F>(
    output: &mut Polynomial<Torus<S>>,
    map: F,
    params: &GlweDef,
    plaintext_bits: PlaintextBits,
) where
    S: TorusOps,
    F: Fn(u64) -> u64,
{
    let p = (1 << plaintext_bits.0) as u64;
    let n = params.dim.polynomial_degree.0 as u64;

    let stride = 2 * n / p;

    let delta = S::BITS - plaintext_bits.0;

    let c = output.coeffs_mut();

    // Written out this way because when we get to programmable boot strapping,
    // this will involve replacing p_i with f(p_i)
    for (j, p_i_unmapped) in (0..=p / 2).enumerate() {
        let j = j as u64;

        let p_i = map(p_i_unmapped);
        assert!(p_i < p, "The map function must produce a value less than p. Map produced the relation ({} -> {})", p_i_unmapped, p_i);

        let p_i = p_i << delta;

        if j == 0 {
            for k in 0..(stride / 2) {
                c[k as usize] = Torus::from(S::from_u64(p_i));
            }
        } else if j == p / 2 {
            for k in (n - (stride / 2))..n {
                c[k as usize] = Torus::from(S::from_u64(p_i));
            }
        } else {
            for k in (stride / 2 + (j - 1) * stride)..(stride / 2 + j * stride) {
                c[k as usize] = Torus::from(S::from_u64(p_i));
            }
        }
    }
}

/// Generates a lookup table (LUT) to be used with bootstrapping. This LUT is
/// not negacyclic, and hence must be used with LWE inputs that have at least
/// one padding bit.
///
/// The input `map` is used for generating programmable bootstrapping LUTs. This
/// function takes an element in the plaintext space and must produce another
/// element in the plaintext space.
///
/// # Remarks
/// This function supports multiple functions, which appear as adjacent
/// entries in the ciphertext (padded with 0 up to a power of 2). This
/// pattern repeats until `n/p` terms have been filled.
pub(crate) fn generate_lut<S, F>(
    output: &mut PolynomialRef<Torus<S>>,
    maps: &[F],
    params: &GlweDef,
    plaintext_bits: PlaintextBits,
) where
    S: TorusOps,
    F: Fn(u64) -> u64,
{
    let p = (1 << plaintext_bits.0) as usize;
    let n = params.dim.polynomial_degree.0;

    let v = maps.len();

    let log_v = if v.is_power_of_two() {
        v.ilog2()
    } else {
        v.ilog2() + 1
    };

    let ciel_v = 0x1usize << log_v;

    assert!(n >= p);

    let stride = n / p;

    let delta = S::BITS - plaintext_bits.0;

    let c = output.coeffs_mut();

    for (j, p_i_unmapped) in (0..=p - 1).enumerate() {
        // Insert a stride amount into the LUT
        c[j * stride..(j + 1) * stride].iter_mut().enumerate().for_each(|(k, c)| {
            let fn_id = k % ciel_v;

            let p_i = if fn_id < v {
                maps[fn_id](p_i_unmapped as u64)
            } else {
                0u64
            };

            assert!(p_i < (p as u64), "The map function must produce a value less than p. Map produced the relation ({} -> {})", p_i_unmapped, p_i);

            let p_i = p_i << delta;

            *c = Torus::from(S::from_u64(p_i));
        });
    }

    // Negate the first half of p_0 in the LUT in preparation for it to be
    // rotated.
    c[0..stride / 2].iter_mut().for_each(|c| {
        *c = num::traits::WrappingNeg::wrapping_neg(c);
    });

    c.rotate_left(stride / 2);
}

/// Programmable bootstrapping with a univariate function.
///
/// The LUT this is a table that maps two inputs into a single output.  For
/// example, say we want to encode the negation function `f(x) = (x + 1) % 2`
/// into a lookup table. We would create a
/// [`UnivariateLookupTable`](crate::entities::UnivariateLookupTable) that
/// implements this function and then execute it on the input ciphertexts.
///
/// Important note: This function does not perform key switching. The output
/// ciphertext will be encrypted under the LWE key extracted from the GLWE
/// secret key used for the bootstrapping key. To perform a keyswitch, use
/// [`keyswitch_lwe_to_lwe`](crate::ops::keyswitch::lwe_keyswitch::keyswitch_lwe_to_lwe)
/// after the bootstrapping operation.
///
/// # Example
///
/// ```
/// use sunscreen_tfhe::{
///   high_level::{keygen, encryption, fft},
///   entities::{UnivariateLookupTable, LweCiphertext},
///   ops::bootstrapping::programmable_bootstrap_univariate,
///   params::{
///     GLWE_1_1024_80,
///     LWE_512_80,
///     CarryBits,
///     PlaintextBits,
///     RadixDecomposition,
///     RadixCount,
///     RadixLog
///   },
/// };
///
/// // Parameters defining the scheme we are using
/// let lwe_params = LWE_512_80;
/// let glwe_params = GLWE_1_1024_80;
/// let radix = RadixDecomposition {
///     count: RadixCount(3),
///     radix_log: RadixLog(4),
/// };
///
/// // We will be showing a binary univariate function. Note that for
/// // programmable bootstrapping to work in general, you will need to include at
/// // least one padding bit to the input.
/// let plaintext_bits = PlaintextBits(1);
/// let carry_bits = CarryBits(1);
/// let plaintext_bits_carry = PlaintextBits(2);
///
/// // The univariate function we want to evaluate, encoded as a lookup table.
/// let negate = |x| (x + 1) % (1 << plaintext_bits.0);
/// let lut = UnivariateLookupTable::trivial_from_fn(
///     &negate,
///     &glwe_params,
///     plaintext_bits,
/// );
///
/// // Generate the secret keys and the bootstrapping key
/// let lwe_sk = keygen::generate_binary_lwe_sk(&lwe_params);
/// let glwe_sk = keygen::generate_binary_glwe_sk(&glwe_params);
///
/// let bsk = keygen::generate_bootstrapping_key(&lwe_sk, &glwe_sk, &lwe_params, &glwe_params, &radix);
/// let bsk =
/// fft::fft_bootstrap_key(&bsk, &lwe_params, &glwe_params, &radix);
///
/// // Specify the inputs
/// let input_plain = 0;
///
/// // Encrypt the inputs. Note we are adding carry bits to the inputs.
/// let input = encryption::encrypt_lwe_secret(
///     input_plain,
///     &lwe_sk,
///     &lwe_params,
///     plaintext_bits_carry
/// );
///
/// // Perform the programmable bootstrapping
/// let mut result = LweCiphertext::new(&glwe_params.as_lwe_def());
/// programmable_bootstrap_univariate(
///     &mut result,
///     &input,
///     &lut,
///     &bsk,
///     &lwe_params,
///     &glwe_params,
///     &radix,
/// );
///
/// // Check the result matches our plaintext function.
/// let decrypted = encryption::decrypt_lwe(
///     &result,
///     &glwe_sk.to_lwe_secret_key(),
///     &glwe_params.as_lwe_def(),
///     plaintext_bits,
/// );
///
/// let expected = negate(input_plain);
/// assert_eq!(expected, decrypted);
/// ```
///
/// # See also
///
/// For the bivariate version of programmable bootstrapping, see
/// [`programmable_bootstrap_bivariate`](programmable_bootstrap_bivariate) and
/// its associated LUT
/// [`BivariateLookupTable`](crate::entities::BivariateLookupTable).
pub fn programmable_bootstrap_univariate<S>(
    output: &mut LweCiphertextRef<S>,
    input: &LweCiphertextRef<S>,
    lut: &UnivariateLookupTableRef<S>,
    bootstrap_key: &BootstrapKeyFftRef<Complex<f64>>,
    lwe_params: &LweDef,
    glwe_params: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    lwe_params.assert_valid();
    glwe_params.assert_valid();
    radix.assert_valid::<S>();
    bootstrap_key.assert_valid(lwe_params, glwe_params, radix);
    lut.assert_valid(glwe_params);
    input.assert_valid(lwe_params);
    output.assert_valid(&glwe_params.as_lwe_def());

    // Steps:
    // 1. Modulus switch the ciphertext to 2N.
    // 2. Use a cmux tree to blind rotate V using the elements of the bootstrap key (the input LWE secret key bits).
    // 3. Sample extract.
    // 4. (Optional, done outside of this method) Key switch to the output LWE
    // secret key (should be the one extracted from the GLWE key).

    let degree = glwe_params.dim.polynomial_degree.0;
    let two_n = degree.ilog2() + 1;

    // 1. Modulus switch the ciphertext to 2N.
    let mut ct = input.to_owned();
    lwe_ciphertext_modulus_switch(&mut ct, 0, 0, two_n, lwe_params);

    let (ct_a, ct_b) = ct.a_b(lwe_params);

    // 2. Use a cmux tree to blind rotate V using the elements of the bootstrap
    // key (the input LWE secret key bits).

    // Perform V_0 ^ X^{-b}
    allocate_scratch_ref!(cmux_output, GlweCiphertextRef<S>, (glwe_params.dim));
    cmux_output.clear();

    rotate_glwe_negative_monomial_negacyclic(
        cmux_output,
        lut.glwe(),
        ct_b.inner().to_u64() as usize,
        glwe_params,
    );

    allocate_scratch_ref!(rotated_ct, GlweCiphertextRef<S>, (glwe_params.dim));

    // Perform the cmux tree from the bootstrap key with the relation
    // V_n = V_{n-1} ^ X^{a_{n-1} s_{n-1}}
    for (a_i, index_select) in ct_a.iter().zip(bootstrap_key.rows(glwe_params, radix)) {
        let tmp = cmux_output.to_owned();

        // This operation performs a copy so the rotated_ct doesn't need to be
        // cleared.
        rotate_glwe_positive_monomial_negacyclic(
            rotated_ct,
            cmux_output,
            a_i.inner().to_u64() as usize,
            glwe_params,
        );

        cmux(
            cmux_output,
            &tmp,
            rotated_ct,
            index_select,
            glwe_params,
            radix,
        );
    }

    // 3. Sample extract.
    sample_extract(output, cmux_output, 0, glwe_params);
}

/// A generalized version of programmable bootstrapping.
/// Computes a function `lut` of the encrypted `input`.
/// However, this generalization features the ability to select which
/// bits to take during modulus switching. This capability enables
/// encoding multiple functions into `lut` and bootstrapping each of them
/// simultaneously.
///
/// # Remarks
/// While [`programmable_bootstrap_univariate`] and
/// [`programmable_bootstrap_bivariate`] compute a single function of the
/// input ciphertext, this can compute multiple functions. To do this,
/// create a [`UnivariateLookupTable`](crate::entities::UnivariateLookupTable) using
/// [`UnivariateLookupTable::trivivial_multifunctional`](crate::entities::UnivariateLookupTable::trivivial_multifunctional).
///
/// `log_v` should equal `ceil(log2(maps.len()))` for the `maps` you
/// used when creating the LUT.
///
/// `log_chi` is the number of most-significant bits to drop during
/// bootstrapping. Generally, you should set this to zero unless building
/// other cryptographic primitives, such as Without Padding Bootstrapping
/// (WoP-PBS)
pub fn generalized_programmable_bootstrap<S>(
    output: &mut GlweCiphertextRef<S>,
    input: &LweCiphertextRef<S>,
    lut: &UnivariateLookupTableRef<S>,
    bootstrap_key: &BootstrapKeyFftRef<Complex<f64>>,
    log_chi: u32,
    log_v: u32,
    lwe_params: &LweDef,
    glwe_params: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    lwe_params.assert_valid();
    glwe_params.assert_valid();
    radix.assert_valid::<S>();
    bootstrap_key.assert_valid(lwe_params, glwe_params, radix);
    lut.assert_valid(glwe_params);
    input.assert_valid(lwe_params);
    output.assert_valid(glwe_params);

    // Steps:
    // 1. Modulus switch the ciphertext to 2N.
    // 2. Use a cmux tree to blind rotate V using the elements of the bootstrap key (the input LWE secret key bits).
    // 3. Sample extract.
    // 4. (Optional, done outside of this method) Key switch to the output LWE
    // secret key (should be the one extracted from the GLWE key).

    let degree = glwe_params.dim.polynomial_degree.0;
    let two_n = degree.ilog2() + 1;

    // 1. Modulus switch the ciphertext to 2N.
    let mut ct = input.to_owned();
    lwe_ciphertext_modulus_switch(&mut ct, log_chi, log_v, two_n, lwe_params);

    let (ct_a, ct_b) = ct.a_b(lwe_params);

    // 2. Use a cmux tree to blind rotate V using the elements of the bootstrap
    // key (the input LWE secret key bits).

    // Perform V_0 ^ X^{-b}
    output.clear();

    rotate_glwe_negative_monomial_negacyclic(
        output,
        lut.glwe(),
        ct_b.inner().to_u64() as usize,
        glwe_params,
    );

    allocate_scratch_ref!(rotated_ct, GlweCiphertextRef<S>, (glwe_params.dim));

    // Perform the cmux tree from the bootstrap key with the relation
    // V_n = V_{n-1} ^ X^{a_{n-1} s_{n-1}}
    for (a_i, index_select) in ct_a.iter().zip(bootstrap_key.rows(glwe_params, radix)) {
        let tmp = output.to_owned();

        // This operation performs a copy so the rotated_ct doesn't need to be
        // cleared.
        rotate_glwe_positive_monomial_negacyclic(
            rotated_ct,
            output,
            a_i.inner().to_u64() as usize,
            glwe_params,
        );

        cmux(output, &tmp, rotated_ct, index_select, glwe_params, radix);
    }
}

/// Evaluate a bivariate function on a packed input.
fn bivariate_function<F>(map: F, input: u64, plaintext_bits: PlaintextBits) -> u64
where
    F: Fn(u64, u64) -> u64,
{
    let modulus = 1 << plaintext_bits.0;
    let lhs = (input / modulus) % modulus;
    let rhs = input % modulus;

    let result = map(lhs, rhs);

    assert!(
        result < modulus,
        "The result of the bivariate function must be less than the plaintext modulus"
    );

    result
}

/// Generate a lookup table that takes two inputs and produces a single output.
pub(crate) fn generate_bivariate_lut<S, F>(
    output: &mut PolynomialRef<Torus<S>>,
    map: F,
    params: &GlweDef,
    plaintext_bits: PlaintextBits,
    carry_bits: CarryBits,
) where
    S: TorusOps,
    F: Fn(u64, u64) -> u64,
{
    assert!(
        plaintext_bits.0 <= carry_bits.0,
        "The number of plaintext bits must be less than or equal to the number of carry bits"
    );

    let wrapped_func = |input: u64| bivariate_function(&map, input, plaintext_bits);

    generate_lut(
        output,
        &[wrapped_func],
        params,
        PlaintextBits(plaintext_bits.0 + carry_bits.0),
    );
}

/// Programmable bootstrapping with a bivariate function.
///
/// The LUT this is a table that maps two inputs into a single output.
/// For example, say we want to encode the xor function `f(x, y) = (x + y) % 2`
/// into a lookup table. We would create a
/// [`BivariateLookupTable`](crate::entities::BivariateLookupTable) that
/// implements this function and then execute it on the input ciphertexts.
///
/// Important note: This function does not perform key switching. The output
/// ciphertext will be encrypted under the LWE key extracted from the GLWE
/// secret key used for the bootstrapping key. To perform a keyswitch, use
/// [`keyswitch_lwe_to_lwe`](crate::ops::keyswitch::lwe_keyswitch::keyswitch_lwe_to_lwe)
/// after the bootstrapping operation.
///
/// # Example
///
/// ```
/// use sunscreen_tfhe::{
///   high_level::{keygen, encryption, fft},
///   entities::{BivariateLookupTable, LweCiphertext},
///   ops::bootstrapping::programmable_bootstrap_bivariate,
///   params::{
///     GLWE_1_1024_80,
///     LWE_512_80,
///     CarryBits,
///     PlaintextBits,
///     RadixDecomposition,
///     RadixCount,
///     RadixLog
///   },
/// };
///
/// // Parameters defining the scheme we are using
/// let lwe_params = LWE_512_80;
/// let glwe_params = GLWE_1_1024_80;
/// let radix = RadixDecomposition {
///     count: RadixCount(3),
///     radix_log: RadixLog(4),
/// };
///
/// // We will be showing a binary bivariate function, but bivariate
/// // bootstrapping can be done on more plaintext bits. Note that the effective
/// // number of plaintext bits used is twice the number of plaintext bits
/// // specified because the inputs are packed into one ciphertext inside
/// // `programmable_bootstrap_bivariate`. The number of carry bits must always
/// // be greater than or equal to the number of plaintext bits.
/// let plaintext_bits = PlaintextBits(1);
/// let plaintext_bits_carry = PlaintextBits(2);
/// let carry_bits = CarryBits(1);
///
/// // The bivariate function we want to evaluate, encoded as a lookup table.
/// let xor = |x, y| (x + y) % (1 << plaintext_bits.0);
/// let lut = BivariateLookupTable::trivial_from_fn(
///     &xor,
///     &glwe_params,
///     plaintext_bits,
///     carry_bits
/// );
///
/// // Generate the secret keys and the bootstrapping key
/// let lwe_sk = keygen::generate_binary_lwe_sk(&lwe_params);
/// let glwe_sk = keygen::generate_binary_glwe_sk(&glwe_params);
///
/// let bsk = keygen::generate_bootstrapping_key(&lwe_sk, &glwe_sk, &lwe_params, &glwe_params, &radix);
/// let bsk =
/// fft::fft_bootstrap_key(&bsk, &lwe_params, &glwe_params, &radix);
///
/// // Specify the inputs
/// let left_input_plain = 0;
/// let right_input_plain = 1;
///
/// // Encrypt the inputs. Note we are adding carry bits to the inputs.
/// let left_input = encryption::encrypt_lwe_secret(
///     left_input_plain,
///     &lwe_sk,
///     &lwe_params,
///     plaintext_bits_carry
/// );
/// let right_input = encryption::encrypt_lwe_secret(
///     right_input_plain,
///     &lwe_sk,
///     &lwe_params,
///     plaintext_bits_carry
/// );
///
/// // Perform the programmable bootstrapping
/// let mut result = LweCiphertext::new(&glwe_params.as_lwe_def());
/// programmable_bootstrap_bivariate(
///     &mut result,
///     &left_input,
///     &right_input,
///     &lut,
///     &bsk,
///     &lwe_params,
///     &glwe_params,
///     plaintext_bits,
///     &radix,
/// );
///
/// // Check the result matches our plaintext function.
/// let decrypted = encryption::decrypt_lwe_with_carry(
///     &result,
///     &glwe_sk.to_lwe_secret_key(),
///     &glwe_params.as_lwe_def(),
///     plaintext_bits,
///     carry_bits
/// );
///
/// let expected = xor(left_input_plain, right_input_plain);
/// assert_eq!(expected, decrypted);
/// ```
///
/// # See also
///
/// For the univariate version of programmable bootstrapping, see
/// [`programmable_bootstrap`](programmable_bootstrap) and its associated LUT
/// [`UnivariateLookupTable`](crate::entities::UnivariateLookupTable).
#[allow(clippy::too_many_arguments)]
pub fn programmable_bootstrap_bivariate<S>(
    output: &mut LweCiphertextRef<S>,
    left_input: &LweCiphertextRef<S>,
    right_input: &LweCiphertextRef<S>,
    lut: &BivariateLookupTableRef<S>,
    bootstrap_key: &BootstrapKeyFftRef<Complex<f64>>,
    lwe_params: &LweDef,
    glwe_params: &GlweDef,
    plaintext_bits: PlaintextBits,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    // The general operation for a bivariate PBS is
    //
    // 1. Ensure that the number of carry bits is equal to the size of the
    //    message or greater.
    // 2. Define a LUT where the function takes in one input and decomposes that
    //    input into the higher n plaintext and lower n plaintext bits. The
    //    higher n bits are the left input to the bivariate function, while the
    //    lower n bits are the right input to the bivariate function.
    // 3. Encrypt the two input ciphertexts using the number of carry bits and
    //    the plaintext bits, with padding.
    // 4. On the left encrypted input, shift it up by the number of plaintext
    //    bits by multiplying the ciphertext by the plaintext modulus.
    // 5. Add the left and right encrypted inputs together.
    // 6. Perform the programmable bootstrapping with this combined input.

    let shift = (1 << plaintext_bits.0) as u64;

    allocate_scratch_ref!(pbs_input, LweCiphertextRef<S>, (lwe_params.dim));
    pbs_input.clear();

    // (left * modulus) + right to pack the two inputs into a single LWE
    scalar_mul_ciphertext_mad(pbs_input, &S::from_u64(shift), left_input, lwe_params);
    add_lwe_inplace(pbs_input, right_input, lwe_params);

    programmable_bootstrap_univariate(
        output,
        pbs_input,
        lut.as_univariate(),
        bootstrap_key,
        lwe_params,
        glwe_params,
        radix,
    )
}

#[cfg(test)]
mod tests {

    use crate::{
        entities::{
            BivariateLookupTable, BootstrapKey, BootstrapKeyFft, GlweCiphertext, LweCiphertext,
            LweKeyswitchKey, UnivariateLookupTable,
        },
        high_level::{encryption, fft, keygen, TEST_GLWE_DEF_1, TEST_LWE_DEF_1, TEST_RADIX},
        ops::{
            encryption::{decrypt_ggsw_ciphertext, encrypt_lwe_ciphertext},
            keyswitch::lwe_keyswitch_key::generate_keyswitch_key_lwe,
        },
        RoundedDiv, GLWE_1_1024_80, LWE_512_80,
    };

    use super::*;

    fn generate_negacyclic_lut_from_formula<S>(
        params: &GlweDef,
        plaintext_bits: PlaintextBits,
    ) -> Polynomial<Torus<S>>
    where
        S: TorusOps,
    {
        let mut output = Polynomial::<Torus<S>>::zero(params.dim.polynomial_degree.0);

        let p = (1 << plaintext_bits.0) as u64;
        let n = params.dim.polynomial_degree.0 as u64;

        let divisor = 2 * n;

        for (j, c) in output.coeffs_mut().iter_mut().enumerate() {
            let v_i = ((p * (j as u64)).div_rounded(divisor)) % p;
            let v_i = v_i << (S::BITS - plaintext_bits.0);
            *c = Torus::from(S::from_u64(v_i));
        }

        output
    }

    #[test]
    fn can_generate_negacyclic_lut() {
        let p = PlaintextBits(4);
        let params = TEST_GLWE_DEF_1;

        let mut poly = Polynomial::<Torus<u64>>::zero(params.dim.polynomial_degree.0);
        generate_negacyclic_lut(&mut poly, |x| x, &params, p);

        let expected = generate_negacyclic_lut_from_formula(&params, p);

        assert_eq!(expected, poly);
    }

    #[test]
    fn can_generate_bootstrap_key() {
        let lwe_params = TEST_LWE_DEF_1;
        let glwe_params = TEST_GLWE_DEF_1;
        let radix = TEST_RADIX;

        let sk = keygen::generate_binary_lwe_sk(&lwe_params);
        let glwe_sk = keygen::generate_binary_glwe_sk(&glwe_params);

        let mut bootstrap_key = BootstrapKey::new(&lwe_params, &glwe_params, &radix);
        generate_bootstrap_key(
            &mut bootstrap_key,
            &sk,
            &glwe_sk,
            &lwe_params,
            &glwe_params,
            &radix,
        );

        let mut count = 0;
        for (s_i, ct) in sk.s().iter().zip(bootstrap_key.rows(&glwe_params, &radix)) {
            let mut msg = Polynomial::<Torus<u64>>::zero(glwe_params.dim.polynomial_degree.0);
            decrypt_ggsw_ciphertext(&mut msg, ct, &glwe_sk, &glwe_params, &radix);

            assert_eq!(msg.coeffs()[0].inner(), *s_i);

            count += 1
        }

        assert_eq!(count, sk.s().len());
    }

    fn bootstrap_helper(map: impl Fn(u64) -> u64) {
        let bits = PlaintextBits(3);
        let lwe = TEST_LWE_DEF_1;
        let glwe = GLWE_1_1024_80;
        let radix = TEST_RADIX;

        let original_sk = keygen::generate_binary_lwe_sk(&lwe);
        let glwe_sk = keygen::generate_binary_glwe_sk(&glwe);

        // We want to switch from the sample extracted key to the new key.
        let mut ksk = LweKeyswitchKey::<u64>::new(&glwe.as_lwe_def(), &lwe, &radix);
        generate_keyswitch_key_lwe(
            &mut ksk,
            glwe_sk.to_lwe_secret_key(),
            &original_sk,
            &glwe.as_lwe_def(),
            &lwe,
            &radix,
        );

        let mut bsk_nonfft = BootstrapKey::new(&lwe, &glwe, &radix);
        generate_bootstrap_key(&mut bsk_nonfft, &original_sk, &glwe_sk, &lwe, &glwe, &radix);

        let mut bsk = BootstrapKeyFft::new(&lwe, &glwe, &radix);
        bsk_nonfft.fft(&mut bsk, &lwe, &glwe, &radix);

        // Generate the LUT
        let lut = UnivariateLookupTable::trivial_from_fn(&map, &glwe, bits);

        let mut failed = Vec::new();
        for msg in 0..(1 << bits.0) {
            let mut original_ct = LweCiphertext::new(&lwe);

            // Adding a padding bit
            let encoded_msg = msg << (64 - bits.0 - 1);
            encrypt_lwe_ciphertext(
                &mut original_ct,
                &original_sk,
                Torus::from(encoded_msg),
                &lwe,
            );

            let mut new_ct = LweCiphertext::new(&glwe.as_lwe_def());

            programmable_bootstrap_univariate(
                &mut new_ct,
                &original_ct,
                &lut,
                &bsk,
                &lwe,
                &glwe,
                &radix,
            );

            let decoded = glwe_sk
                .to_lwe_secret_key()
                .decrypt(&new_ct, &glwe.as_lwe_def(), bits);

            let result = map(msg);
            if result != decoded {
                failed.push((result, decoded));
            }
        }

        if !failed.is_empty() {
            panic!(
                "Failed to decrypt the following messages and decrypted values: {:?}",
                failed
            );
        }
    }

    #[test]
    fn can_bootstrap() {
        bootstrap_helper(|x| x);
    }

    #[test]
    fn can_bootstrap_with_map() {
        bootstrap_helper(|x| (x + 3) % 8);
    }

    fn bivariate_bootstrap_helper(map: impl Fn(u64, u64) -> u64) {
        let lwe = TEST_LWE_DEF_1;
        let glwe = TEST_GLWE_DEF_1;
        let _radix = TEST_RADIX;
        let bits = PlaintextBits(1);

        let carry_bits = CarryBits(1);
        let radix = TEST_RADIX;

        let original_sk = keygen::generate_binary_lwe_sk(&lwe);
        let glwe_sk = keygen::generate_binary_glwe_sk(&glwe);

        // We want to switch from the sample extracted key to the new key.
        let mut ksk = LweKeyswitchKey::<u64>::new(&glwe.as_lwe_def(), &lwe, &radix);
        generate_keyswitch_key_lwe(
            &mut ksk,
            glwe_sk.to_lwe_secret_key(),
            &original_sk,
            &glwe.as_lwe_def(),
            &lwe,
            &radix,
        );

        let mut bsk_nonfft = BootstrapKey::new(&lwe, &glwe, &radix);
        generate_bootstrap_key(&mut bsk_nonfft, &original_sk, &glwe_sk, &lwe, &glwe, &radix);

        let mut bsk = BootstrapKeyFft::new(&lwe, &glwe, &radix);
        bsk_nonfft.fft(&mut bsk, &lwe, &glwe, &radix);

        // Generate the LUT
        let lut = BivariateLookupTable::trivial_from_fn(&map, &glwe, bits, carry_bits);

        let mut failed = Vec::new();
        let mut succeeded = Vec::new();

        for left_msg in 0..(1 << bits.0) {
            for right_msg in 0..(1 << bits.0) {
                let mut left_ct = LweCiphertext::new(&lwe);
                let mut right_ct = LweCiphertext::new(&lwe);

                // Adding a padding bit, hence the - 1
                let encoded_left_msg = left_msg << (64 - bits.0 - carry_bits.0 - 1);
                let encoded_right_msg = right_msg << (64 - bits.0 - carry_bits.0 - 1);

                encrypt_lwe_ciphertext(
                    &mut left_ct,
                    &original_sk,
                    Torus::from(encoded_left_msg),
                    &lwe,
                );

                encrypt_lwe_ciphertext(
                    &mut right_ct,
                    &original_sk,
                    Torus::from(encoded_right_msg),
                    &lwe,
                );

                let mut new_ct = LweCiphertext::new(&glwe.as_lwe_def());

                programmable_bootstrap_bivariate(
                    &mut new_ct,
                    &left_ct,
                    &right_ct,
                    &lut,
                    &bsk,
                    &lwe,
                    &glwe,
                    bits,
                    &radix,
                );

                let decrypted = glwe_sk
                    .to_lwe_secret_key()
                    .decrypt_without_decode(&new_ct, &glwe.as_lwe_def());

                // We manually decode here because the
                let plain_bits = bits;

                let round_bit = decrypted
                    .inner()
                    .wrapping_shr(64 - plain_bits.0 - carry_bits.0 - 1)
                    & 0x1;
                let mask = (0x1 << plain_bits.0) - 1;

                let decoded = (decrypted
                    .inner()
                    .wrapping_shr(64 - plain_bits.0 - carry_bits.0)
                    + round_bit)
                    & mask;

                let result = map(left_msg, right_msg);
                if result != decoded {
                    failed.push(((left_msg, right_msg), result, decoded));
                } else {
                    succeeded.push(((left_msg, right_msg), result, decoded));
                }
            }
        }
        if !failed.is_empty() {
            panic!(
                    "Failed to decrypt the following messages and decrypted values (as ((left input, right_input), expected, decrypted)): {:?}. However, the following messages and decrypted values succeeded: {:?}",
                    failed, succeeded
                );
        }
    }

    fn bivariate_test_function(left: u64, right: u64) -> u64 {
        (left + right) % 2
    }

    #[test]
    fn can_bootstrap_with_bivariate_map() {
        bivariate_bootstrap_helper(bivariate_test_function);
    }

    #[test]
    fn can_decompose_bivariate_map() {
        let plaintext_bits = PlaintextBits(2);
        let modulus = 1 << plaintext_bits.0;

        let map = &bivariate_test_function;

        for left in 0u64..(plaintext_bits.0 as u64) {
            for right in 0u64..(plaintext_bits.0 as u64) {
                let left_shifted = left * modulus;
                let input = left_shifted + right;
                let result = bivariate_function(map, input, plaintext_bits);

                assert_eq!(result, map(left, right));
            }
        }
    }

    #[test]
    fn can_generalized_bootstrap() {
        let radix = &TEST_RADIX;
        let lwe = &LWE_512_80;
        let glwe = &GLWE_1_1024_80;

        // 1 message bit + 1 padding
        let bits = PlaintextBits(1);

        let lwe_sk = keygen::generate_binary_lwe_sk(lwe);
        let glwe_sk = keygen::generate_binary_glwe_sk(glwe);
        let bs_key = keygen::generate_bootstrapping_key(&lwe_sk, &glwe_sk, lwe, glwe, radix);
        let bs_key = fft::fft_bootstrap_key(&bs_key, lwe, glwe, radix);

        // Fill the LUT with nonsense and we'll overwrite it with
        // the correct encoding.
        let lut = UnivariateLookupTable::trivivial_multifunctional(
            [|x| x % 2, |x| (x + 1) % 2, |x| x % 2].as_slice(),
            glwe,
            bits,
        );

        for i in [0, 1] {
            //let input = encryption::encrypt_lwe_secret(i, &lwe_sk, lwe, bits);
            let input = encryption::trivial_lwe(i, lwe, PlaintextBits(2));
            let mut output = GlweCiphertext::new(glwe);

            generalized_programmable_bootstrap(
                &mut output,
                &input,
                &lut,
                &bs_key,
                0,
                3,
                lwe,
                glwe,
                radix,
            );

            let res = encryption::decrypt_glwe(&output, &glwe_sk, glwe, bits);

            if i == 0 {
                assert_eq!(res.coeffs()[0], 0);
                assert_eq!(res.coeffs()[1], 1);
                assert_eq!(res.coeffs()[2], 0);
                assert_eq!(res.coeffs()[3], 0);
                assert_eq!(res.coeffs()[4], 0);
                assert_eq!(res.coeffs()[5], 1);
                assert_eq!(res.coeffs()[6], 0);
                assert_eq!(res.coeffs()[7], 0);
            } else {
                assert_eq!(res.coeffs()[0], 1);
                assert_eq!(res.coeffs()[1], 0);
                assert_eq!(res.coeffs()[2], 1);
                assert_eq!(res.coeffs()[3], 0);
                assert_eq!(res.coeffs()[4], 1);
                assert_eq!(res.coeffs()[5], 0);
                assert_eq!(res.coeffs()[6], 1);
                assert_eq!(res.coeffs()[7], 0);
            }
        }
    }
}
