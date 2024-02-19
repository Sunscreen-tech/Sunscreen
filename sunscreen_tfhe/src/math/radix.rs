use crate::{
    entities::{PolynomialIterator, PolynomialRef},
    math::{Torus, TorusOps},
    polynomial::polynomial_scalar_mad,
    RadixCount, RadixDecomposition, RadixLog,
};

// Needed by allow_scratch_ref
#[allow(unused_imports)]
use crate::dst::FromMutSlice;

/// An iterator from least to most significant radix decomposition of a value.
pub struct ScalarRadixIterator<S>
where
    S: TorusOps,
{
    cur: S,
    level: usize,
    radix: RadixDecomposition,
}

impl<S: TorusOps> ScalarRadixIterator<S> {
    /// Creates a new [`ScalarRadixIterator`] for the given [Torus] value.
    #[inline(always)]
    pub fn new(val: Torus<S>, radix: &RadixDecomposition) -> Self {
        Self {
            cur: round(val, radix),
            level: 0,
            radix: *radix,
        }
    }
}

#[inline(always)]
fn get_next_digit<S: TorusOps>(cur: &mut S, radix_log: usize) -> S {
    let mask = S::from_u64((0x1u64 << radix_log) - 1);

    // Interpreting the digits over [-B/2,B/2) reduces noise by half a bit on average.
    let mut digit = *cur & mask;
    *cur = *cur >> radix_log;
    let carry = digit >> (radix_log - 1);
    *cur = *cur + carry;
    digit = digit.wrapping_sub(&(carry << radix_log));

    digit
}

impl<S: TorusOps> Iterator for ScalarRadixIterator<S> {
    type Item = S;

    #[inline(always)]
    fn next(&mut self) -> Option<Self::Item> {
        if self.level == self.radix.count.0 {
            return None;
        }

        let digit = get_next_digit(&mut self.cur, self.radix.radix_log.0);

        self.level += 1;

        Some(digit)
    }
}

/// An iterator from least to most significant radix decomposition of the coefficients
/// of a polynomial.
pub struct PolynomialRadixIterator<'a, S>
where
    S: TorusOps,
{
    scratch: &'a mut PolynomialRef<S>,
    level: usize,
    radix: RadixDecomposition,
}

impl<'a, S> PolynomialRadixIterator<'a, S>
where
    S: TorusOps,
{
    /// Creates a new [`PolynomialRadixIterator`] for the given polynomial.
    pub fn new(
        poly: &PolynomialRef<Torus<S>>,
        scratch: &'a mut PolynomialRef<S>,
        radix: &RadixDecomposition,
    ) -> Self {
        assert!(radix.radix_log.0 * radix.count.0 < S::BITS as usize);
        assert_ne!(radix.radix_log.0 * radix.count.0, 0);

        poly.map_into(scratch, |x| round(*x, radix));

        Self {
            scratch,
            level: 0,
            radix: radix.to_owned(),
        }
    }

    /// Writes the next polynomial decomposition to `dst` and returns `Some(())` if there is a next digit.
    pub fn write_next(&mut self, dst: &mut PolynomialRef<S>) -> Option<()> {
        if self.level == self.radix.count.0 {
            return None;
        }

        self.level += 1;

        for (s, r) in self
            .scratch
            .coeffs_mut()
            .iter_mut()
            .zip(dst.coeffs_mut().iter_mut())
        {
            *r = get_next_digit(s, self.radix.radix_log.0);
        }

        Some(())
    }
}

/// Recomposes a polynomial from its `digits` decomposition and adds it to `dst`.
///
/// # Remarks
/// The digits should iterate from least to most significant.
pub fn recompose_and_add<S>(
    dst: &mut PolynomialRef<Torus<S>>,
    digits: &mut PolynomialIterator<S>,
    radix: RadixLog,
    count: RadixCount,
) where
    S: TorusOps,
{
    let shift_amount = S::BITS as usize - radix.0 * count.0;
    let mut cur_radix = S::from_u64(0x1 << shift_amount);
    let mut actual_count = 0;

    for d in digits {
        polynomial_scalar_mad(dst, d.as_torus(), cur_radix);

        actual_count += 1;
        cur_radix = cur_radix << radix.0;
    }

    assert_eq!(count.0, actual_count);
}

