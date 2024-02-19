use num::Complex;

use crate::{
    dst::FromMutSlice,
    entities::{BlindRotationShiftFftRef, GgswCiphertext, GlweCiphertextRef, GlweSecretKeyRef},
    ops::{encryption::encrypt_ggsw_ciphertext_scalar, fft_ops::cmux},
    scratch::allocate_scratch_ref,
    GlweDef, PlaintextBits, RadixDecomposition, TorusOps,
};

/// Rotate the given ciphertext message polynomial by the given amount as if it
/// had been multiplied by a monomial with either positive or negative degree.
/// Since this is a negacyclic rotation, a rotation to the left negates the last
/// `rotation` coefficients, while a rotation to the right negates the first
/// `rotation` coefficients.
///
/// Mathematically, this is equivalent to multiplying the underlying polynomial
/// message by X^{rotation} mod (X^N + 1), where N is the polynomial degree.
/// There are some convenient relations to remember over any integer $k$ and
/// $i$:
///
/// - Rotations are modulus 2N: $X^{k*2N} = 1$ and $X^{k*2N ± i} = X^{± i}$.
/// - Rotations that are equivalent to a shift by -N are equivalent to negating
///   the polynomial: $X^{k*2N + N} = -1$.
/// - A negative rotation has an equivalent positive rotation: $X^{-i} = -X^{N - i}$.
///
/// # Example
///
/// ```
/// use sunscreen_tfhe::{
///   high_level::{keygen, encryption},
///   entities::{GlweCiphertext, Polynomial},
///   ops::bootstrapping::rotate_glwe_monomial_negacyclic,
///   params::{
///     GlweDef,
///     GlweSize,
///     GlweDimension,
///     PlaintextBits,
///     PolynomialDegree,
///   },
///   rand::Stddev,
/// };
///
/// // Define the GLWE parameters
/// let params = GlweDef {
///    dim: GlweDimension {
///        size: GlweSize(1),
///        polynomial_degree: PolynomialDegree(8),
///    },
///    std: Stddev(0.0000000444778278004718),
/// };
/// let plaintext_bits = PlaintextBits(4);
///
/// // Generate the GLWE secret key
/// let sk = keygen::generate_binary_glwe_sk(&params);
///
/// // Define and encrypt a message
/// let msg = Polynomial::new(&[1, 2, 3, 4, 5, 6, 7, 8]);
/// let ct = encryption::encrypt_glwe(&msg, &sk, &params, plaintext_bits);
///
/// // Rotate the message polynomial by 1 to the right
/// let mut rotated_ct = GlweCiphertext::new(&params);
/// rotate_glwe_monomial_negacyclic(&mut rotated_ct, &ct, 1, &params);
///
/// let decrypted_msg = sk.decrypt_decode_glwe(&rotated_ct, &params, plaintext_bits);
///
/// assert_eq!(decrypted_msg, Polynomial::new(&[8, 1, 2, 3, 4, 5, 6, 7]));
///
/// // Rotate the message polynomial by 1 to the left
/// let mut rotated_ct = GlweCiphertext::new(&params);
/// rotate_glwe_monomial_negacyclic(&mut rotated_ct, &ct, -1, &params);
///
/// let decrypted_msg = sk.decrypt_decode_glwe(&rotated_ct, &params, plaintext_bits);
///
/// // Since this is a negacyclic rotation, the element moved to the end is
/// // negated.
/// assert_eq!(decrypted_msg, Polynomial::new(&[2, 3, 4, 5, 6, 7, 8, 15]));
/// ```
pub fn rotate_glwe_monomial_negacyclic<S>(
    output: &mut GlweCiphertextRef<S>,
    ct: &GlweCiphertextRef<S>,
    rotation: isize,
    params: &GlweDef,
) where
    S: TorusOps,
{
    let (output_a, output_b) = output.a_b_mut(params);
    let (ct_a, ct_b) = ct.a_b(params);

    let output_all_coefficients = output_a.chain(std::iter::once(output_b));
    let ct_all_coefficients = ct_a.chain(std::iter::once(ct_b));

    for (o, a) in output_all_coefficients.zip(ct_all_coefficients) {
        o.clone_from_ref(a);
        o.mul_by_monomial_negacyclic(rotation);
    }
}

