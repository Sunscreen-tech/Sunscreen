use crate::{
    dst::FromMutSlice,
    entities::{
        GgswCiphertextRef, GlweCiphertext, GlweCiphertextRef, LweCiphertextRef, PolynomialRef,
    },
    ops::ciphertext::decomposed_polynomial_glev_mad,
    polynomial::{
        polynomial_add, polynomial_external_mad, polynomial_negate, polynomial_scalar_mad,
        polynomial_sub,
    },
    radix::PolynomialRadixIterator,
    scratch::allocate_scratch_ref,
    GlweDef, RadixDecomposition, TorusOps,
};

/**
 * Extract a specific coefficient in a message M in a GLWE ciphertext as a LWE
 * ciphertext under the LWE extracted secret key (extracted from the GLWE secret
 * key).
 *
 * # Arguments
 *
 * * `output` - The output LWE ciphertext
 * * `glwe` - The input GLWE ciphertext
 * * `h` - The index of the coefficient to extract
 *
 * # Remarks
 * For a GLWE ciphertext of size k and dimension N, the output LWE ciphertext
 * passed in must have size k*N.
 */
pub fn sample_extract<S>(
    output: &mut LweCiphertextRef<S>,
    glwe: &GlweCiphertextRef<S>,
    h: usize,
    params: &GlweDef,
) where
    S: TorusOps,
{
    // We are copying parts of the GLWE ciphertext out according to the following rule:
    // a_{N*i + j} =  a_{i, h - j} for 0 <= i < k, 0 <= j <= h
    // a_{N*i + j} = -a_{i, h - j + n} for 0 <= i < k, n + 1 <= j < N
    // b = b_n

    #[allow(non_snake_case)]
    let N = params.dim.polynomial_degree.0;
    let k = params.dim.size.0;

    let lwe_size = k * N;

    let (a_lwe, b_lwe) = output.a_b_mut(&params.as_lwe_def());

    // Make sure that the correctly sized LWE was passed in.
    assert_eq!(lwe_size, a_lwe.len());

    let (a_glwe, b_glwe) = glwe.a_b(params);

    for (i, a_gwe_i) in a_glwe.enumerate() {
        #[allow(non_snake_case)]
        let Ni = N * i;
        let a_glwe_i_coeffs = a_gwe_i.coeffs();

        for j in 0..=h {
            a_lwe[Ni + j] = a_glwe_i_coeffs[h - j];
        }

        for j in (h + 1)..N {
            // Note we add N to h first, otherwise h - j might underflow.
            a_lwe[Ni + j] = num::traits::WrappingNeg::wrapping_neg(&a_glwe_i_coeffs[h + N - j]);
        }
    }

    *b_lwe = b_glwe.coeffs()[h];
}

/// Add two GLWE ciphertexts together, storing the result in `c`.
pub fn add_glwe_ciphertexts<S>(
    c: &mut GlweCiphertextRef<S>,
    a: &GlweCiphertextRef<S>,
    b: &GlweCiphertextRef<S>,
    params: &GlweDef,
) where
    S: TorusOps,
{
    let (c_a, c_b) = c.a_b_mut(params);
    let (a_a, a_b) = a.a_b(params);
    let (b_a, b_b) = b.a_b(params);

    assert_eq!(c_a.len(), a_a.len());
    assert_eq!(c_a.len(), b_a.len());

    for (c, (a, b)) in c_a.zip(a_a.zip(b_a)) {
        polynomial_add(c, a, b);
    }

    polynomial_add(c_b, a_b, b_b);
}

/// Subtract two GLWE ciphertexts together, storing the result in `c`.
pub fn sub_glwe_ciphertexts<S>(
    c: &mut GlweCiphertextRef<S>,
    a: &GlweCiphertextRef<S>,
    b: &GlweCiphertextRef<S>,
    params: &GlweDef,
) where
    S: TorusOps,
{
    let (c_a, c_b) = c.a_b_mut(params);
    let (a_a, a_b) = a.a_b(params);
    let (b_a, b_b) = b.a_b(params);

    assert_eq!(c_a.len(), a_a.len());
    assert_eq!(c_a.len(), b_a.len());

    for (c, (a, b)) in c_a.zip(a_a.zip(b_a)) {
        polynomial_sub(c, a, b);
    }

    polynomial_sub(c_b, a_b, b_b);
}

