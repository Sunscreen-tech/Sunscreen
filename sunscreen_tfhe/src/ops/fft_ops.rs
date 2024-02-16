use num::Complex;

use crate::{
    dst::{FromMutSlice, OverlaySize},
    entities::{
        GgswCiphertextFftRef, GlevCiphertextFftRef, GlweCiphertextFftRef, GlweCiphertextRef,
        PolynomialFftRef, PolynomialRef,
    },
    ops::ciphertext::{add_glwe_ciphertexts, sub_glwe_ciphertexts},
    radix::PolynomialRadixIterator,
    scratch::{allocate_scratch, allocate_scratch_ref},
    GlweDef, RadixDecomposition, TorusOps,
};

/// Compute `c += a \[*] b`` where
/// * `a` is a GLWE ciphertext
/// * `b` is a GGSW cipheetext
/// * `\[*\]` is the external product operator GGSW \[*\] GLWE -> GLWE`
pub fn glwe_ggsw_mad<S>(
    c_fft: &mut GlweCiphertextFftRef<Complex<f64>>,
    a: &GlweCiphertextRef<S>,
    b_fft: &GgswCiphertextFftRef<Complex<f64>>,
    params: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    let (a_a, a_b) = a.a_b(params);
    let rows = b_fft.rows(params, radix);

    // Generate an iterator that includes a_a and a_b
    let a_then_b_glwe_polynomials = a_a.chain(std::iter::once(a_b));

    allocate_scratch_ref!(scratch, PolynomialRef<S>, (params.dim.polynomial_degree));

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

        decomposed_polynomial_glev_mad(c_fft, decomp, r, params);
    }
}

/// Compute `c += (G^-1 * a) \[*\] b`, where
/// * `G^-1 * a`` is the radix decomposition of `a`
/// * `b` is a GLEV ciphertext.
/// * `c` is a GLWE ciphertext.
/// * \[*\] is the external product between a GLEV ciphertext and `l` polynomials
///
/// # Remarks
/// This functions takes a PolynomialRadixIterator to perform the decomposition.
pub fn decomposed_polynomial_glev_mad<S>(
    c: &mut GlweCiphertextFftRef<Complex<f64>>,
    mut a: PolynomialRadixIterator<S>,
    b: &GlevCiphertextFftRef<Complex<f64>>,
    params: &GlweDef,
) where
    S: TorusOps,
{
    let b_glwe = b.glwe_ciphertexts(params);

    let mut cur_radix = allocate_scratch::<S>(params.dim.polynomial_degree.0);
    let cur_radix = PolynomialRef::from_mut_slice(cur_radix.as_mut_slice());

    let mut decomp_fft = allocate_scratch(PolynomialFftRef::<Complex<f64>>::size(
        params.dim.polynomial_degree,
    ));
    let decomp_fft = PolynomialFftRef::from_mut_slice(decomp_fft.as_mut_slice());

    // The decomposition of
    //     <Decomp^{beta, l}(gamma), GLEV>
    // can be performed using
    //     sum_{j = 1}^l gamma_j * C_j
    // where gamma_j is the polynomial to decompose multiplied by q/B^{j+1}
    // Note the reverse of the GLWE ciphertexts here! The decomposition iterator
    // returns the decomposed values in the opposite order.
    for b in b_glwe.rev() {
        a.write_next(cur_radix);
        cur_radix.fft(decomp_fft);

        glwe_polynomial_mad(c, b, decomp_fft, params);
    }
}

/// Compute c += a \[*\] b where \[*\] is the external product
/// between a GLWE ciphertext and an polynomial in Z\[X\]/(X^N + 1).
///
/// # Remarks
/// For this to produce the correct result, degree(b) must be "small"
/// (ideally 0) and the coefficient must be small (i.e. less than the
/// message size).
pub fn glwe_polynomial_mad(
    c: &mut GlweCiphertextFftRef<Complex<f64>>,
    a: &GlweCiphertextFftRef<Complex<f64>>,
    b: &PolynomialFftRef<Complex<f64>>,
    params: &GlweDef,
) {
    let (c_a, c_b) = c.a_b_mut(params);
    let (a_a, a_b) = a.a_b(params);

    assert_eq!(c_a.len(), params.dim.size.0);
    assert_eq!(a_a.len(), params.dim.size.0);

    for (c, a) in c_a.zip(a_a) {
        c.multiply_add(a, b);
    }

    c_b.multiply_add(a_b, b);
}

/// Performs a CMUX operation, which enables one of two GLWE ciphertexts
/// to be selected from an encrypted boolean GGSW ciphertext. The result
/// is stored in `c`.
///
/// Conceptually, this can be seen as the following operation in Rust:
///
/// ```text
/// let c = if b_fft { d_1 } else { d_0 }
/// ```
///
/// where the output `c` is a different encryption than either of the initial
/// inputs.  Note that this will result in higher noise than in the original
/// ciphertexts.
pub fn cmux<S>(
    c: &mut GlweCiphertextRef<S>,
    d_0: &GlweCiphertextRef<S>,
    d_1: &GlweCiphertextRef<S>,
    b_fft: &GgswCiphertextFftRef<Complex<f64>>,
    params: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    allocate_scratch_ref!(diff, GlweCiphertextRef<S>, (params.dim));

    sub_glwe_ciphertexts(diff, d_1, d_0, params);

    allocate_scratch_ref!(prod_fft, GlweCiphertextFftRef<Complex<f64>>, (params.dim));

    prod_fft.clear();

    glwe_ggsw_mad(prod_fft, diff, b_fft, params, radix);

    allocate_scratch_ref!(prod, GlweCiphertextRef<S>, (params.dim));

    prod_fft.ifft(prod, params);

    add_glwe_ciphertexts(c, prod, d_0, params);
}

