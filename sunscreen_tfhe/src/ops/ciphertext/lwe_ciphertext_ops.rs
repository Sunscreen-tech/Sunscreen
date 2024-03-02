use crate::{entities::LweCiphertextRef, LweDef, RoundedDiv, Torus, TorusOps};

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
pub fn modulus_switch<S>(
    ct: &mut LweCiphertextRef<S>,
    original_bits: u32,
    new_bits: u32,
    params: &LweDef,
) where
    S: TorusOps,
{
    let (c_a, c_b) = ct.a_b_mut(params);

    // We specifically want to zero out the MSBs instead of shifting them back
    // around.
    for a in c_a {
        let c = a.inner().to_u64() as u128;
        let res = (c * (1 << new_bits)).div_rounded(1 << original_bits as u128);
        *a = Torus::from(S::from_u64(res as u64));
    }

    let c = c_b.inner().to_u64() as u128;
    let res = (c * (1 << new_bits)).div_rounded(1 << original_bits as u128);

    *c_b = Torus::from(S::from_u64(res as u64));
}
