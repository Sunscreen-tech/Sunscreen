use crate::{
    entities::{GlevCiphertextRef, GlweCiphertextRef, Polynomial},
    radix::{PolynomialRadixIterator, ScalarRadixIterator},
    GlweDef, TorusOps,
};

use super::{glwe_polynomial_mad, glwe_scalar_mad};

/// Compute `c += (G^-1 * a) \[*\] b`, where
/// * `G^-1 * a`` is the radix decomposition of `a`
/// * `b` is a GLEV ciphertext.
/// * `c` is a GLWE ciphertext.
/// * \[*\] is the external product between a GLEV ciphertext and `l` polynomials
///
/// # Remarks
/// This functions takes a PolynomialRadixIterator to perform the decomposition.
pub fn decomposed_polynomial_glev_mad<S>(
    c: &mut GlweCiphertextRef<S>,
    mut a: PolynomialRadixIterator<S>,
    b: &GlevCiphertextRef<S>,
    params: &GlweDef,
) where
    S: TorusOps,
{
    // a = decomp(a_i)
    // b = r

    let b_glwe = b.glwe_ciphertexts(params);
    let mut cur_radix: Polynomial<S> = Polynomial::zero(params.dim.polynomial_degree.0);

    // The decomposition of
    //     <Decomp^{beta, l}(gamma), GLEV>
    // can be performed using
    //     sum_{j = 1}^l gamma_j * C_j
    // where gamma_j is the polynomial to decompose multiplied by q/B^{j+1}
    // Note the reverse of the GLWE ciphertexts here! The decomposition iterator
    // returns the decomposed values in the opposite order.
    for b in b_glwe.rev() {
        a.write_next(&mut cur_radix);
        glwe_polynomial_mad(c, b, &cur_radix, params);
    }
}

/// Compute `c += (G^-1 * a) \[*\] b`, where
/// * `G^-1 * a`` is the radix decomposition of `a`
/// * `b` is a GLEV ciphertext.
pub fn decomposed_scalar_glev_mad<S>(
    c: &mut GlweCiphertextRef<S>,
    a: ScalarRadixIterator<S>,
    b: &GlevCiphertextRef<S>,
    params: &GlweDef,
) where
    S: TorusOps,
{
    for (b, a) in b.glwe_ciphertexts(params).rev().zip(a) {
        glwe_scalar_mad(c, b, a, params);
    }
}