#[cfg(test)]
mod tests {
    use rand::{thread_rng, RngCore};

    use crate::{
        entities::{GgswCiphertextFft, GlweCiphertext, GlweCiphertextFft, Polynomial},
        high_level::*,
        PlaintextBits, Torus,
    };

    use super::*;

    #[test]
    fn can_fft_external_product_glwe_ggsw() {
        let glwe_params = TEST_GLWE_DEF_1;
        let radix = TEST_RADIX;
        let bits = PlaintextBits(1);

        let sk = keygen::generate_binary_glwe_sk(&glwe_params);

        for _ in 0..100 {
            let sel = thread_rng().next_u64() % 2;

            let ggsw = encryption::encrypt_ggsw(sel, &sk, &glwe_params, &radix, bits);

            let glwe_pt = (0..glwe_params.dim.polynomial_degree.0)
                .map(|_| thread_rng().next_u64() % 2)
                .collect::<Vec<_>>();
            let glwe_pt = Polynomial::new(&glwe_pt);

            let glwe = encryption::encrypt_glwe(&glwe_pt, &sk, &glwe_params, bits);

            let mut ggsw_fft = GgswCiphertextFft::new(&glwe_params, &radix);
            let mut res_fft = GlweCiphertextFft::new(&glwe_params);
            let mut res = GlweCiphertext::<u64>::new(&glwe_params);

            ggsw.fft(&mut ggsw_fft, &glwe_params, &radix);

            glwe_ggsw_mad(&mut res_fft, &glwe, &ggsw_fft, &glwe_params, &radix);

            res_fft.ifft(&mut res, &glwe_params);

            let actual = encryption::decrypt_glwe(&res, &sk, &glwe_params, bits);

            if sel == 1 {
                assert_eq!(actual, glwe_pt);
            } else {
                assert_eq!(
                    actual,
                    Polynomial::zero(glwe_params.dim.polynomial_degree.0)
                );
            }
        }
    }

    #[test]
    fn can_cmux_fft() {
        let glwe = TEST_GLWE_DEF_1;
        let sk = keygen::generate_binary_glwe_sk(&glwe);
        let radix = TEST_RADIX;
        let bits = PlaintextBits(1);

        for _ in 0..100 {
            let sel = thread_rng().next_u64() % 2;

            let sel_ct = encryption::encrypt_ggsw(sel, &sk, &glwe, &radix, bits);

            let a = (0..glwe.dim.polynomial_degree.0)
                .map(|_| thread_rng().next_u64() % 2)
                .collect::<Vec<_>>();
            let a = Polynomial::new(&a);

            let a_ct = encryption::encrypt_glwe(&a, &sk, &glwe, bits);

            let b = (0..glwe.dim.polynomial_degree.0)
                .map(|_| thread_rng().next_u64() % 2)
                .collect::<Vec<_>>();
            let b = Polynomial::new(&b);

            let b_ct = encryption::encrypt_glwe(&b, &sk, &glwe, bits);

            let sel_fft = fft::fft_ggsw(&sel_ct, &glwe, &radix);

            let mut res_ct = GlweCiphertext::new(&glwe);

            cmux(&mut res_ct, &a_ct, &b_ct, &sel_fft, &glwe, &radix);

            let actual = encryption::decrypt_glwe(&res_ct, &sk, &glwe, bits);

            if sel == 1 {
                assert_eq!(actual, b);
            } else {
                assert_eq!(actual, a);
            }
        }
    }

    #[test]
    fn cmux_trivial_ciphertexts_yields_nontrivial() {
        let sk = keygen::generate_binary_glwe_sk(&TEST_GLWE_DEF_1);

        let plaintext_bits = crate::PlaintextBits(1);

        let a = (0..TEST_GLWE_DEF_1.dim.polynomial_degree.0 as u64)
            .map(|x| x % 2)
            .collect::<Polynomial<_>>();
        let a = encryption::trivial_glwe(&a, &TEST_GLWE_DEF_1, plaintext_bits);
        let b = (0..TEST_GLWE_DEF_1.dim.polynomial_degree.0 as u64)
            .map(|x| (x + 1) % 2)
            .collect::<Polynomial<_>>();
        let b = encryption::trivial_glwe(&b, &TEST_GLWE_DEF_1, plaintext_bits);

        let sel = encryption::encrypt_ggsw(1, &sk, &TEST_GLWE_DEF_1, &TEST_RADIX, plaintext_bits);

        let sel = fft::fft_ggsw(&sel, &TEST_GLWE_DEF_1, &TEST_RADIX);

        let res = evaluation::cmux(&sel, &a, &b, &TEST_GLWE_DEF_1, &TEST_RADIX);

        for a in res.a(&TEST_GLWE_DEF_1) {
            let zero = Polynomial::<Torus<u64>>::zero(TEST_GLWE_DEF_1.dim.polynomial_degree.0);

            assert_ne!(a.to_owned(), zero);
        }
    }
}