/// Homomorphically compute -ct.
///
/// # Remarks
/// This operation is noiseless.
pub fn glwe_negate_inplace<S>(ct: &mut GlweCiphertextRef<S>, params: &GlweDef)
where
    S: TorusOps,
{
    for a in ct.a_mut(params) {
        polynomial_negate(a);
    }

    polynomial_negate(ct.b_mut(params));
}

/// Compute c += a \[*\] b where \[*\] is the external product between a GLWE
/// ciphertext and an polynomial in Z\[X\]/(X^N + 1).
///
/// # Remarks
/// For this to produce the correct result, degree(b) must be "small" (ideally
/// 0) and the coefficient must be small (i.e. less than the message size).
pub fn glwe_polynomial_mad<S>(
    c: &mut GlweCiphertextRef<S>,
    a: &GlweCiphertextRef<S>,
    b: &PolynomialRef<S>,
    params: &GlweDef,
) where
    S: TorusOps,
{
    let (c_a, c_b) = c.a_b_mut(params);
    let (a_a, a_b) = a.a_b(params);

    assert_eq!(c_a.len(), params.dim.size.0);
    assert_eq!(a_a.len(), params.dim.size.0);

    for (c, a) in c_a.zip(a_a) {
        polynomial_external_mad(c, a, b);
    }

    polynomial_external_mad(c_b, a_b, b);
}

/// Compute `c += a \[*\] b`` where
/// * `a` is a GLWE ciphertext
/// * `b` is a scalar
/// * `\[*\]` is the external product operator GLWE \[*\] Z -> GLWE
pub fn glwe_scalar_mad<S>(
    c: &mut GlweCiphertextRef<S>,
    a: &GlweCiphertextRef<S>,
    b: S,
    params: &GlweDef,
) where
    S: TorusOps,
{
    for (c, a) in c.a_mut(params).zip(a.a(params)) {
        polynomial_scalar_mad(c, a, b);
    }

    polynomial_scalar_mad(c.b_mut(params), a.b(params), b);
}

/// Compute `c += a \[*\] b`` where
/// * `a` is a GLWE ciphertext
/// * `b` is a GGSW cipheetext
/// * `\[*\]` is the external product operator GGSW \[*\] GLWE -> GLWE`
pub fn glwe_ggsw_mad<S>(
    c: &mut GlweCiphertextRef<S>,
    a: &GlweCiphertextRef<S>,
    b: &GgswCiphertextRef<S>,
    glwe_def: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    let (a_a, a_b) = a.a_b(glwe_def);
    let rows = b.rows(glwe_def, radix);

    // Generate an iterator that includes a_a and a_b
    let a_then_b_glwe_polynomials = a_a.chain(std::iter::once(a_b));

    allocate_scratch_ref!(scratch, PolynomialRef<S>, (glwe_def.dim.polynomial_degree));

    // Performs the external operation
    //
    //     GGSW ⊡ GLWE = sum_i=0^k <Decomp^{beta, l}(AB_i), C_i>
    //
    // where
    // * `beta` is the decomposition base
    // * `l` is the decomposition level
    // * `AB_i` is the i-th polynomial of the GLWE ciphertext with B at the end {A, B}
    // * `C_i` is the i-th row of the GGSW ciphertext
    for (a_i, r) in a_then_b_glwe_polynomials.zip(rows) {
        // For each a polynomial, compute the external product with the GLEV ciphertext
        // at index i in the GGSW ciphertext.
        let decomp = PolynomialRadixIterator::new(a_i, scratch, radix);

        decomposed_polynomial_glev_mad(c, decomp, r, glwe_def);
    }
}

