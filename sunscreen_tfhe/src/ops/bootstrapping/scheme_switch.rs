use std::{
    num::Wrapping,
    ops::{Add, Mul, Sub},
};

use crate::{
    dst::{AsSlice, FromMutSlice},
    entities::{
        GgswCiphertextRef, GlevCiphertextRef, GlweCiphertextRef, GlweSecretKeyRef, Polynomial,
        PolynomialFft, PolynomialRef, SchemeSwitchKeyRef,
    },
    iteration::TriangularPairsExt,
    ops::{ciphertext::decomposed_polynomial_glev_mad, encryption::encrypt_secret_glev_ciphertext},
    radix::PolynomialRadixIterator,
    scratch::allocate_scratch_ref,
    GlweDef, RadixDecomposition, Torus, TorusOps,
};
use num::{Complex, Zero};

/// Generate a scheme switch key. This encrypts the secret key `sk` in a series
/// of GLev encryptions under that same key.
pub fn generate_scheme_switch_key<S>(
    scheme_switch_key: &mut SchemeSwitchKeyRef<S>,
    sk: &GlweSecretKeyRef<S>,
    params: &GlweDef,
    radix: &RadixDecomposition,
) where
    S: TorusOps,
    Wrapping<S>: Sub<Wrapping<S>, Output = Wrapping<S>>
        + Add<Wrapping<S>, Output = Wrapping<S>>
        + Mul<Wrapping<S>, Output = Wrapping<S>>,
{
    params.assert_valid();
    radix.assert_valid::<S>();

    scheme_switch_key.assert_valid(params, radix);
    sk.assert_valid(params);

    let polynomial_size = params.dim.polynomial_degree.0;

    let polynomial_pair_iterator = sk
        .s(params)
        .triangular_pairs()
        .zip(scheme_switch_key.glev_ciphertexts_mut(params, radix));

    polynomial_pair_iterator.for_each(|((s_i, s_j), glev_ciphertext)| {
        // Using the FFT is approximately 10x faster, it takes approximately 4
        // us to multiply two polynomials on an M2 Pro MBP of 256 dimension.
        let mut s_i_fft = PolynomialFft::new(&vec![Complex::zero(); polynomial_size / 2]);
        let mut s_j_fft = s_i_fft.clone();
        let mut s_i_j_fft = s_i_fft.clone();

        s_i.fft(&mut s_i_fft);
        s_j.fft(&mut s_j_fft);

        s_i_j_fft.multiply_add(&s_i_fft, &s_j_fft);

        let mut s_i_j = Polynomial::<S>::zero(polynomial_size);
        s_i_j_fft.ifft(&mut s_i_j);

        // Encrypt the secret key under itself
        encrypt_secret_glev_ciphertext(glev_ciphertext, s_i_j.as_torus(), sk, params, radix)
    });
}

/// Generate a GLWE encryption of (-b*s_i) by moving the body `b `into the mask `a `at
/// a specific index location. This is the same as an encryption of the secret
/// key times the body as the message. See the math below for more details.
///
/// This operation overwrites all the data in the output ciphertext, so the same
/// output polynomial can be reused.
///
/// # Math derivation
///
/// Suppose we have $(\vec{a}, b) = \mathsf{GLWE}(m)$. Construct trivial GLWE
/// ciphertext $t$ by placing $b$ in the $p$'th place in the basis coefficients
/// and 0 elsewhere $t_p(b)=((0, ..., b, ... 0), 0)$. Observe what happens if we
/// decrypt $t$ under any key $\vec{s}$:
///
/// $$
/// \begin{aligned*}
/// m = - (\sum_{i \ne p}^{[0, k)}0\cdot s_i + b \cdot s_p) - 0 \
/// = - b \cdot s_p
/// \end{aligned*}
/// $$
///
/// Note the negation in m is due to a different convention in the decryption
/// function for the scheme switching paper and our convention.
///
/// Since the error is 0 as well, we can elide the rounding step. Thus, $t$ is a
/// $\mathsf{GLWE}$ encryption of $m \cdot s_p$ under $\vec{s}$.
#[allow(unused)]
fn generate_encrypted_secret_key_component<S>(
    output: &mut GlweCiphertextRef<S>,
    glwe_ciphertext: &GlweCiphertextRef<S>,
    index: usize,
    params: &GlweDef,
) where
    S: TorusOps,
{
    assert!(
        index < params.dim.size.0,
        "generate_encrypted_secret_key_component: index out of bounds"
    );

    let b = glwe_ciphertext.b(params);

    output.zero_a_except_at_index(b, index, params);

    // Set the b of the output ciphertext to zero
    output
        .b_mut(params)
        .coeffs_mut()
        .fill(Torus::from(<S as num::Zero>::zero()));
}