/// Rotate the given ciphertext message polynomial by the given amount as if it
/// had been multiplied by a monomial. This is equivalent to shifting
/// all the coefficients left by `rotation` and negating the last `rotation`
/// coefficients. Mathematically, this is equivalent to multiplying by
/// X^{-rotation} mod (X^N + 1), or equivalently -X^{N - rotation}.
///
/// See [`rotate_glwe_monomial_negacyclic`] for the case that handles both
/// positive and negative rotations, plus an example.
pub fn rotate_glwe_negative_monomial_negacyclic<S>(
    output: &mut GlweCiphertextRef<S>,
    ct: &GlweCiphertextRef<S>,
    rotation: usize,
    params: &GlweDef,
) where
    S: TorusOps,
{
    rotate_glwe_monomial_negacyclic(output, ct, -(rotation as isize), params)
}

/// Rotate the given ciphertext message polynomial by the given amount as if it
/// had been multiplied by a positive monomial. This is equivalent to shifting
/// all the coefficients right by `rotation` and negating the first `rotation`
/// coefficients. Mathematically, this is equivalent to multiplying by
/// X^{rotation} mod (X^N + 1).
///
/// See [`rotate_glwe_monomial_negacyclic`] for the case that handles both
/// positive and negative rotations, plus an example.
pub fn rotate_glwe_positive_monomial_negacyclic<S>(
    output: &mut GlweCiphertextRef<S>,
    ct: &GlweCiphertextRef<S>,
    rotation: usize,
    params: &GlweDef,
) where
    S: TorusOps,
{
    rotate_glwe_monomial_negacyclic(output, ct, rotation as isize, params)
}

/// Rotate the given ciphertext message polynomial by negative encrypted shift.
/// In practice this is not often used on its own; bootstrapping performs a
/// different procedure.
///
/// See
/// - [`generate_blind_rotation_shift`] for a way to encrypt a rotation amount.
/// - [`rotate_glwe_monomial_negacyclic`] for how negacyclic rotation works
///   when the rotation amount is public.
///
/// # Example
///
/// ```
/// use sunscreen_tfhe::{
///     high_level::{keygen, encryption},
///     entities::{GlweCiphertext, Polynomial},
///     ops::bootstrapping::{blind_rotation, generate_blind_rotation_shift},
///     params::{
///         GlweDef,
///         GlweSize,
///         GlweDimension,
///         PlaintextBits,
///         PolynomialDegree,
///         RadixDecomposition,
///         RadixCount,
///         RadixLog,
///     },
///     rand::Stddev,
/// };
///
/// // Define the GLWE parameters
/// let params = GlweDef {
///     dim: GlweDimension {
///         size: GlweSize(1),
///         polynomial_degree: PolynomialDegree(8),
///     },
///     std: Stddev(0.0000000444778278004718),
/// };
/// let radix = RadixDecomposition {
///     count: RadixCount(3),
///     radix_log: RadixLog(4),
/// };
/// let plaintext_bits = PlaintextBits(4);
///
/// // Generate the GLWE secret key
/// let sk = keygen::generate_binary_glwe_sk(&params);
///
/// // Define and encrypt a message
/// let msg = Polynomial::new(&[1, 2, 3, 4, 5, 6, 7, 8]);
/// let ct = encryption::encrypt_glwe(&msg, &sk, &params, plaintext_bits);
///
/// // Generate a blind rotation amount
/// let mut blind_rotation_index = sunscreen_tfhe::entities::BlindRotationShiftFft::new(&params, &radix);
/// generate_blind_rotation_shift(&mut blind_rotation_index, 1, &sk, &params, &radix, plaintext_bits);
///
/// // Rotate the message polynomial by the blind rotation amount
/// let mut rotated_ct = GlweCiphertext::new(&params);
/// blind_rotation(&mut rotated_ct, &blind_rotation_index, &ct, &params, &radix);
///
/// let decrypted_msg = sk.decrypt_decode_glwe(&rotated_ct, &params, plaintext_bits);
///
/// assert_eq!(decrypted_msg, Polynomial::new(&[2, 3, 4, 5, 6, 7, 8, 15]));
/// ```
pub fn blind_rotation<S>(
    output: &mut GlweCiphertextRef<S>,
    blind_rotation_index: &BlindRotationShiftFftRef<Complex<f64>>,
    ct: &GlweCiphertextRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    // Initialize with the unrotated message m
    output.clone_from_ref(ct);
    allocate_scratch_ref!(rotated_ct, GlweCiphertextRef<S>, (params.dim));

    for (i, index_select) in blind_rotation_index.rows(params, radix).enumerate() {
        let rotation = 1 << i;

        rotate_glwe_negative_monomial_negacyclic(rotated_ct, output, rotation, params);

        let tmp = output.to_owned();
        cmux(output, &tmp, rotated_ct, index_select, params, radix);
    }
}

