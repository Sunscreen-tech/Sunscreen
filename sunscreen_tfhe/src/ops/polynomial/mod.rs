use crate::{entities::PolynomialRef, PlaintextBits, Torus, TorusOps};

/// Encode a polynomial for encryption.
///
/// # Remarks
/// This amounts to left shifting each coefficient by `S::BITS - plain_bits`.
/// We encode messages because noise grows in the lower bits
/// (scheme parameters willing) as homomorphic computation unfolds.
///
/// This operation is idempotent; clearing result beforehand is not necessary.
///
/// # Panics
/// If `result.len() != msg.len()`
pub fn encode_polynomial<S>(
    result: &mut PolynomialRef<Torus<S>>,
    msg: &PolynomialRef<S>,
    plain_bits: PlaintextBits,
) where
    S: TorusOps,
{
    assert_eq!(result.len(), msg.len());

    result
        .coeffs_mut()
        .iter_mut()
        .zip(msg.coeffs().iter())
        .for_each(|(e, m)| *e = Torus::encode(*m, plain_bits));
}

/// Decode a polynomial.
///
/// # Remarks
/// This amounts to right shifting each coefficient by `S::BITS - plain_bits` places.
/// This operation is idempotent
pub fn decode_polynomial<S>(
    result: &mut PolynomialRef<S>,
    msg: &PolynomialRef<Torus<S>>,
    plain_bits: PlaintextBits,
) where
    S: TorusOps,
{
    assert_eq!(result.len(), msg.len());

    result
        .coeffs_mut()
        .iter_mut()
        .zip(msg.coeffs().iter())
        .for_each(|(e, m)| *e = Torus::decode(m, plain_bits));
}

#[cfg(test)]
mod tests {
    use crate::entities::Polynomial;

    use super::*;

    #[test]
    fn can_encode_polynomial() {
        let len = 1024u64;
        let plain_bits = PlaintextBits(4);

        let polynomial = Polynomial::new(&(0..len).map(|x| x % 8).collect::<Vec<_>>());
        let mut encoded = Polynomial::zero(len as usize);

        encode_polynomial(&mut encoded, &polynomial, plain_bits);

        for (i, c) in encoded.coeffs().iter().enumerate() {
            let expected = Torus::encode(i as u64 % 8, plain_bits);

            assert_eq!(*c, expected);
        }
    }
    #[test]
    fn can_decode_polynomial() {
        let len = 1024u64;
        let plain_bits = PlaintextBits(4);

        let polynomial = Polynomial::new(&(0..len).map(|x| x % 8).collect::<Vec<_>>());
        let mut encoded = Polynomial::zero(len as usize);

        encode_polynomial(&mut encoded, &polynomial, plain_bits);

        let mut decoded = Polynomial::zero(len as usize);

        decode_polynomial(&mut decoded, &encoded, plain_bits);

        assert_eq!(decoded, polynomial);
    }
}