/// Compute external product of a GLWE ciphertext and a GGSW ciphertext.
/// GGSW ⊡ GLWE -> GLWE
pub fn external_product_ggsw_glwe<S>(
    ggsw: &GgswCiphertextRef<S>,
    glwe: &GlweCiphertextRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
) -> GlweCiphertext<S>
where
    S: TorusOps,
{
    // Zero GLWE to sum over.
    let mut result = GlweCiphertext::new(params);
    glwe_ggsw_mad(&mut result, glwe, ggsw, params, radix);

    result
}

#[cfg(test)]
mod tests {
    use crate::{
        entities::{GgswCiphertext, LweCiphertext, Polynomial},
        high_level::*,
        high_level::{keygen, TEST_GLWE_DEF_1},
        ops::encryption::{
            decrypt_ggsw_ciphertext, encrypt_ggsw_ciphertext, encrypt_glwe_ciphertext_secret,
            trivially_encrypt_glwe_ciphertext,
        },
        polynomial::polynomial_mad,
        PlaintextBits, Torus,
    };

    use super::*;
    use rand::{thread_rng, RngCore};

    #[test]
    fn polynomial_iteration_mut() {
        let glwe = TEST_GLWE_DEF_1;

        let mut sk = keygen::generate_binary_glwe_sk(&glwe);

        assert_eq!(sk.s(&glwe).count(), glwe.dim.size.0);

        for s_i in sk.s_mut(&glwe) {
            assert_eq!(s_i.len(), glwe.dim.polynomial_degree.0);

            for s in s_i.coeffs() {
                assert!(*s == 0 || *s == 1);
            }
        }
    }

    #[test]
    fn can_add_glwe_ciphertexts() {
        let bits = PlaintextBits(4);
        let glwe = TEST_GLWE_DEF_1;

        let sk = keygen::generate_binary_glwe_sk(&glwe);

        let plaintext = Polynomial::new(
            &(0..glwe.dim.polynomial_degree.0 as u64)
                .map(|x| x % 4)
                .collect::<Vec<_>>(),
        );

        let a = sk.encode_encrypt_glwe(&plaintext, &glwe, bits);
        let b = sk.encode_encrypt_glwe(&plaintext, &glwe, bits);

        let c = a + b;

        let dec = sk.decrypt_decode_glwe(&c, &glwe, bits);

        for (i, c) in dec.coeffs().iter().enumerate() {
            assert_eq!(*c, 2 * (i as u64 % 4));
        }
    }

    #[test]
    fn can_sub_glwe_ciphertexts() {
        let glwe = TEST_GLWE_DEF_1;
        let bits = PlaintextBits(4);

        let sk = keygen::generate_binary_glwe_sk(&glwe);

        let plaintext = Polynomial::new(
            &(0..glwe.dim.polynomial_degree.0 as u64)
                .map(|x| x % 4)
                .collect::<Vec<_>>(),
        );

        let a = sk.encode_encrypt_glwe(&plaintext, &glwe, bits);
        let b = sk.encode_encrypt_glwe(&plaintext, &glwe, bits);

        let c = a - b;

        let dec = sk.decrypt_decode_glwe(&c, &glwe, bits);

        for c in dec.coeffs() {
            assert_eq!(*c, 0);
        }
    }