/// This is the same as `generate_encrypted_secret_key_component` but it assumes
/// that all the positions where the index is not being written are already
/// zeroed out.
///
/// # See Also
///
/// * [`generate_encrypted_secret_key_component`](generate_encrypted_secret_key_component)
pub(crate) fn update_encrypted_secret_key_component<S>(
    output: &mut GlweCiphertextRef<S>,
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

    output.fill_a_at_index(b, index, params);
}

/// Converts a GLev ciphertext into a GGSW ciphertext using a scheme switching key.
///
/// # Arguments
///
/// * `output` - The GGSW ciphertext to store the result
/// * `glev_ciphertext` - The input GLev ciphertext to convert, encrypted under
///   the GGSW radix parameters
/// * `ssk` - The scheme switching key used for conversion, encrypted under the
///   scheme switch radix parameters
/// * `params` - GLWE parameters defining dimensions and sizes
/// * `radix_ggsw` - Radix decomposition parameters for GGSW operations
/// * `radix_ss` - Radix decomposition parameters for scheme switching
///
/// # Example
///
/// ```rust
/// use sunscreen_tfhe::{
///     entities::{
///         GgswCiphertext, GlevCiphertext, GlweSecretKey,
///         Polynomial,
///         SchemeSwitchKey,
///     },
///     ops::{
///         encryption::encrypt_secret_glev_ciphertext,
///         bootstrapping::{generate_scheme_switch_key, scheme_switch},
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
/// // Encrypt message as GLev
/// let mut glev = GlevCiphertext::new(&params, &radix_ggsw);
/// encrypt_secret_glev_ciphertext(&mut glev, &m, &sk, &params, &radix_ggsw);
///
/// // Convert to GGSW
/// let mut ggsw = GgswCiphertext::new(&params, &radix_ggsw);
/// scheme_switch(&mut ggsw, &glev, &ssk, &params, &radix_ggsw, &radix_ss);
/// ```
///
/// # See Also
///
/// * [`generate_scheme_switch_key`](crate::ops::bootstrapping::generate_scheme_switch_key)
/// * [`scheme_switch_fft`](crate::ops::fft_ops::scheme_switch_fft)
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
/// # References
///
/// This specific scheme switching process is based on the following paper but
/// modified to support GGSW ciphertexts instead of just RGSW:
///
/// Wang, R., Wen, Y., Li, Z., Lu, X., Wei, B., Liu, K., & Wang, K. (2024, May).
/// Circuit bootstrapping: faster and smaller. In Annual International
/// Conference on the Theory and Applications of Cryptographic Techniques (pp.
/// 342-372). Cham: Springer Nature Switzerland.
pub fn scheme_switch<S>(
    output: &mut GgswCiphertextRef<S>,
    glev_ciphertext: &GlevCiphertextRef<S>,
    ssk: &SchemeSwitchKeyRef<S>,
    params: &GlweDef,
    radix_ggsw: &RadixDecomposition,
    radix_ss: &RadixDecomposition,
) where
    S: TorusOps,
{
    ssk.assert_valid(params, radix_ss);
    output.assert_valid(params, radix_ggsw);
    glev_ciphertext.assert_valid(params, radix_ggsw);

    let k = params.dim.size.0;

    allocate_scratch_ref!(scratch, PolynomialRef<S>, (params.dim.polynomial_degree));
    allocate_scratch_ref!(encoded_b_i, GlweCiphertextRef<S>, (params.dim));

    // `encoded_b_i` needs to be cleared because we only update a single
    // polynomial in the GLWE mask at a time. `scratch` does not need to be
    // cleared because it is only used for temporary storage that is always
    // completely overwritten.
    encoded_b_i.clear();

    for (j, output_glev) in output.rows_mut(params, radix_ggsw).enumerate() {
        // The last element in the encryption is just the input itself.
        if j == k {
            output_glev.clone_from_ref(glev_ciphertext);
            continue;
        }

        // Instead of constantly allocating new ciphertexts, we can reuse the
        // same ciphertext and just update the components.
        let last_index = (j as isize - 1).rem_euclid(k as isize) as usize;
        encoded_b_i.zero_out_a_at_index(last_index, params);

        for (x_i, y_i_j) in glev_ciphertext
            .glwe_ciphertexts(params)
            .zip(output_glev.glwe_ciphertexts_mut(params))
        {
            let a_i = x_i.a(params);

            // An encryption of
            // ((..., b_i, ...), 0)
            // where the b_i is at the j-th position.
            update_encrypted_secret_key_component(encoded_b_i, x_i, j, params);

            // We can clone directly into y_i_j since this will overwrite it.
            y_i_j.clone_from_ref(encoded_b_i);

            // Assert that the ciphertexts are the same length
            assert_eq!(y_i_j.as_slice().len(), encoded_b_i.as_slice().len());

            for (r, a_i_r) in a_i.enumerate() {
                let decomp = PolynomialRadixIterator::new(a_i_r, scratch, radix_ss);

                decomposed_polynomial_glev_mad(
                    y_i_j,
                    decomp,
                    ssk.get_glev_at_index(j, r, params, radix_ss),
                    params,
                );
            }
        }
    }
}