#[inline(always)]
/// Multiply `val` by q / B^(j + 1).
pub fn scale_by_decomposition_factor<S: TorusOps>(
    val: S,
    j: usize,
    radix: &RadixDecomposition,
) -> S {
    let shift = S::BITS as usize - radix.radix_log.0 * (j + 1);
    let factor = S::one() << shift;

    val.wrapping_mul(&factor)
}

#[inline(always)]
/// Rounds the given [`Torus`] element and returns the value interpreted as an integer.
fn round<S: TorusOps>(x: Torus<S>, radix: &RadixDecomposition) -> S {
    let shift = S::BITS as usize - radix.radix_log.0 * radix.count.0;
    let round_bit = (x.inner() >> (shift - 1)) & S::from_u64(0x1);

    (x.inner() >> shift).wrapping_add(&round_bit)
}

#[cfg(test)]
mod tests {
    use rand::{thread_rng, RngCore};

    use crate::{
        entities::{Polynomial, PolynomialList},
        rand::uniform_torus,
        scratch::allocate_scratch_ref,
        PlaintextBits, PolynomialDegree,
    };

    use super::*;

    #[test]
    fn can_round_values() {
        assert_eq!(
            round(
                Torus::from(0x12348FFF_FFFFFFFFu64),
                &RadixDecomposition {
                    radix_log: RadixLog(4),
                    count: RadixCount(4)
                }
            ),
            0x1235
        );

        assert_eq!(
            round(
                Torus::from(0x12347FFF_FFFFFFFFu64),
                &RadixDecomposition {
                    radix_log: RadixLog(4),
                    count: RadixCount(4)
                }
            ),
            0x1234
        );
    }

    #[test]
    fn can_decompose() {
        let x = Polynomial::new(&[Torus::encode(7u64, PlaintextBits(4))]);

        allocate_scratch_ref!(scratch, PolynomialRef<u64>, (PolynomialDegree(x.len())));

        let mut radix_iter = PolynomialRadixIterator::new(
            &x,
            scratch,
            &RadixDecomposition {
                radix_log: RadixLog(2),
                count: RadixCount(2),
            },
        );

        let mut dst = Polynomial::zero(1);

        assert_eq!(radix_iter.write_next(&mut dst), Some(()));
        assert_eq!(dst.coeffs()[0], 0u64.wrapping_sub(1));
        assert_eq!(radix_iter.write_next(&mut dst), Some(()));
        assert_eq!(dst.coeffs()[0], 0u64.wrapping_sub(2));
        assert_eq!(radix_iter.write_next(&mut dst), None);

        let x = Polynomial::new(&[Torus::encode(1u64, PlaintextBits(1))]);

        let radix_log = 4;
        let mut radix_iter = PolynomialRadixIterator::new(
            &x,
            scratch,
            &RadixDecomposition {
                radix_log: RadixLog(radix_log),
                count: RadixCount(3),
            },
        );

        let mut dst = Polynomial::zero(1);

        assert_eq!(radix_iter.write_next(&mut dst), Some(()));
        assert_eq!(dst.coeffs()[0], 0u64);
        assert_eq!(radix_iter.write_next(&mut dst), Some(()));
        assert_eq!(dst.coeffs()[0], 0u64);
        assert_eq!(radix_iter.write_next(&mut dst), Some(()));

        // 2^(beta - 1) - 2^beta
        assert_eq!(dst.coeffs()[0], 0u64.wrapping_sub(1 << (radix_log - 1)));
        assert_eq!(radix_iter.write_next(&mut dst), None);
    }

