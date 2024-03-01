use crate::{entities::LweCiphertextRef, LweDef, Torus, TorusOps};

/// Add the coefficients of a to the coefficients of c in place.
pub fn add_lwe_inplace<S>(c: &mut LweCiphertextRef<S>, a: &LweCiphertextRef<S>, params: &LweDef)
where
    S: TorusOps,
{
    let (c_a, c_b) = c.a_b_mut(params);
    let (a_a, a_b) = a.a_b(params);

    assert_eq!(c_a.len(), a_a.len());

    for (c, a) in c_a.iter_mut().zip(a_a.iter()) {
        *c = num::traits::WrappingAdd::wrapping_add(c, a);
    }

    *c_b = num::traits::WrappingAdd::wrapping_add(c_b, a_b);
}

/// Subtract one LWE ciphertext from another, storing the result in the provided
/// output variable. Mostly meant to be used reduce the number of allocations
/// and with functions like [allocate_scratch_ref].
pub(crate) fn sub_lwe_ciphertexts<S>(
    c: &mut LweCiphertextRef<S>,
    a: &LweCiphertextRef<S>,
    b: &LweCiphertextRef<S>,
    params: &LweDef,
) where
    S: TorusOps,
{
    let (c_a, c_b) = c.a_b_mut(params);
    let (a_a, a_b) = a.a_b(params);
    let (b_a, b_b) = b.a_b(params);

    assert_eq!(c_a.len(), a_a.len());
    assert_eq!(c_a.len(), b_a.len());

    for (c, (a, b)) in c_a.iter_mut().zip(a_a.iter().zip(b_a.iter())) {
        *c = num::traits::WrappingSub::wrapping_sub(a, b);
    }

    *c_b = num::traits::WrappingSub::wrapping_sub(a_b, b_b);
}

/// Multiplies an LWE ciphertext by a scalar, storing the result in the provided
/// output variable. Mostly meant to be used reduce the number of allocations
/// and with functions like [allocate_scratch_ref].
pub(crate) fn scalar_mul_ciphertext_mad<S>(
    c: &mut LweCiphertextRef<S>,
    scalar: &S,
    a: &LweCiphertextRef<S>,
    params: &LweDef,
) where
    S: TorusOps,
{
    let (c_a, c_b) = c.a_b_mut(params);
    let (a_a, a_b) = a.a_b(params);

    assert_eq!(c_a.len(), a_a.len());

    for (c, a) in c_a.iter_mut().zip(a_a.iter()) {
        *c += a * scalar;
    }

    *c_b += a_b * scalar;
}

/// Perform modulus switching on a ciphertext. We are assuming that moduli are
/// both powers of two, and that the original number of bits is greater than the
/// new number of bits.
///
/// # Remarks
/// When performing the mod switch, the first `log_chi` MSBs are skipped in the input and
/// the message is padded with `log_v` bits in the LSB. Example:
///
/// ```ignore
///   chi       x       r       dropped
/// ---------------------------------------------       
/// | 0 0 | 1 1 0 1 0 | 1 | 1 0 1 0 1 1 0 1 0 ...
///
///         |
///         V
///
/// | 1 1 0 1 1 | 0 0 0 |
/// ```
///
/// We drop the first `log_chi` bits then round the `x` section using the `r` bit. We copy
/// down the bits in the rounded `x` value and append `log_v` 0s as LSBs.
///
/// When performing vanilla programmable bootstrapping, `log_chi` and `log_v` will be zero.
/// `log_chi` and `log_v` are used when performing multi-output PBS.
///
/// For more information on generalized bootstrapping, see
/// "Improved Programmable Bootstrapping with Larger Precision and Efficient Arithmetic
/// Circuits for TFHE"
/// by Chillotti et al.
pub fn lwe_ciphertext_modulus_switch<S>(
    ct: &mut LweCiphertextRef<S>,
    log_chi: u32,
    log_v: u32,
    log_modulus: u32,
    params: &LweDef,
) where
    S: TorusOps,
{
    let (c_a, c_b) = ct.a_b_mut(params);

    // We specifically want to zero out the MSBs instead of shifting them back
    // around.
    for a in c_a {
        let res = modulus_switch(
            a.inner(),
            log_chi as usize,
            log_v as usize,
            log_modulus as usize,
        );
        *a = Torus::from(res);
    }

    let res = modulus_switch(
        c_b.inner(),
        log_chi as usize,
        log_v as usize,
        log_modulus as usize,
    );

    *c_b = Torus::from(res);
}

#[inline(never)]
fn modulus_switch<S: TorusOps>(x: S, log_chi: usize, log_v: usize, log_modulus: usize) -> S {
    let one = S::one();
    let mask = (one << log_modulus) - one;
    let x = x << log_chi as usize;
    let shift_amount = S::BITS as usize - (log_modulus - log_v);

    let round = (x >> (shift_amount - 1)) & one;
    let x = x >> shift_amount;

    // TODO: Non-power-of_two input moduli

    (x.wrapping_add(&round) & mask) << log_v
}

#[cfg(test)]
mod tests {
    use super::modulus_switch;

    #[test]
    fn can_modulus_switch() {
        let x = 0xDEADBEEF_BEEFDEADu64;

        let y = modulus_switch(x, 0, 0, 10);
        assert_eq!(y, 0b1101_1110_11);

        let y = modulus_switch(x, 2, 0, 10);
        assert_eq!(y, 0b0111_1010_11);

        let y = modulus_switch(x, 0, 3, 10);
        assert_eq!(y, 0b1101_1110_00);

        let y = modulus_switch(x, 2, 3, 10);
        assert_eq!(y, 0b0111_1010_00);
    }
}