#[cfg(test)]
mod tests {

    use rand::{thread_rng, RngCore};

    use crate::{
        entities::{
            GgswCiphertext, GlevCiphertext, GlweCiphertext, GlweSecretKey, SchemeSwitchKey,
        },
        high_level::{
            self,
            encryption::{decrypt_glwe, encrypt_glwe},
            TEST_GLWE_DEF_2, TEST_RADIX,
        },
        ops::{
            encryption::{
                decrypt_ggsw_ciphertext, decrypt_glev_ciphertext, decrypt_glwe_ciphertext,
            },
            fft_ops::cmux,
        },
        polynomial::{polynomial_external_mad, polynomial_mad_by_wrap},
        PlaintextBits, RadixCount, RadixLog, Torus,
    };

    use super::*;

    const RADIX_SS: RadixDecomposition = RadixDecomposition {
        count: RadixCount(8),
        radix_log: RadixLog(7),
    };

    const RADIX_GGSW: RadixDecomposition = RadixDecomposition {
        count: RadixCount(6),
        radix_log: RadixLog(4),
    };

    pub(crate) fn assert_encrypted_secret_key_component_correct_shape<S>(
        glwe: &GlweCiphertextRef<S>,
        b: &PolynomialRef<Torus<S>>,
        index: usize,
        params: &GlweDef,
    ) where
        S: TorusOps,
    {
        // Verify the output:
        // 1. The mask (a) should be zero everywhere except at index
        // 2. At index, it should contain the body of the input ciphertext
        // 3. The body (b) should be zero

        for (i, a_i) in glwe.a(params).enumerate() {
            if i == index {
                // At index, coefficients should match input body
                assert_eq!(
                    a_i.coeffs(),
                    b.coeffs(),
                    "Coefficients at index {} don't match input body",
                    index
                );
            } else {
                // All other positions should be zero
                assert!(
                    a_i.coeffs()
                        .iter()
                        .all(|x| *x == Torus::from(<S as num::Zero>::zero())),
                    "Non-zero coefficients found at index {} (should be all zero)",
                    i
                );
            }
        }

        // Verify body is zero
        assert!(
            glwe.b(params)
                .coeffs()
                .iter()
                .all(|x| *x == Torus::from(<S as num::Zero>::zero())),
            "Output body contains non-zero values"
        );
    }