    #[test]
    fn can_internal_product_glwe_polynomial() {
        let bits = PlaintextBits(4);
        let glwe = TEST_GLWE_DEF_1;

        let sk = keygen::generate_binary_glwe_sk(&glwe);

        let large_poly = Polynomial::new(
            &(0..glwe.dim.polynomial_degree.0 as u64)
                .map(|x| x % 4)
                .collect::<Vec<_>>(),
        );
        let small_poly = Polynomial::new(
            &(0..glwe.dim.polynomial_degree.0 as u64)
                .map(|x| if x < 1 { 3 } else { 0 })
                .collect::<Vec<_>>(),
        );

        // Do the external product with an encryption of the large polynomial.
        let a = sk.encode_encrypt_glwe(&large_poly, &glwe, bits);
        let mut c = GlweCiphertext::new(&glwe);

        glwe_polynomial_mad(&mut c, &a, &small_poly, &glwe);

        let actual = sk.decrypt_decode_glwe(&c, &glwe, bits);

        let mut expected = Polynomial::<u64>::zero(glwe.dim.polynomial_degree.0);

        polynomial_mad(
            expected.as_wrapping_mut(),
            large_poly.as_wrapping(),
            small_poly.as_wrapping(),
        );

        assert_eq!(expected, actual);

        // Now do reverse the large and small polynomials' roles.
        let a = sk.encode_encrypt_glwe(&small_poly, &glwe, bits);
        let mut c = GlweCiphertext::new(&glwe);

        glwe_polynomial_mad(&mut c, &a, &large_poly, &glwe);

        let actual = sk.decrypt_decode_glwe(&c, &glwe, bits);

        assert_eq!(expected, actual);
    }

    #[test]
    fn can_external_product_ggsw_glwe() {
        let glwe = TEST_GLWE_DEF_1;
        let bits = PlaintextBits(4);
        let radix = TEST_RADIX;

        let sk = keygen::generate_binary_glwe_sk(&glwe);

        // Constant polynomial: [1, 0, 0, ...]
        let ggsw_plaintext_polynomial = Polynomial::new(
            &(0..glwe.dim.polynomial_degree.0 as u64)
                .map(|x| if x < 1 { 1 } else { 0 })
                .collect::<Vec<_>>(),
        );
        let ggsw_plaintext_polynomial_torus = ggsw_plaintext_polynomial.map(|x| Torus::from(*x));

        let mut ggsw_ct = GgswCiphertext::new(&glwe, &radix);
        encrypt_ggsw_ciphertext(
            &mut ggsw_ct,
            &ggsw_plaintext_polynomial,
            &sk,
            &glwe,
            &radix,
            bits,
        );

        let mut ggsw_decrypt = Polynomial::zero(glwe.dim.polynomial_degree.0);
        decrypt_ggsw_ciphertext(&mut ggsw_decrypt, &ggsw_ct, &sk, &glwe, &radix);
        assert_eq!(
            ggsw_decrypt, ggsw_plaintext_polynomial_torus,
            "GGSW decrypt does not match plaintext"
        );

        // [1, 2, ...]
        let glwe_plaintext_polynomial = Polynomial::new(
            &(0..glwe.dim.polynomial_degree.0 as u64)
                .map(|x| x % (1 << bits.0))
                .collect::<Vec<_>>(),
        );

        let glwe_plaintext_polynomial_encoded =
            glwe_plaintext_polynomial.map(|x| Torus::encode(*x, bits));

        // Do the external product with an encryption of the large polynomial.
        let mut glwe_ct = GlweCiphertext::new(&glwe);
        encrypt_glwe_ciphertext_secret(
            &mut glwe_ct,
            &glwe_plaintext_polynomial_encoded,
            &sk,
            &glwe,
        );

        let glwe_decrypt = sk.decrypt_decode_glwe(&glwe_ct, &glwe, bits);
        assert_eq!(
            glwe_decrypt, glwe_plaintext_polynomial,
            "GLWE decrypt does not match plaintext"
        );

        let encrypted_result = external_product_ggsw_glwe(&ggsw_ct, &glwe_ct, &glwe, &radix);
        let result = sk.decrypt_decode_glwe(&encrypted_result, &glwe, bits);

        // expected is the polynomial multiplication of
        // ggsw_plaintext_polynomial and glwe_plaintext_polynomial
        let mut expected = Polynomial::<u64>::zero(glwe.dim.polynomial_degree.0);

        polynomial_mad(
            expected.as_wrapping_mut(),
            ggsw_plaintext_polynomial.as_wrapping(),
            glwe_plaintext_polynomial.as_wrapping(),
        );

        // Reduce modulo 2^BITS
        let expected = expected.map(|x| x % (1 << bits.0));

        // Verify that the ciphertext multiplication is correct
        assert_eq!(
            result, expected,
            "External product does not match polynomial multiplication"
        );
    }