    #[test]
    fn can_decompose_polynomial() {
        let x = Polynomial::new(&[
            // Decomposes to 1 [for 2^1] + 0 [for 2^2], or 1 + 0
            Torus::encode(1u64, PlaintextBits(4)),
            // Decomposes to -2 [for 2^1] + 1 [for 2^2], or -2 + 4
            Torus::encode(2u64, PlaintextBits(4)),
            // Decomposes to -1 [for 2^1] + 1 [for 2^2], or -1 + 4
            Torus::encode(3u64, PlaintextBits(4)),
            // Decomposes to 0 [for 2^1] + 1 [for 2^2], or 0 + 4
            Torus::encode(4u64, PlaintextBits(4)),
        ]);

        allocate_scratch_ref!(scratch, PolynomialRef<u64>, (PolynomialDegree(x.len())));

        let mut radix_iter = PolynomialRadixIterator::new(
            &x,
            scratch,
            &RadixDecomposition {
                radix_log: RadixLog(2),
                count: RadixCount(2),
            },
        );

        let mut dst = Polynomial::zero(4);

        assert_eq!(radix_iter.write_next(&mut dst), Some(()));
        assert_eq!(
            dst.coeffs(),
            [1u64, 0u64.wrapping_sub(2), 0u64.wrapping_sub(1), 0]
        );
        assert_eq!(radix_iter.write_next(&mut dst), Some(()));
        assert_eq!(dst.coeffs(), [0, 1, 1, 1]);
        assert_eq!(radix_iter.write_next(&mut dst), None);
    }

    #[test]
    fn can_decompose_recompose() {
        let d = PolynomialDegree(8);

        for _ in 0..50 {
            let radix = (thread_rng().next_u32() % 7) + 1;
            let radix = RadixLog(radix as usize);

            let count = loop {
                let count = (thread_rng().next_u32() % 7) + 1;

                if (radix.0 * count as usize) < u64::BITS as usize {
                    break count;
                }
            };

            let count = RadixCount(count as usize);

            let x = (0..d.0).map(|_| uniform_torus::<u64>()).collect::<Vec<_>>();
            let x = Polynomial::new(&x);

            let expected = x.map(|c| {
                let radix_bits = radix.0 * count.0;
                let lsb = u64::BITS as usize - radix_bits;
                let round_loc = lsb - 1;

                let round = (c.inner() >> round_loc) & 0x1;
                let mask = 0xFFFFFFFF_FFFFFFFFu64 << lsb;
                Torus::from((c.inner() & mask).wrapping_add(round << lsb))
            });

            let mut digits = PolynomialList::new(d, count.0);

            allocate_scratch_ref!(scratch, PolynomialRef<u64>, (PolynomialDegree(x.len())));

            let mut radix_iter = PolynomialRadixIterator::new(
                &x,
                scratch,
                &RadixDecomposition {
                    radix_log: radix,
                    count,
                },
            );

            for d in digits.iter_mut(d) {
                radix_iter.write_next(d);
            }

            let mut result = Polynomial::zero(x.len());

            recompose_and_add(&mut result, &mut digits.iter(d), radix, count);

            assert_eq!(expected, result);
        }
    }

    fn random_radix() -> RadixDecomposition {
        let radix = (thread_rng().next_u32() % 7) + 1;
        let radix = RadixLog(radix as usize);

        let count = loop {
            let count = (thread_rng().next_u32() % 7) + 1;

            if (radix.0 * count as usize) < u64::BITS as usize {
                break count;
            }
        };

        let count = RadixCount(count as usize);

        RadixDecomposition {
            radix_log: radix,
            count,
        }
    }

    #[test]
    fn can_decompose_scalar() {
        for _ in 0..50 {
            let radix = random_radix();
            let val = Torus::from(thread_rng().next_u64());
            /*let radix = RadixDecomposition {
                            count: RadixCount(3),
                            radix_log: RadixLog(4),
                        };
                        let val = Torus::from(0xDEADBEEF_FEEDF00Du64);
            */

            let decomp = ScalarRadixIterator::new(val, &radix);
            let mut digits = vec![];

            for digit in decomp {
                digits.push(digit);
            }

            let actual = digits.iter().enumerate().fold(0u64, |s, (i, d)| {
                let shift_amount = u64::BITS as usize - radix.radix_log.0 * (radix.count.0 - i);
                let cur_radix = 0x1u64 << shift_amount;

                (cur_radix.wrapping_mul(*d)).wrapping_add(s)
            });

            // Round shifts our value down to the LSB places, so move it back up to compare
            // against a torus element.
            let expected =
                round(val, &radix) << (u64::BITS as usize - radix.radix_log.0 * (radix.count.0));

            assert_eq!(actual, expected);
        }
    }
}
