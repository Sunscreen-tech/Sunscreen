use num::Complex;

use crate::{
    dst::{FromMutSlice, OverlaySize},
    entities::{
        GgswCiphertextFftRef, GlevCiphertextFftRef, GlevCiphertextRef, GlweCiphertextFftRef,
        GlweCiphertextRef, PolynomialFftRef, PolynomialRef, SchemeSwitchKeyFftRef,
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
/// This function is also known as the gadget product.
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
///
/// # Remarks
/// This implementation actually homomorphically to make some internal computations
/// more efficient.
///
/// ```text
/// c += cmux(d_0, d_1, b_fft);
/// ```
///
/// Unless you want this behavior, you should first call `c.clear()`, use a freshly
/// allocated `c`, or use [crate::high_level::evaluation::cmux].
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
    params.assert_valid();
    radix.assert_valid::<S>();
    c.assert_valid(params);
    d_0.assert_valid(params);
    d_1.assert_valid(params);
    b_fft.assert_valid(params, radix);

    allocate_scratch_ref!(diff, GlweCiphertextRef<S>, (params.dim));

    sub_glwe_ciphertexts(diff, d_1, d_0, params);

    allocate_scratch_ref!(prod_fft, GlweCiphertextFftRef<Complex<f64>>, (params.dim));

    prod_fft.clear();

    glwe_ggsw_mad(prod_fft, diff, b_fft, params, radix);

    allocate_scratch_ref!(prod, GlweCiphertextRef<S>, (params.dim));

    prod_fft.ifft(prod, params);

    add_glwe_ciphertexts(c, prod, d_0, params);
}

/// Compute a cmux between [`GlevCiphertext`](crate::entities::GlevCiphertext)s `d_0`,
/// `d_1`, and select bit `b_fft`.
///
/// # Remarks
/// A glev_cmux simply computes a cmux over each of the constituent GLWE ciphertexts within
/// the
///
/// `ggsw_radix` describes the [`RadixDecomposition`] of the `b_fft`
/// [`GgswCiphertextFft`](crate::entities::GgswCiphertextFft), ciphertext, not the GLEV
/// decomposition.
///
/// # Remarks
/// This implementation actually homomorphically to make some internal computations
/// more efficient.
///
/// ```text
/// c += cmux(d_0, d_1, b_fft);
/// ```
///
/// Unless you want this behavior, you should first call `c.clear()`, use a freshly
/// allocated `c`, or use [crate::high_level::evaluation::glev_cmux].
pub fn glev_cmux<S>(
    c: &mut GlevCiphertextRef<S>,
    d_0: &GlevCiphertextRef<S>,
    d_1: &GlevCiphertextRef<S>,
    b_fft: &GgswCiphertextFftRef<Complex<f64>>,
    params: &GlweDef,
    ggsw_radix: &RadixDecomposition,
) where
    S: TorusOps,
{
    for ((c, d_0), d_1) in c
        .glwe_ciphertexts_mut(params)
        .zip(d_0.glwe_ciphertexts(params))
        .zip(d_1.glwe_ciphertexts(params))
    {
        cmux(c, d_0, d_1, b_fft, params, ggsw_radix);
    }
}

/// This is the same as `generate_encrypted_secret_key_component` but it assumes
/// that all the positions where the index is not being written are already
/// zeroed out.
fn update_encrypted_secret_key_component_fft<S>(
    output: &mut GlweCiphertextFftRef<Complex<f64>>,
    glwe_ciphertext: &GlweCiphertextRef<S>,
    index: usize,
    params: &GlweDef,
) where
    S: TorusOps,
{
    assert!(
        index < params.dim.size.0,
        "update_encrypted_secret_key_component: index out of bounds"
    );

    let b = glwe_ciphertext.b(params);

    b.fft(output.a_mut(params).nth(index).unwrap());
}

/// The operation that happens on each GLWE ciphertext during
/// scheme switching.
fn scheme_switch_glwe_operation<S>(
    j: usize,
    k: usize,
    y_i_j: &mut GlweCiphertextFftRef<Complex<f64>>,
    x_i: &GlweCiphertextRef<S>,
    ssk_fft: &SchemeSwitchKeyFftRef<Complex<f64>>,
    params: &GlweDef,
    radix_ss: &RadixDecomposition,
) where
    S: TorusOps,
{
    // Skip complex processing for the last row, just do FFT
    if j == k {
        x_i.fft(y_i_j, params);
        return;
    }

    // Thread-local scratch space
    allocate_scratch_ref!(scratch, PolynomialRef<S>, (params.dim.polynomial_degree));

    let a_i = x_i.a(params);

    // Generate encrypted secret key component for this specific GLWE
    update_encrypted_secret_key_component_fft(y_i_j, x_i, j, params);

    // Process each polynomial in the mask
    for (r, a_i_r) in a_i.enumerate() {
        let decomp = PolynomialRadixIterator::new(a_i_r, scratch, radix_ss);

        // Get the corresponding GLev from the scheme switching key
        let ssk_fft_glev = ssk_fft.get_glev_at_index(j, r, params, radix_ss);

        decomposed_polynomial_glev_mad(y_i_j, decomp, ssk_fft_glev, params);
    }
}

/// Converts a GLev ciphertext into a GGSW ciphertext in the FFT domain using a
/// scheme switching key.
///
/// # Arguments
///
/// * `output` - The GGSW FFT ciphertext to store the result
/// * `glev_ciphertext` - The input GLev ciphertext to convert, encrypted under
///   the GGSW radix parameters
/// * `ssk_fft` - The scheme switching key in FFT domain used for conversion, encrypted under the
///   scheme switch radix parameters
/// * `params` - GLWE parameters defining dimensions and sizes
/// * `radix_ggsw` - Radix decomposition parameters for GGSW operations
/// * `radix_ss` - Radix decomposition parameters for scheme switching
/// * `method` - Whether to compute the scheme switch in parallel or sequentially
///
/// # Example
///
/// ```rust
/// use sunscreen_tfhe::{
///     entities::{
///         GgswCiphertext, GgswCiphertextFft, GlevCiphertext, GlweSecretKey,
///         Polynomial, SchemeSwitchKey, SchemeSwitchKeyFft,
///     },
///     ops::{
///         bootstrapping::{generate_scheme_switch_key},
///         encryption::encrypt_secret_glev_ciphertext,
///         fft_ops::scheme_switch_fft,
///     },
///     GlweDef, GlweDimension, GlweSize, PolynomialDegree, rand::Stddev,
///     RadixDecomposition, RadixCount, RadixLog,
///     Torus,
/// };
///
/// // Setup parameters. These are example values, and are not secure.
/// let params = GlweDef {
///     dim: GlweDimension {
///         polynomial_degree: PolynomialDegree(256),
///         size: GlweSize(3),
///     },
///     std: Stddev(1e-16),
/// };
/// let radix_ggsw = RadixDecomposition {
///     count: RadixCount(6),
///     radix_log: RadixLog(4),
/// };
/// let radix_ss = RadixDecomposition {
///     count: RadixCount(8),
///     radix_log: RadixLog(7),
/// };
///
/// let polynomial_degree = params.dim.polynomial_degree.0;
///
/// // Create message polynomial (encrypting 1)
/// let mut m_coeffs = vec![Torus::from(0u64); polynomial_degree];
/// m_coeffs[0] = Torus::from(1u64);
/// let m = Polynomial::new(&m_coeffs);
///
/// // Generate keys
/// let sk = GlweSecretKey::generate_binary(&params);
/// let mut ssk = SchemeSwitchKey::new(&params, &radix_ss);
/// generate_scheme_switch_key(&mut ssk, &sk, &params, &radix_ss);
///
/// // Convert scheme switch key to FFT domain
/// let mut ssk_fft = SchemeSwitchKeyFft::new(&params, &radix_ss);
/// ssk.fft(&mut ssk_fft, &params, &radix_ss);
///
/// // Encrypt message as GLev
/// let mut glev = GlevCiphertext::new(&params, &radix_ggsw);
/// encrypt_secret_glev_ciphertext(&mut glev, &m, &sk, &params, &radix_ggsw);
///
/// // Convert to GGSW in FFT domain
/// let mut ggsw_fft = GgswCiphertextFft::new(&params, &radix_ggsw);
/// scheme_switch_fft(&mut ggsw_fft, &glev, &ssk_fft, &params, &radix_ggsw, &radix_ss);
/// ```
///
/// # See Also
///
/// * [`generate_scheme_switch_key`](crate::ops::bootstrapping::generate_scheme_switch_key)
/// * [`scheme_switch`](crate::ops::bootstrapping::scheme_switch)
///
/// # Notes
///
/// ## Mathematical Background
///
/// The scheme switching process relies on a key observation about GLWE ciphertexts:
///
/// Given a GLWE ciphertext $(\vec{a}, b)$ encrypting message $m$, we can construct a special
/// ciphertext $t_p(b)=((0, ..., b, ... 0), 0)$ where $b$ is placed at position $p$. When
/// decrypted under key $\vec{s}$, this yields:
///
/// $$ m = - b \cdot s_p $$
///
/// where s_p is the p'th polynomial in the secret key.
///
/// For the scheme switch itself, given a GLev encryption $x=\mathsf{GLev}(m)$ with components
/// $x_i=\mathsf{GLWE}(\frac{q}{\beta^{i+1}}m)=(\vec{a}^{(i)}, b^{(i)})$, we compute for each
/// $i \in [0, \ell_{ggsw}), j \in [0, k)$:
///
/// $$ y_{i,j} = t_j(b^{(i)}) + \sum_{r=0}^{k-1} a^{(i)}_r \odot \mathsf{GLev}_{\vec{s}}(s_j \cdot s_r) $$
///
/// Combining all the $y_{i,j}$ GLWE encryptions over index i into a single GLev
/// ciphertext results in a GLWE encryption of $m \cdot s_j$ under the secret
/// key $\vec{s}$.
///
/// $$ z_j = \mathsf{GLev}_{\vec{s}}(m \cdot s_j) = (y_{0,j}, y_{1,j}, ..., y_{\ell_{ggsw}-1,j}) $$
///
/// Combining all the $z_j$ GLev encryptions into a single GGSW ciphertext
/// results in a GGSW encryption of m.
///
/// $$ \mathsf{GGSW}_{\vec{s}}(m)=(z_0, z_1, ..., z_{k-1}, x) $$
///
/// The FFT version performs these operations in the frequency domain for improved performance.
///
/// # References
///
/// This specific scheme switching process is based on the following paper but
/// modified to support GGSW ciphertexts instead of just RGSW:
///
/// Wang, R., Wen, Y., Li, Z., Lu, X., Wei, B., Liu, K., & Wang, K. (2024, May).
/// Circuit bootstrapping: faster and smaller. In Annual International
/// Conference on the Theory and Applications of Cryptographic Techniques (pp.
/// 342-372). Cham: Springer Nature Switzerland.
pub fn scheme_switch_fft<S>(
    output: &mut GgswCiphertextFftRef<Complex<f64>>,
    glev_ciphertext: &GlevCiphertextRef<S>,
    ssk_fft: &SchemeSwitchKeyFftRef<Complex<f64>>,
    params: &GlweDef,
    radix_ggsw: &RadixDecomposition,
    radix_ss: &RadixDecomposition,
) where
    S: TorusOps,
{
    ssk_fft.assert_valid(params, radix_ss);
    output.assert_valid(params, radix_ggsw);
    glev_ciphertext.assert_valid(params, radix_ggsw);

    let k = params.dim.size.0;

    // Create iterator for all GLWEs across all rows
    let glwe_operations: Vec<_> = output
        .rows_mut(params, radix_ggsw)
        .enumerate()
        .flat_map(|(j, output_glev_fft)| {
            output_glev_fft
                .glwe_ciphertexts_mut(params)
                .zip(glev_ciphertext.glwe_ciphertexts(params))
                .map(move |(y_i_j, x_i)| (j, y_i_j, x_i))
        })
        .collect();

    // Process all GLWEs
    let f = |(j, y_i_j, x_i)| {
        scheme_switch_glwe_operation(j, k, y_i_j, x_i, ssk_fft, params, radix_ss);
    };

    // We attempted to increase performance by parallelizing the operation
    // across all GLWEs; however, only a small performance improvement was
    // observed when using large parameter sets that are not as used in
    // practice. For common parameters such as the GLWE level 1 parameters, the
    // parallel version was actually slower by 2.5x.
    glwe_operations.into_iter().for_each(f);
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use encryption::{decrypt_glwe, encrypt_glwe};
    use rand::{thread_rng, RngCore};

    use crate::{
        entities::{
            GgswCiphertext, GgswCiphertextFft, GlevCiphertext, GlweCiphertext, GlweCiphertextFft,
            GlweSecretKey, Polynomial, SchemeSwitchKey, SchemeSwitchKeyFft,
        },
        high_level::{self, *},
        ops::{
            bootstrapping::{generate_scheme_switch_key, scheme_switch},
            encryption::{
                decrypt_ggsw_ciphertext, decrypt_glev_ciphertext, encrypt_secret_glev_ciphertext,
                scale_msg_by_gadget_factor,
            },
        },
        polynomial::polynomial_external_mad,
        PlaintextBits, RadixCount, RadixLog, Torus, GLWE_1_1024_80,
    };

    use super::*;

    // CMUX_5 parameters from the paper
    const RADIX_SS: RadixDecomposition = RadixDecomposition {
        count: RadixCount(2),
        radix_log: RadixLog(19),
    };

    const RADIX_GGSW: RadixDecomposition = RadixDecomposition {
        count: RadixCount(2),
        radix_log: RadixLog(8),
    };

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

    #[test]
    fn scheme_switch_fft_matches_non_fft() {
        let params = TEST_GLWE_DEF_2;
        let polynomial_degree = params.dim.polynomial_degree.0;

        // Create message polynomial (encrypting 1)
        let mut m_coeffs = vec![Torus::from(0u64); polynomial_degree];
        m_coeffs[0] = Torus::from(1u64);
        let m = Polynomial::new(&m_coeffs);

        // Generate keys
        let sk = GlweSecretKey::<u64>::generate_binary(&params);
        let mut ssk = SchemeSwitchKey::new(&params, &RADIX_SS);
        generate_scheme_switch_key(&mut ssk, &sk, &params, &RADIX_SS);

        let mut ssk_fft = SchemeSwitchKeyFft::new(&params, &RADIX_SS);
        ssk.fft(&mut ssk_fft, &params, &RADIX_SS);

        // Encrypt message as GLev
        let mut glev = GlevCiphertext::new(&params, &RADIX_GGSW);
        encrypt_secret_glev_ciphertext(&mut glev, &m, &sk, &params, &RADIX_GGSW);

        // Perform regular scheme switch
        let mut ggsw = GgswCiphertext::new(&params, &RADIX_GGSW);
        scheme_switch(&mut ggsw, &glev, &ssk, &params, &RADIX_GGSW, &RADIX_SS);

        // Perform FFT scheme switch
        let mut ggsw_fft = GgswCiphertextFft::new(&params, &RADIX_GGSW);
        let mut ggsw_from_fft = GgswCiphertext::new(&params, &RADIX_GGSW);

        scheme_switch_fft(
            &mut ggsw_fft,
            &glev,
            &ssk_fft,
            &params,
            &RADIX_GGSW,
            &RADIX_SS,
        );
        ggsw_fft.ifft(&mut ggsw_from_fft, &params, &RADIX_GGSW);

        // Decrypt both results
        let mut decrypted_regular = Polynomial::zero(polynomial_degree);
        let mut decrypted_fft = Polynomial::zero(polynomial_degree);

        decrypt_ggsw_ciphertext(&mut decrypted_regular, &ggsw, &sk, &params, &RADIX_GGSW);
        decrypt_ggsw_ciphertext(
            &mut decrypted_fft,
            &ggsw_from_fft,
            &sk,
            &params,
            &RADIX_GGSW,
        );

        assert_eq!(decrypted_regular, decrypted_fft);
    }

    fn _scheme_switch_fft_correct_message(message: u64) -> Duration {
        let params = GLWE_1_1024_80;
        let polynomial_degree = params.dim.polynomial_degree.0;

        // Create the message polynomial
        let mut m_coeffs = vec![Torus::from(0u64); polynomial_degree];
        m_coeffs[0] = Torus::from(message);
        let m = Polynomial::new(&m_coeffs);

        // Generate the keys
        let sk = GlweSecretKey::<u64>::generate_binary(&params);
        let mut ssk = SchemeSwitchKey::new(&params, &RADIX_SS);
        generate_scheme_switch_key(&mut ssk, &sk, &params, &RADIX_SS);

        let mut ssk_fft = SchemeSwitchKeyFft::new(&params, &RADIX_SS);
        ssk.fft(&mut ssk_fft, &params, &RADIX_SS);

        // Encrypt the message
        let mut glev_ciphertext = GlevCiphertext::new(&params, &RADIX_GGSW);
        encrypt_secret_glev_ciphertext(&mut glev_ciphertext, &m, &sk, &params, &RADIX_GGSW);

        // Perform the scheme switch with FFT
        let mut ggsw_fft = GgswCiphertextFft::new(&params, &RADIX_GGSW);
        let mut ggsw = GgswCiphertext::new(&params, &RADIX_GGSW);

        let now = std::time::Instant::now();
        scheme_switch_fft(
            &mut ggsw_fft,
            &glev_ciphertext,
            &ssk_fft,
            &params,
            &RADIX_GGSW,
            &RADIX_SS,
        );
        let elapsed = now.elapsed();

        ggsw_fft.ifft(&mut ggsw, &params, &RADIX_GGSW);

        let mut decrypted_ggsw = Polynomial::zero(polynomial_degree);
        decrypt_ggsw_ciphertext(&mut decrypted_ggsw, &ggsw, &sk, &params, &RADIX_GGSW);

        assert_eq!(
            m.coeffs(),
            decrypted_ggsw.coeffs(),
            "The decrypted message did not match the expected message."
        );

        // Check that all the GLev ciphertexts are correct
        for (i, (glev_component, sk_component)) in ggsw
            .rows(&params, &RADIX_GGSW)
            .zip(sk.s(&params))
            .enumerate()
        {
            let mut decrypted_glev_component = Polynomial::zero(polynomial_degree);
            decrypt_glev_ciphertext(
                &mut decrypted_glev_component,
                glev_component,
                &sk,
                &params,
                &RADIX_GGSW,
            );

            let mut expected = Polynomial::zero(polynomial_degree);

            // Need to negate here because we are using the opposite convention
            // for the encryption equation where b is negative.
            let neg_sk = sk_component.map(|x| x.wrapping_neg());
            polynomial_external_mad(&mut expected, &m, &neg_sk);

            let expected = expected.map(|x| Torus::from(x.inner() % (1 << RADIX_GGSW.radix_log.0)));

            assert_eq!(
                expected, decrypted_glev_component,
                "{} glev decryption failed",
                i
            );
        }

        elapsed
    }

    #[test]
    fn scheme_switch_fft_correct_message() {
        let n = 100;
        for _ in 0..n {
            let message = thread_rng().next_u64() % 2;
            _scheme_switch_fft_correct_message(message);
        }
    }

    fn _can_cmux_after_scheme_switch_fft(message: u64) {
        let params = TEST_GLWE_DEF_2;

        let polynomial_degree = params.dim.polynomial_degree.0;
        let plaintext_bits = PlaintextBits(1);

        // Create the message polynomial
        let mut m_coeffs = vec![Torus::from(0u64); polynomial_degree];
        m_coeffs[0] = Torus::from(message);
        let m = Polynomial::new(&m_coeffs);

        // Generate the keys
        let sk = GlweSecretKey::<u64>::generate_binary(&params);
        let mut ssk = SchemeSwitchKey::new(&params, &RADIX_SS);
        generate_scheme_switch_key(&mut ssk, &sk, &params, &RADIX_SS);

        let mut ssk_fft = SchemeSwitchKeyFft::new(&params, &RADIX_SS);
        ssk.fft(&mut ssk_fft, &params, &RADIX_SS);

        // Encrypt the message
        let mut glev_ciphertext = GlevCiphertext::new(&params, &RADIX_GGSW);
        encrypt_secret_glev_ciphertext(&mut glev_ciphertext, &m, &sk, &params, &RADIX_GGSW);

        // Convert to GGSW using FFT
        let mut ggsw_fft = GgswCiphertextFft::new(&params, &RADIX_GGSW);
        scheme_switch_fft(
            &mut ggsw_fft,
            &glev_ciphertext,
            &ssk_fft,
            &params,
            &RADIX_GGSW,
            &RADIX_SS,
        );

        // Generate the GLWE encryptions of 0 and 1
        let zero = Polynomial::zero(polynomial_degree);
        let mut one = Polynomial::zero(polynomial_degree);
        one.coeffs_mut()[0] = 1;

        let glwe_zero = encrypt_glwe(&zero, &sk, &params, plaintext_bits);
        let glwe_one = encrypt_glwe(&one, &sk, &params, plaintext_bits);

        // Perform the cmux operation
        let mut c = GlweCiphertext::new(&params);
        cmux(
            &mut c,
            &glwe_zero,
            &glwe_one,
            &ggsw_fft,
            &params,
            &RADIX_GGSW,
        );

        // Decrypt the result
        let c_decrypted = decrypt_glwe(&c, &sk, &params, plaintext_bits);

        let expected = if message == 0 { zero } else { one };
        assert_eq!(expected, c_decrypted);
    }

    #[test]
    fn can_cmux_after_scheme_switch_fft() {
        for _ in 0..10 {
            let message = thread_rng().next_u64() % 2;
            _can_cmux_after_scheme_switch_fft(message);
        }
    }

    #[test]
    fn can_glev_cmux() {
        let params = TEST_RLWE_DEF;
        let radix = TEST_RADIX;

        let sk = keygen::generate_binary_glwe_sk(&params);

        let zero = Polynomial::zero(params.dim.polynomial_degree.0);
        let zero_ct = high_level::encryption::trivial_binary_glev(&zero, &params, &radix);

        let mut one = Polynomial::zero(params.dim.polynomial_degree.0);
        zero.map_into(&mut one, |_| 1);
        let one_ct = high_level::encryption::trivial_binary_glev(&one, &params, &radix);

        for _ in 0..100 {
            let sel_0 =
                high_level::encryption::encrypt_ggsw(0, &sk, &params, &radix, PlaintextBits(1));
            let sel_0 = high_level::fft::fft_ggsw(&sel_0, &params, &radix);

            let sel_1 =
                high_level::encryption::encrypt_ggsw(1, &sk, &params, &radix, PlaintextBits(1));
            let sel_1 = high_level::fft::fft_ggsw(&sel_1, &params, &radix);

            let mut result = GlevCiphertext::new(&params, &radix);

            glev_cmux(&mut result, &zero_ct, &one_ct, &sel_0, &params, &radix);

            for glwe in result.glwe_ciphertexts(&params) {
                let actual =
                    high_level::encryption::decrypt_glwe(glwe, &sk, &params, PlaintextBits(1));

                assert_eq!(actual, zero);
            }

            glev_cmux(&mut result, &zero_ct, &one_ct, &sel_1, &params, &radix);

            for (i, glwe) in result.glwe_ciphertexts(&params).enumerate() {
                // The i'th decomposition factor requires (i + 1) * radix_log.0 bits of
                // message space.
                let pt_bits = PlaintextBits(((i + 1) * radix.radix_log.0) as u32);
                let actual = high_level::encryption::decrypt_glwe(&glwe, &sk, &params, pt_bits);

                let mut scaled = Polynomial::zero(params.dim.polynomial_degree.0);

                // Compute 1 / beta^(i + 1). This will be shifted into the MSBs, so we
                // need to decode this message before we can compare
                scale_msg_by_gadget_factor(&mut scaled, &one.as_torus(), radix.radix_log.0, i);

                // Decode expected msg. No need to round because we didn't encrypt it
                // hence no noise.
                let expected = scaled.map(|x| x.inner() >> (u64::BITS - pt_bits.0));

                assert_eq!(actual, expected);
            }
        }
    }
}