    #[test]
    fn basic_scheme_switch_key_generation() {
        // Setup basic parameters
        let params = TEST_GLWE_DEF_2;
        let radix = TEST_RADIX;

        let glwe_size = params.dim.size.0;

        // Generate a secret key
        let sk = GlweSecretKey::<u64>::generate_binary(&params);

        // Create scheme switch key
        let mut ssk = SchemeSwitchKey::<u64>::new(&params, &radix);

        // Generate the scheme switch key
        generate_scheme_switch_key(&mut ssk, &sk, &params, &radix);

        // Basic validity checks
        ssk.assert_valid(&params, &radix);

        // Check dimensions
        let expected_glev_count = (glwe_size * (glwe_size + 1)) / 2;
        assert_eq!(
            ssk.glev_ciphertexts(&params, &radix).count(),
            expected_glev_count
        );

        // Check that the size of the glevs matches the size of the scheme switch key
        let ssk_len = ssk.as_slice().len();
        let mut glev_length = 0;

        for glev in ssk.glev_ciphertexts(&params, &radix) {
            glev_length += glev.as_slice().len();
        }

        assert_eq!(ssk_len, glev_length);

        // Check that the glevs are in the order we expect
        let indices = (0..glwe_size).collect::<Vec<_>>();
        let triangular_points = indices.iter().triangular_pairs().collect::<Vec<_>>();

        for ((i, j), glev) in triangular_points
            .into_iter()
            .zip(ssk.glev_ciphertexts(&params, &radix))
        {
            let glev_from_index = ssk.get_glev_at_index(*i, *j, &params, &radix);

            assert_eq!(glev.as_slice(), glev_from_index.as_slice());
        }
    }

    #[test]
    fn scheme_switch_key_glev_ciphertext_content() {
        let params = TEST_GLWE_DEF_2;
        let radix = TEST_RADIX;

        let sk = GlweSecretKey::<u64>::generate_binary(&params);

        let mut ssk = SchemeSwitchKey::<u64>::new(&params, &radix);

        generate_scheme_switch_key(&mut ssk, &sk, &params, &radix);

        let sk_componets = sk.s(&params).collect::<Vec<_>>();

        for (i, s_i) in sk_componets.iter().enumerate() {
            for (j, s_j) in sk_componets.iter().enumerate().skip(i) {
                let glev_ciphertext = ssk.get_glev_at_index(i, j, &params, &radix);
                let mut s_i_j = Polynomial::<u64>::zero(params.dim.polynomial_degree.0);
                polynomial_mad_by_wrap(&mut s_i_j, s_i, s_j);

                // Note the modulus here to ensure that the polynomial is within
                // the correct range
                let s_i_j = s_i_j.map(|x| x % (1 << (radix.radix_log.0)));

                let mut pt = Polynomial::<Torus<u64>>::zero(params.dim.polynomial_degree.0);

                decrypt_glev_ciphertext(&mut pt, glev_ciphertext, &sk, &params, &radix);

                assert_eq!(s_i_j.as_torus(), pt.as_ref());
            }
        }
    }

    #[test]
    fn scheme_switch_key_symmetric() {
        let params = TEST_GLWE_DEF_2;
        let radix = TEST_RADIX;

        let number_polynomials = params.dim.size.0;

        let sk = GlweSecretKey::<u64>::generate_binary(&params);

        let mut ssk = SchemeSwitchKey::<u64>::new(&params, &radix);

        generate_scheme_switch_key(&mut ssk, &sk, &params, &radix);

        let coordinates = (0..number_polynomials).collect::<Vec<_>>();

        for (i, j) in coordinates.iter().triangular_pairs() {
            assert_eq!(
                ssk.get_glev_at_index(*i, *j, &params, &radix).as_slice(),
                ssk.get_glev_at_index(*j, *i, &params, &radix).as_slice()
            );
        }
    }

    #[test]
    fn update_encrypted_secret_key_component_correct_shape() {
        let params = TEST_GLWE_DEF_2;

        // Create a test GLWE ciphertext with known values
        let mut input_glwe = GlweCiphertext::<u64>::new(&params);

        // Fill the body (b) with some test values
        for (i, coeff) in input_glwe
            .b_mut(&params)
            .coeffs_mut()
            .iter_mut()
            .enumerate()
        {
            *coeff = Torus::from((i as u64) % 2);
        }

        // Test generating encrypted secret key component at different indices
        for test_index in 0..params.dim.size.0 {
            // Create output ciphertext. We cannot write over it when using the
            // update function.
            let mut output_glwe = GlweCiphertext::<u64>::new(&params);

            // Generate the encrypted secret key component
            update_encrypted_secret_key_component(
                &mut output_glwe,
                &input_glwe,
                test_index,
                &params,
            );

            assert_encrypted_secret_key_component_correct_shape(
                &output_glwe,
                input_glwe.b(&params),
                test_index,
                &params,
            );
        }
    }

