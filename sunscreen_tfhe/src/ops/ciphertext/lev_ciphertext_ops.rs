use crate::{
    entities::{LevCiphertextRef, LweCiphertextRef, Polynomial},
    radix::PolynomialRadixIterator,
    LweDef, TorusOps,
};

use super::scalar_mul_ciphertext_mad;

/// Compute `c += (G^-1 * a) \[*\] b`, where
/// * `G^-1 * a`` is the radix decomposition of `a`
/// * `b` is a LEV ciphertext.
/// * `c` is a LWE ciphertext.
/// * \[*\] is the external product between a LEV ciphertext and the decomposed
/// LWE ciphertext.
///
/// # Remarks
/// This functions takes a PolynomialRadixIterator to perform the decomposition.
pub fn decomposed_scalar_lev_mad<S>(
    c: &mut LweCiphertextRef<S>,
    mut a: PolynomialRadixIterator<S>,
    b: &LevCiphertextRef<S>,
    params: &LweDef,
) where
    S: TorusOps,
{
    let b_lwe = b.lwe_ciphertexts(params);
    let mut cur_radix: Polynomial<S> = Polynomial::zero(1);

    // The decomposition of
    //     <Decomp^{beta, l}(gamma), GLEV>
    // can be performed using
    //     sum_{j = 1}^l gamma_j * C_j
    // where gamma_j is the polynomial to decompose multiplied by q/B^{j+1}
    // Note the reverse of the GLWE ciphertexts here! The decomposition iterator
    // returns the decomposed values in the opposite order.
    for b in b_lwe.rev() {
        a.write_next(&mut cur_radix);
        let radix = cur_radix.coeffs()[0];

        scalar_mul_ciphertext_mad(c, &radix, b, params);
    }
}
