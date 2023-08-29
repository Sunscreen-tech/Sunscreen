use std::{marker::PhantomData, ops::Not};

use crypto_bigint::{
    subtle::{ConditionallySelectable, ConstantTimeLess},
    Uint,
};

use super::ArithmeticBackend;

/// Contains precomputed values needed for a Barrett reduction in
/// a ring Z_q
///
/// # Remarks
/// This algorithm is only guaranteed to work so long as Modulus fits into a 64 * N - 1 bit
/// value.
pub trait BarrettConfig<const N: usize> {
    /// The modulus defining the ring
    const MODULUS: Uint<N>;

    /// floor(2**(64*N) / MODULUS)
    const R: Uint<N>;

    /// floor(2**(128*N) / MODULUS) - 2**(64*N) * R
    const S: Uint<N>;

    /// 2**(64*N) - R * MODULUS
    const T: Uint<N>;
}

/// A [`Ring`](super::Ring) backend that uses a Barrett reduction to reduce by
/// the ring modulus.
pub struct BarrettBackend<const N: usize, C: BarrettConfig<N>> {
    _phantom: PhantomData<C>,
}

impl<const N: usize, C: BarrettConfig<N>> BarrettBackend<N, C> {
    /// Compute x (a 2N limb value) mod C::MODULUS
    ///
    /// # Remarks
    /// See https://math.stackexchange.com/questions/3455277/barrett-reduction-possible-without-overflow-and-floating-point-arithmetic
    ///
    /// A key observation is that x = x_lo + 2^(64*N)*x_hi and thus
    /// x mod m = x_lo mod m + 2^(64*N)*x_hi.
    /// This is how we derive the required values in [`BarretConfig`], but the full
    /// derivation is in the link.
    ///
    /// We have carefully chosen the terms to obviate shifting and we can simply do
    /// mulhi with no shifting.
    fn barrett_reduce(x: (Uint<N>, Uint<N>)) -> Uint<N> {
        let (x_lo, x_hi) = x;

        fn reduce<const N: usize, C: BarrettConfig<N>>(val: &mut Uint<N>) {
            let reduced = val.wrapping_sub(&C::MODULUS);

            val.conditional_assign(&reduced, val.ct_lt(&C::MODULUS).not());
        }

        // Compute `mod_hi = x_hi * T - x_hi * s * p`
        let asp = x_hi.mul_wide(&C::S).1.wrapping_mul(&C::MODULUS);

        let mod_hi = x_hi.wrapping_mul(&C::T);

        let mut mod_hi = mod_hi.wrapping_sub(&asp);

        reduce::<N, C>(&mut mod_hi);

        // Compute `mod_lo = x_lo - x_lo * r * MODULUS`
        let (_, q_hi) = x_lo.mul_wide(&C::R);

        let mut mod_lo = x_lo.wrapping_sub(&q_hi.wrapping_mul(&C::MODULUS));

        reduce::<N, C>(&mut mod_lo);

        // Sum mod_lo and mod_hi
        let mut result = mod_lo.wrapping_add(&mod_hi);
        reduce::<N, C>(&mut result);

        result
    }
}

impl<const N: usize, C: BarrettConfig<N>> ArithmeticBackend<N> for BarrettBackend<N, C> {
    const MODULUS: Uint<N> = C::MODULUS;

    const ZERO: Uint<N> = Uint::ZERO;

    const ONE: Uint<N> = Uint::ONE;

    /// Compute `lhs * rhs mod MODULUS` using a Barrett Reduction
    fn mul_mod(lhs: &Uint<N>, rhs: &Uint<N>) -> Uint<N> {
        Self::barrett_reduce(lhs.mul_wide(rhs))
    }

    fn encode(val: &Uint<N>) -> Uint<N> {
        *val
    }
}

#[cfg(test)]
mod tests_one_limb {
    use num::{FromPrimitive, Num};
    use rand::RngCore;
    use sunscreen_math_macros::BarrettConfig as DeriveBarrettConfig;

    // Work around derive macro using sunscreen_math path
    use crate as sunscreen_math;

    use super::*;

    fn reduction_test_case<const N: usize, C: BarrettConfig<N>>(a: &num::BigInt) {
        let bytes = bytemuck::cast_slice(C::MODULUS.as_words().as_slice());
        let m = num::BigInt::from_bytes_le(num::bigint::Sign::Plus, bytes);

        let expected = a % m;

        let mut lo_limbs = [0u64; N];
        let mut hi_limbs = [0u64; N];

        let a_digits = a.to_u64_digits().1;
        assert!(a_digits.len() <= 2 * N);

        for i in 0..a_digits.len() {
            if i < N {
                lo_limbs[i] = a_digits[i];
            } else {
                hi_limbs[i - N] = a_digits[i];
            }
        }

        let c =
            BarrettBackend::<N, C>::barrett_reduce((Uint::from(lo_limbs), Uint::from(hi_limbs)));

        assert_eq!(c.as_limbs()[0].0, expected.to_u64_digits().1[0]);
    }