    #[test]
    fn equivalent_update_and_generate_encrypted_secret_key_component() {
        let params = TEST_GLWE_DEF_2;

        // Create a test GLWE ciphertext with known values
        let mut input_glwe = GlweCiphertext::<u64>::new(&params);

        // Fill the body (b) with some test values
        for (i, coeff) in input_glwe
            .b_mut(&params)
            .coeffs_mut()
            .iter_mut()
            .enumerate()
        {
            *coeff = Torus::from((i as u64) % 2);
        }

        let mut output_glwe = GlweCiphertext::<u64>::new(&params);
        let mut reused_glwe = GlweCiphertext::<u64>::new(&params);

        // Test generating encrypted secret key component at different indices
        for test_index in 0..params.dim.size.0 {
            // Create output ciphertext. We need to zero out the previous mask
            // while using the update function since it only edits the specific
            // mask element.
            if test_index > 0 {
                output_glwe.zero_out_a_at_index(test_index - 1, &params);
            }

            // Generate the encrypted secret key component
            update_encrypted_secret_key_component(
                &mut output_glwe,
                &input_glwe,
                test_index,
                &params,
            );

            generate_encrypted_secret_key_component(
                &mut reused_glwe,
                &input_glwe,
                test_index,
                &params,
            );

            for (output_a, reused_a) in output_glwe.a(&params).zip(reused_glwe.a(&params)) {
                assert_eq!(output_a.coeffs(), reused_a.coeffs());
            }

            assert_eq!(
                output_glwe.b(&params).coeffs(),
                reused_glwe.b(&params).coeffs()
            );
        }
    }

    #[test]
    fn generate_encrypted_secret_key_component_secret_key_m_is_correct() {
        // Setup basic parameters
        let params = TEST_GLWE_DEF_2;
        let polynomial_degree = params.dim.polynomial_degree.0;
        let number_polynomials = params.dim.size.0;
        let plaintext_bits = PlaintextBits(1);
        let modulus = 1 << plaintext_bits.0;

        // Shouldn't matter what this is since we are testing the relation that
        // the `generate_encrypted_secret_key_component` should result in a
        // message of m = b_i * s_i.
        let m_coeffs = (0..polynomial_degree)
            .map(|_| 1 % modulus)
            .collect::<Vec<_>>();
        let m = Polynomial::new(&m_coeffs);

        let sk = GlweSecretKey::<u64>::generate_binary(&params);

        let glwe_ciphertext = encrypt_glwe(&m, &sk, &params, plaintext_bits);

        let b = glwe_ciphertext.b(&params);
        let b_u64 = Polynomial::new(&b.coeffs().iter().map(|x| x.inner()).collect::<Vec<_>>());

        for index in 0..number_polynomials {
            let mut b_encoded_in_glwe = GlweCiphertext::new(&params);
            update_encrypted_secret_key_component(
                &mut b_encoded_in_glwe,
                &glwe_ciphertext,
                index,
                &params,
            );

            assert_encrypted_secret_key_component_correct_shape(
                &b_encoded_in_glwe,
                b,
                index,
                &params,
            );

            let mut m_from_b_encoded = Polynomial::zero(b.len());

            decrypt_glwe_ciphertext(&mut m_from_b_encoded, &b_encoded_in_glwe, &sk, &params);

            let m_from_b_encoded = m_from_b_encoded.map(|x| x.inner());

            let mut expected_m_from_b_encoded = Polynomial::<Torus<u64>>::zero(polynomial_degree);

            let sk_component = sk.s(&params).collect::<Vec<_>>()[index];
            polynomial_external_mad(
                &mut expected_m_from_b_encoded,
                b_u64.as_torus(),
                sk_component,
            );

            // Note that we need to negate the result from what we see in the paper,
            // as the paper uses a different convention for the body than our
            // implementation.
            let expected_m_from_b_encoded = expected_m_from_b_encoded.map(|x| (x.wrapping_neg()));

            assert_eq!(
                expected_m_from_b_encoded,
                m_from_b_encoded,
                "The decrypted secret key component did not match the expected result. The expected result is -b * s_i where b is the body of the original ciphertext and s_i is the secret key component."
            );
        }
    }