    #[test]
    fn can_add_glwe_with_trivial_glwe() {
        let glwe = TEST_GLWE_DEF_1;
        let bits = PlaintextBits(4);

        let sk = keygen::generate_binary_glwe_sk(&glwe);

        let delta = 1u64 << (64 - bits.0);

        let large_poly = Polynomial::new(
            &(0..glwe.dim.polynomial_degree.0 as u64)
                .map(|x| x % 4)
                .collect::<Vec<_>>(),
        );
        let small_poly = Polynomial::new(
            &(0..glwe.dim.polynomial_degree.0 as u64)
                .map(|x| if x < 1 { 3 } else { 0 })
                .collect::<Vec<_>>(),
        );
        let small_poly_scaled = small_poly.map(|x| Torus::from(x * delta));

        let a = sk.encode_encrypt_glwe(&large_poly, &glwe, bits);

        let mut b = GlweCiphertext::new(&glwe);
        trivially_encrypt_glwe_ciphertext(&mut b, &small_poly_scaled, &glwe);

        let c = a.as_ref() + b.as_ref();

        let actual = sk.decrypt_decode_glwe(&c, &glwe, bits);
        let expected = small_poly + large_poly;

        assert_eq!(expected, actual);

        let c2 = b.as_ref() + a.as_ref();

        let actual = sk.decrypt_decode_glwe(&c2, &glwe, bits);
        assert_eq!(expected, actual);
    }

    #[test]
    fn test_sample_extract() {
        let bits = PlaintextBits(2);
        let glwe_params = TEST_GLWE_DEF_1;
        let lwe_params = glwe_params.as_lwe_def();

        let sk = keygen::generate_binary_glwe_sk(&glwe_params);
        let extracted_lwe_sk = sk.to_lwe_secret_key();

        let large_poly = Polynomial::new(
            &(0..glwe_params.dim.polynomial_degree.0 as u64)
                .map(|x| x % 4)
                .collect::<Vec<_>>(),
        );

        let glwe = sk.encode_encrypt_glwe(&large_poly, &glwe_params, bits);

        for h in 0..glwe_params.dim.polynomial_degree.0 {
            let mut lwe = LweCiphertext::new(&lwe_params);
            sample_extract(&mut lwe, &glwe, h, &glwe_params);

            let lwe_msg = extracted_lwe_sk.decrypt(&lwe, &lwe_params, bits);

            let expected = large_poly.coeffs()[h];

            assert_eq!(expected, lwe_msg);
        }
    }

    #[test]
    fn can_glwe_scalar_mad() {
        for _ in 0..20 {
            let sk = keygen::generate_binary_glwe_sk(&TEST_GLWE_DEF_1);

            let plaintext_bits = (thread_rng().next_u64()) % 8 + 1;
            let plaintext_bits = PlaintextBits(plaintext_bits as u32);

            let scalar = thread_rng().next_u64() % 64;

            let pt = (0..TEST_GLWE_DEF_1.dim.polynomial_degree.0)
                .map(|_| thread_rng().next_u64() % plaintext_bits.0 as u64)
                .collect::<Vec<_>>();
            let pt = Polynomial::new(&pt);

            let ct = sk.encode_encrypt_glwe(&pt, &TEST_GLWE_DEF_1, plaintext_bits);

            let mut result = GlweCiphertext::new(&TEST_GLWE_DEF_1);

            glwe_scalar_mad(&mut result, &ct, scalar, &TEST_GLWE_DEF_1);

            let actual = sk.decrypt_decode_glwe(&result, &TEST_GLWE_DEF_1, plaintext_bits);

            for (pt, actual) in pt.coeffs().iter().zip(actual.coeffs()) {
                let expected = pt.wrapping_mul(scalar) % (0x1u64 << plaintext_bits.0);

                assert_eq!(expected, *actual);
            }
        }
    }
}