/// Encrypt an amount to rotate the message polynomial by.
///
/// This function is mostly provided as a convenience. Bootstrapping will rotate
/// a message without encrypting using a cmux tree, so this function is not
/// strictly necessary.
pub fn generate_blind_rotation_shift<S>(
    bootstrap_key: &mut BlindRotationShiftFftRef<Complex<f64>>,
    rotation: usize,
    sk: &GlweSecretKeyRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
    plaintext_bits: PlaintextBits,
) where
    S: TorusOps,
{
    let degree = params.dim.polynomial_degree.0;
    assert!(rotation < degree);

    for (i, ggsw_fft) in bootstrap_key.rows_mut(params, radix).enumerate() {
        let bit = ((rotation >> i) & 1) as u64;
        let mut ct = GgswCiphertext::new(params, radix);

        encrypt_ggsw_ciphertext_scalar(
            &mut ct,
            S::from_u64(bit),
            sk,
            params,
            radix,
            plaintext_bits,
        );

        ct.fft(ggsw_fft, params, radix);
    }
}

#[cfg(test)]
mod tests {
    use blind_rotation::generate_blind_rotation_shift;

    use crate::{
        entities::{
            BlindRotationShiftFft, GgswCiphertext, GlweCiphertext, GlweSecretKey, Polynomial,
        },
        high_level::{TEST_GLWE_DEF_1, TEST_RADIX},
        ops::{
            bootstrapping::{blind_rotation, rotate_glwe_monomial_negacyclic},
            encryption::decrypt_ggsw_ciphertext,
        },
        polynomial::polynomial_external_mad,
        GlweDef, GlweDimension, GlweSize, PlaintextBits, PolynomialDegree, Torus,
    };

    #[test]
    fn can_rotate() {
        let params = GlweDef {
            dim: GlweDimension {
                polynomial_degree: PolynomialDegree(8),
                size: GlweSize(2),
            },
            ..TEST_GLWE_DEF_1
        };
        let plaintext_bits = PlaintextBits(4);

        let modulus = 1 << plaintext_bits.0;
        let degree = params.dim.polynomial_degree.0;

        let sk = GlweSecretKey::<u64>::generate_binary(&params);

        let msg_coeffs = (0..degree)
            .map(|i| (i % modulus) as u64)
            .collect::<Vec<_>>();
        let msg = Polynomial::new(&msg_coeffs);

        let ct = sk.encode_encrypt_glwe(&msg, &params, plaintext_bits);

        for rotation in (-2i64 * (degree as i64))..=(2i64 * (degree as i64)) {
            println!("Rotation: {}", rotation);
            let mut rotation_polynomial = vec![Torus::from(0u64); degree];

            let direction = if rotation < 0 { -1 } else { 1 };
            let original_rotation = rotation;
            let rotation = rotation.unsigned_abs() as usize;

            #[allow(clippy::collapsible_else_if)]
            if direction == 1 {
                // Positive rotation
                if rotation == 0 || rotation == 2 * degree {
                    rotation_polynomial[0] = Torus::from(1);
                } else if rotation < degree {
                    rotation_polynomial[rotation] = Torus::from(1);
                } else if rotation == degree {
                    rotation_polynomial[0] = -Torus::from(1);
                } else {
                    rotation_polynomial[rotation % degree] = -Torus::from(1);
                }
            } else {
                // Negative rotation
                if rotation == 0 || rotation == 2 * degree {
                    rotation_polynomial[0] = Torus::from(1);
                } else if rotation < degree {
                    rotation_polynomial[(degree - rotation) % degree] = -Torus::from(1);
                } else if rotation == degree {
                    rotation_polynomial[0] = -Torus::from(1);
                } else {
                    rotation_polynomial[(2 * degree - rotation) % degree] = Torus::from(1);
                }
            }

            let rotation_polynomial = Polynomial::new(&rotation_polynomial);

            let mut expected = Polynomial::<Torus<u64>>::zero(degree);
            polynomial_external_mad(&mut expected, &rotation_polynomial, &msg);

            // Polynomial multiply doesn't reduce modulo the modulus, so we need to do it manually.
            let expected = expected.map(|x| x.inner() % (modulus as u64));

            // Perform encrypted rotation
            let mut output_ct = GlweCiphertext::new(&params);

            rotate_glwe_monomial_negacyclic(
                &mut output_ct,
                &ct,
                original_rotation as isize,
                &params,
            );

            let output_msg = sk.decrypt_decode_glwe(&output_ct, &params, plaintext_bits);

            assert_eq!(output_msg, expected);
        }
    }