    fn mul_test_case<C: BarrettConfig<1>>(a: u64, b: u64) {
        let a_expect = num::BigInt::from_u64(a).unwrap();
        let b_expect = num::BigInt::from_u64(b).unwrap();
        let m = num::BigInt::from_u64(C::MODULUS.as_words()[0]).unwrap();

        let expected = (&a_expect * &b_expect) % m;

        let c = BarrettBackend::<1, C>::mul_mod(&Uint::from_u64(a), &Uint::from_u64(b));

        let expected = expected
            .to_u64_digits()
            .1
            .iter()
            .copied()
            .next()
            .unwrap_or_default();

        assert_eq!(c.as_limbs()[0].0, expected);
    }

    #[test]
    fn can_barrett_reduce_medium_modulus() {
        #[derive(DeriveBarrettConfig)]
        #[barrett_config(modulus = "0xDEADBEEF", num_limbs = 1)]
        struct ConfigModMax;

        reduction_test_case::<1, ConfigModMax>(
            &num::BigInt::from_str_radix("FEEDF00DF00DFEED0000000000000000", 16).unwrap(),
        );
        reduction_test_case::<1, ConfigModMax>(
            &num::BigInt::from_str_radix("0000000000000000FEEDF00DF00DFEED", 16).unwrap(),
        );
        reduction_test_case::<1, ConfigModMax>(
            &num::BigInt::from_str_radix("FEEDF00DF00DFEEDFEEDF00DF00DFEED", 16).unwrap(),
        );
        reduction_test_case::<1, ConfigModMax>(
            &num::BigInt::from_str_radix("28181196569800973531195304723742259160", 10).unwrap(),
        );
        reduction_test_case::<1, ConfigModMax>(
            &num::BigInt::from_str_radix("10187240694940845278", 10).unwrap(),
        );
        reduction_test_case::<1, ConfigModMax>(
            &num::BigInt::from_str_radix("88652594061804751057749230545767759872", 10).unwrap(),
        );
        reduction_test_case::<1, ConfigModMax>(
            &num::BigInt::from_str_radix("88652594061804751067936471240708605150", 10).unwrap(),
        );
    }

    #[test]
    fn can_barrett_reduce_max_modulus() {
        #[derive(DeriveBarrettConfig)]
        #[barrett_config(modulus = "0x7FFFFFFFFFFFFFFF", num_limbs = 1)]
        struct Cfg;

        reduction_test_case::<1, Cfg>(
            &num::BigInt::from_str_radix("166007213496168112760377165276994937864", 10).unwrap(),
        );
    }

    #[test]
    fn can_mul_max_single_limb_modulus() {
        #[derive(DeriveBarrettConfig)]
        #[barrett_config(modulus = "0x7FFFFFFFFFFFFFFF", num_limbs = 1)]
        struct Cfg;

        let mut rng = rand::thread_rng();

        for _ in 0..1024 {
            mul_test_case::<Cfg>(rng.next_u64(), rng.next_u64());
        }
    }

    use sunscreen_math::ring::BarrettConfig;

    #[test]
    fn can_mul_largish_single_limb_modulus() {
        #[derive(DeriveBarrettConfig)]
        #[barrett_config(modulus = "0x8000000000000000", num_limbs = 1)]
        struct Cfg;

        let mut rng = rand::thread_rng();

        for _ in 0..1024 {
            mul_test_case::<Cfg>(rng.next_u64(), rng.next_u64());
        }
    }

    #[test]
    fn can_mul_medium_single_limb_modulus() {
        #[derive(DeriveBarrettConfig)]
        #[barrett_config(modulus = "0xDEADBEEF", num_limbs = 1)]
        struct Cfg;

        let mut rng = rand::thread_rng();

        for _ in 0..1024 {
            mul_test_case::<Cfg>(rng.next_u64(), rng.next_u64());
        }
    }

    #[test]
    fn can_reduce_small_modulus() {
        #[derive(DeriveBarrettConfig)]
        #[barrett_config(modulus = "0xFFFFFFFFFFFFFFFF", num_limbs = 2)]
        struct Cfg;

        let mut rng = rand::thread_rng();

        for _ in 0..1024 {
            let mut a = vec![0; 8 * 4];
            rng.fill_bytes(&mut a);

            reduction_test_case::<2, Cfg>(&num::BigInt::from_bytes_le(num::bigint::Sign::Plus, &a));
        }
    }

    #[test]
    fn can_reduce_big_modulus() {
        #[derive(DeriveBarrettConfig)]
        #[barrett_config(modulus = "0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", num_limbs = 2)]
        struct Cfg;

        let mut rng = rand::thread_rng();

        for _ in 0..1024 {
            let mut a = vec![0; 8 * 4];
            rng.fill_bytes(&mut a);

            reduction_test_case::<2, Cfg>(&num::BigInt::from_bytes_le(num::bigint::Sign::Plus, &a));
        }
    }

    #[test]
    fn can_reduce_four_limb_modulus() {
        #[derive(DeriveBarrettConfig)]
        #[barrett_config(
            modulus = "421249101157150430150591791601812858371395928330411389778873040897",
            num_limbs = 4
        )]
        struct Cfg;

        let mut rng = rand::thread_rng();

        for _ in 0..1024 {
            let mut a = vec![0; 8 * 8];
            rng.fill_bytes(&mut a);

            reduction_test_case::<4, Cfg>(&num::BigInt::from_bytes_le(num::bigint::Sign::Plus, &a));
        }
    }
}