    fn _scheme_switch_correct_message(message: u64) {
        let params = TEST_GLWE_DEF_2;
        let polynomial_degree = params.dim.polynomial_degree.0;

        // Create the messsage polynomial
        let mut m_coeffs = (0..polynomial_degree)
            .map(|_| Torus::from(0u64))
            .collect::<Vec<_>>();
        m_coeffs[0] = Torus::from(message);
        let m = Polynomial::new(&m_coeffs);

        // Generate the keys
        let sk = GlweSecretKey::<u64>::generate_binary(&params);

        let mut ssk = SchemeSwitchKey::<u64>::new(&params, &RADIX_SS);
        generate_scheme_switch_key(&mut ssk, &sk, &params, &RADIX_SS);

        // Encrypt the message
        let mut glev_ciphertext = GlevCiphertext::new(&params, &RADIX_GGSW);
        encrypt_secret_glev_ciphertext(&mut glev_ciphertext, &m, &sk, &params, &RADIX_GGSW);

        // Perform the scheme switch
        let mut ggsw_ciphertext = GgswCiphertext::new(&params, &RADIX_GGSW);
        scheme_switch(
            &mut ggsw_ciphertext,
            &glev_ciphertext,
            &ssk,
            &params,
            &RADIX_GGSW,
            &RADIX_SS,
        );

        let mut decrypted_ggsw = Polynomial::zero(polynomial_degree);
        decrypt_ggsw_ciphertext(
            &mut decrypted_ggsw,
            &ggsw_ciphertext,
            &sk,
            &params,
            &RADIX_GGSW,
        );

        // We got back the same encrypted message. However, this only shows that
        // the last GLev is implemented properly, so now we additional tests to
        // check the rest.
        assert_eq!(
            m_coeffs,
            decrypted_ggsw.coeffs(),
            "The decrypted message did not match the expected message."
        );

        // Check that all the GLev ciphertexts are correct
        for (i, (glev_component, sk_component)) in ggsw_ciphertext
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
    }

    #[test]
    fn scheme_switch_correct_message() {
        for _ in 0..10 {
            let message = thread_rng().next_u64() % 2;
            _scheme_switch_correct_message(message);
        }
    }

    fn _can_cmux_after_scheme_switch(message: u64) {
        let params = TEST_GLWE_DEF_2;
        let polynomial_degree = params.dim.polynomial_degree.0;
        let plaintext_bits = PlaintextBits(1);

        // Create the messsage polynomial
        let mut m_coeffs = (0..polynomial_degree)
            .map(|_| Torus::from(0u64))
            .collect::<Vec<_>>();
        m_coeffs[0] = Torus::from(message);
        let m = Polynomial::new(&m_coeffs);

        // Generate the keys
        let sk = GlweSecretKey::<u64>::generate_binary(&params);

        let mut ssk = SchemeSwitchKey::<u64>::new(&params, &RADIX_SS);
        generate_scheme_switch_key(&mut ssk, &sk, &params, &RADIX_SS);

        // Encrypt the message
        let mut glev_ciphertext = GlevCiphertext::new(&params, &RADIX_GGSW);
        encrypt_secret_glev_ciphertext(&mut glev_ciphertext, &m, &sk, &params, &RADIX_GGSW);

        // Perform the scheme switch
        let mut ggsw_ciphertext = GgswCiphertext::new(&params, &RADIX_GGSW);
        scheme_switch(
            &mut ggsw_ciphertext,
            &glev_ciphertext,
            &ssk,
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

        // Convert the ggsw ciphertext to the fft domain
        let b_fft = &high_level::fft::fft_ggsw(&ggsw_ciphertext, &params, &RADIX_GGSW);

        // Perform the cmux operation
        let mut c = GlweCiphertext::new(&params);
        cmux(&mut c, &glwe_zero, &glwe_one, b_fft, &params, &RADIX_GGSW);

        // Decrypt the result
        let c_decrypted = decrypt_glwe(&c, &sk, &params, plaintext_bits);

        let expected = if message == 0 { zero } else { one };
        assert_eq!(expected, c_decrypted);
    }

    #[test]
    fn can_cmux_after_scheme_switch() {
        for _ in 0..10 {
            let message = thread_rng().next_u64() % 2;
            _can_cmux_after_scheme_switch(message);
        }
    }
}