    #[test]
    fn rotation_shift_encrypted_properly() {
        let params = GlweDef {
            dim: GlweDimension {
                polynomial_degree: PolynomialDegree(8),
                size: GlweSize(2),
            },
            ..TEST_GLWE_DEF_1
        };
        let radix = TEST_RADIX;
        let degree = params.dim.polynomial_degree.0;

        let sk = GlweSecretKey::<u64>::generate_binary(&params);

        for rotation in 0..(degree - 1) {
            let mut ggsw_index = BlindRotationShiftFft::new(&params, &radix);
            generate_blind_rotation_shift(
                &mut ggsw_index,
                rotation,
                &sk,
                &params,
                &radix,
                PlaintextBits(4),
            );

            let mut encrypted_rotation = 0u64;
            for (i, bit_fft) in ggsw_index.rows(&params, &radix).enumerate() {
                let mut bit = GgswCiphertext::<u64>::new(&params, &radix);
                bit_fft.ifft(&mut bit, &params, &radix);

                let mut pt = Polynomial::zero(degree);
                decrypt_ggsw_ciphertext(&mut pt, &bit, &sk, &params, &radix);

                encrypted_rotation |= pt.coeffs()[0].inner() << i;
            }

            assert_eq!(encrypted_rotation, rotation as u64);
        }
    }

    #[test]
    fn can_blind_rotate() {
        let params = GlweDef {
            dim: GlweDimension {
                polynomial_degree: PolynomialDegree(8),
                size: GlweSize(2),
            },
            ..TEST_GLWE_DEF_1
        };
        let radix = TEST_RADIX;
        let plaintext_bits = PlaintextBits(4);

        let modulus = 1 << plaintext_bits.0;
        let degree = params.dim.polynomial_degree.0;
        let num_bits = (degree as u64).ilog2() as usize;

        let sk = GlweSecretKey::<u64>::generate_binary(&params);

        let msg_coeffs = (0..degree)
            .map(|i| (i % modulus) as u64)
            .collect::<Vec<_>>();
        let msg = Polynomial::new(&msg_coeffs);

        let ct = sk.encode_encrypt_glwe(&msg, &params, plaintext_bits);

        #[allow(clippy::needless_range_loop)]
        for rotation in 0..=(degree - 1) {
            let mut expected = Polynomial::<Torus<u64>>::new(msg.map(|x| Torus::from(*x)).coeffs());

            for i in 0..num_bits {
                let bit = ((rotation >> i) & 1) as u64;

                // We don't perform this rotation
                if bit == 0 {
                    continue;
                }

                let mut rotation_polynomial = vec![Torus::from(0u64); degree];

                rotation_polynomial[degree - (1 << i)] = -Torus::<u64>::from(1);

                let rotation_polynomial = Polynomial::new(&rotation_polynomial);

                let tmp = expected.map(|x| x.inner());
                expected = Polynomial::<Torus<u64>>::zero(degree);

                polynomial_external_mad(&mut expected, &rotation_polynomial, &tmp);
            }

            // Polynomial multiply doesn't reduce modulo the modulus, so we need to do it manually.
            let expected = expected.map(|x| x.inner() % (modulus as u64));

            // Perform encrypted rotation
            let mut ggsw_index = BlindRotationShiftFft::new(&params, &radix);
            generate_blind_rotation_shift(
                &mut ggsw_index,
                rotation,
                &sk,
                &params,
                &radix,
                plaintext_bits,
            );
            let mut output_ct = GlweCiphertext::new(&params);
            blind_rotation(&mut output_ct, &ggsw_index, &ct, &params, &radix);
            let output_msg = sk.decrypt_decode_glwe(&output_ct, &params, plaintext_bits);

            // Make sure the zero point is rotated the correct amount.
            assert_eq!(output_msg.coeffs()[(degree - rotation) % degree], 0);

            // Make sure we have moved the element in the rotation position to the zero position.
            assert_eq!(output_msg.coeffs()[0], msg_coeffs[rotation]);

            assert_eq!(
                &output_msg, &expected,
                "CT encrypted message: {:?}, expected message: {:?}",
                &output_msg, &expected
            );
        }
    }
}
