use std::{marker::PhantomData, ops::Not};

use crypto_bigint::{Uint, CheckedMul, CheckedAdd, Limb, subtle::{ConstantTimeLess, ConditionallySelectable}, AddMod};
use curve25519_dalek::digest::generic_array::typenum::UInt;

use super::ArithmeticBackend;

/// Contains precomputed values needed for a Barrett reduction in
/// a ring Z_q
/// 
/// # Remarks
/// To support the Barrett reduction, N must have additional 
pub trait BarretConfig<const N: usize> {
    /// The modulus defining the ring
    const MODULUS: Uint<N>;

    /// floor(2**(64*N) / MODULUS)
    const R: Uint<N>;

    /// floor(2**(128*N) / MODULUS) - 2**(64*N) * R
    const S: Uint<N>;

    /// 2**(64*N) - R * MODULUS
    const T: Uint<N>;
}

pub struct BarretBackend<const N: usize, C: BarretConfig<N>> {
    _phantom: PhantomData<C>
}

impl<const N: usize, C: BarretConfig<N>> BarretBackend<N, C> {
    pub fn new() -> Self {
        Self { _phantom: PhantomData }
    }
}

impl<const N: usize, C: BarretConfig<N>> ArithmeticBackend<N> for BarretBackend<N, C> {
    const MODULUS: Uint<N> = C::MODULUS;

    /// Compute `lhs * rhs mod MODULUS` using a Barrett Reduction
    /// 
    fn mul_mod(lhs: &Uint<N>, rhs: &Uint<N>) -> Uint<N> {
        /// Compute x (a 2N limb value) mod C::MODULUS
        /// 
        /// # Remarks
        /// See https://math.stackexchange.com/questions/3455277/barrett-reduction-possible-without-overflow-and-floating-point-arithmetic
        /// 
        /// A key observation is that x = x_lo + 2^(64*N)*x_hi and thus
        /// x mod m = x_lo mod m + 2^(64*N)*x_hi.
        /// This is how we derive the required values in [`BarretConfig`], but the full
        /// derrivation is in the link.
        /// 
        /// We have carefully chosen the terms to obviate shifting and we can simply do
        /// mulhi with no shifting.
        fn barret_reduce<const N: usize, C: BarretConfig<N>>(x: (Uint<N>, Uint<N>)) -> Uint<N> {
            let (x_lo, x_hi) = x;
            
            // Compute `mod_hi = x_hi * T - x_hi * s * p`
            let asp = x_hi
                .mul_wide(&C::S).1
                .wrapping_mul(&C::MODULUS);

            let mod_hi = x_hi
                .wrapping_mul(&C::T)
                .sub_mod(&asp, &C::MODULUS);

            // Compute `mod_lo = x_lo - x_lo * r * MODULUS`
            let (q_lo, _) = x_lo.mul_wide(&C::R);

            let mod_lo = x_lo.sub_mod(&q_lo.wrapping_mul(&C::MODULUS), &C::MODULUS);

            // Sum mod_lo and mod_hi
            mod_lo.add_mod(&mod_hi, &C::MODULUS)
        }

        barret_reduce::<N, C>(lhs.mul_wide(rhs))
    }
}

#[cfg(test)]
mod tests {
    use num::FromPrimitive;
    use rand::RngCore;

    use super::*;

    #[test]
    fn can_barret_reduce_largish_modulus() {
        struct ConfigModMax;

        impl BarretConfig<1> for ConfigModMax {
            const MODULUS: Uint<1> = Uint::from_words([(u64::MAX >> 1) + 1]);
            const R: Uint<1> = Uint::from_u64(2);
            const S: Uint<1> = Uint::from_u64(0);
            const T: Uint<1> = Uint::from_u64(0);
        }

        type BackendModMax = BarretBackend::<1, ConfigModMax>;

        let test_case = |a: u64, b: u64, expected: u64| {
            let c = BackendModMax::mul_mod(&Uint::from_u64(a), &Uint::from_u64(b));
            
            assert_eq!(c.as_limbs()[0].0, expected);
        };

        test_case(u64::MAX >> 1, u64::MAX >> 1, 1);
        test_case(7, 3, 21);
        test_case(0x40000000_00000000, 0x0EADBEEF_DEADBEEF, 4611686018427387904);

        let mut rng = rand::thread_rng();
        let m = num::BigInt::from_u64((u64::MAX >> 1) + 1).unwrap();

        for _ in 0..1024 {
            let a = num::BigInt::from_u64(rng.next_u64()).unwrap();
            let b = num::BigInt::from_u64(rng.next_u64()).unwrap();

            let c = (&a * &b) % &m;

            test_case(a.to_u64_digits().1[0], b.to_u64_digits().1[0], c.to_u64_digits().1[0]);
        }
    }
}