use std::ops::{Add, Mul, Neg, Sub};

use num::traits::{WrappingAdd, WrappingMul, WrappingNeg, WrappingSub};
use sunscreen_math::{refify_binary_op, One, Zero};

use crate::{Inverse, Pow, RootOfUnity};

/// 2^64 - 2^32 + 1
pub const GOLDILOCKS_PRIME: u64 = 0xFFFFFFFF00000001;

#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(transparent)]
/// A value in the Goldilocks field (F_p where p = 2^64 - 2^32 + 1).
/// See
///  https://cp4space.hatsya.com/2021/09/01/an-efficient-prime-for-number-theoretic-transforms/
/// for why this field is so magical.
pub struct Fg(u64);

impl RootOfUnity for Fg {
    fn nth_root_of_unity(n: u64) -> Self {
        assert!(
            n.is_power_of_two(),
            "Goldilocks prime requires power of 2 < 2^32 for n when computing nth root of unity."
        );

        // See https://nufhe.readthedocs.io/en/latest/implementation_details.html for where this constant comes
        // from.
        const C: Fg = Fg(12037493425763644479);

        let exp = 0x1_0000_0000u64 / n;

        C.pow(exp)
    }
}

impl Fg {
    /// Returns `x % GOLDILOCKS_PRIME`
    pub fn new(x: u64) -> Self {
        if x > GOLDILOCKS_PRIME {
            Self(x - GOLDILOCKS_PRIME)
        } else {
            Self(x)
        }
    }

    #[inline]
    pub fn unreduced_add(self, rhs: Self) -> Fg96 {
        let (c, carry) = self.0.overflowing_add(rhs.0);

        Fg96 {
            lo: c,
            hi: carry.into(),
        }
    }

    #[inline]
    pub fn unreduced_sub(self, rhs: Self) -> Fg96 {
        self.unreduced_add(Fg(GOLDILOCKS_PRIME - rhs.0))
    }

    #[inline]
    pub fn unreduced_mul(self, rhs: Self) -> Fg159 {
        let res = self.0 as u128 * rhs.0 as u128;

        res.into()
    }

    #[inline]
    /// Compute `self * b + c` and don't reduce the result.
    pub fn unreduced_mad(self, b: Self, c: Self) -> Fg159 {
        let res = self.0 as u128 * b.0 as u128 + c.0 as u128;

        res.into()
    }

    #[inline]
    /// Compute `self * b + c`.
    pub fn mad(self, b: Self, c: Self) -> Self {
        self.unreduced_mad(b, c).reduce()
    }
}

impl From<u64> for Fg {
    fn from(value: u64) -> Self {
        Self::new(value)
    }
}

#[refify_binary_op]
impl Add<&Fg> for &Fg {
    type Output = Fg;

    #[inline]
    fn add(self, rhs: &Fg) -> Self::Output {
        let (res, c) = self.0.overflowing_add(rhs.0);

        // If overflow occurred, then we have 1 carry bit. This gives us
        // s = 1 * 2^64 + res = (2^32 - 1) + res.
        //
        // If overflow didn't occur, but res >= g, then we need to compute
        // s - g = s + (2^32 + 1). Note that -g (mod 2^64) = 2^32 - 1 (mod 2^64).
        // Thus, we can add (2^32 + 1) in both cases!
        if c || res >= GOLDILOCKS_PRIME {
            Fg(res.wrapping_add(0xFFFFFFFFu64))
        } else {
            Fg(res)
        }
    }
}

#[refify_binary_op]
impl Mul<&Fg> for &Fg {
    type Output = Fg;

    #[inline]
    fn mul(self, rhs: &Fg) -> Self::Output {
        self.unreduced_mul(*rhs).reduce()
    }
}

#[refify_binary_op]
impl Sub<&Fg> for &Fg {
    type Output = Fg;

    #[inline]
    fn sub(self, rhs: &Fg) -> Self::Output {
        let (res, c) = self.0.overflowing_sub(rhs.0);

        let offset = 0u32.wrapping_sub(u32::from(c)) as u64;

        // If we underflow, then we need to add g.
        // Note that g (mod 2^64) = -(2^32 + 1) (mod 32)
        // Thus, this is equivalent to subtracting -(2^32 + 1).
        Fg(res.wrapping_sub(offset))
    }
}

impl Neg for Fg {
    type Output = Fg;

    fn neg(self) -> Self::Output {
        Self(GOLDILOCKS_PRIME - self.0)
    }
}

impl WrappingAdd for Fg {
    #[inline]
    fn wrapping_add(&self, v: &Self) -> Self {
        self + v
    }
}

impl WrappingMul for Fg {
    #[inline]
    fn wrapping_mul(&self, v: &Self) -> Self {
        self * v
    }
}

impl WrappingSub for Fg {
    #[inline]
    fn wrapping_sub(&self, v: &Self) -> Self {
        self - v
    }
}

impl WrappingNeg for Fg {
    #[inline]
    fn wrapping_neg(&self) -> Self {
        -*self
    }
}

impl Zero for Fg {
    #[inline]
    fn vartime_is_zero(&self) -> bool {
        self.0 == 0
    }

    #[inline]
    fn zero() -> Self {
        Fg(0)
    }
}

impl One for Fg {
    #[inline]
    fn one() -> Self {
        Fg(1)
    }
}

impl Inverse for Fg {
    fn inverse(&self) -> Self {
        <Fg as Pow<u64>>::pow(self, GOLDILOCKS_PRIME - 2)
    }
}

#[derive(Copy, Clone, Debug)]
/// A number of the form hi << 64 + C, where B is 32-bit and C = 64-bit.
pub struct Fg96 {
    lo: u64,
    hi: u64,
}

impl Fg96 {
    #[inline]
    /// Reduce the number mod [`GOLDILOCKS_PRIME`].
    ///
    /// /// # Remarks
    /// Note that 2^64 = 2^32 - 1 (mod g)
    ///
    /// Thus, we can rewrite as (2^32 - 1) * B + C.
    pub fn reduce(self) -> Fg {
        let prod = (self.hi << 32) - self.hi;
        let mut res = prod.wrapping_add(self.lo);

        if res < prod || res >= GOLDILOCKS_PRIME {
            res = res.wrapping_sub(GOLDILOCKS_PRIME);
        }

        Fg(res)
    }
}

/// An unreduced value of 159 or fewer bits, where lo is 64-bit, mid is 32-bit and hi is 63-bit.
/// We can represent this value as `lo + mid << 64 + hi << 96`.
pub struct Fg159 {
    lo: u64,
    mid: u64,
    hi: u64,
}

impl Fg159 {
    #[inline]
    /// Reduce the number mod [`GOLDILOCKS_PRIME`].
    ///
    /// /// # Remarks
    /// Note that
    /// * 2^64 = 2^32 - 1 (mod g)
    /// * 2^96 = -1  
    ///
    /// Thus, we can rewrite as (2^32 - 1) * B + (C - A).
    pub fn reduce(self) -> Fg {
        let mut lo2 = self.lo.wrapping_sub(self.hi);
        if self.hi > self.lo {
            lo2 = lo2.wrapping_add(GOLDILOCKS_PRIME);
        }

        let prod = (self.mid << 32) - self.mid;
        let mut res = lo2.wrapping_add(prod);

        if res < prod || res >= GOLDILOCKS_PRIME {
            res = res.wrapping_sub(GOLDILOCKS_PRIME);
        }

        Fg(res)
    }
}

impl From<u128> for Fg159 {
    #[inline(always)]
    fn from(res: u128) -> Self {
        Fg159 {
            lo: res as u64,
            mid: (res >> 64) as u32 as u64,
            hi: (res >> 96) as u64,
        }
    }
}

#[cfg(test)]
mod tests {
    use rand::{thread_rng, RngCore};

    use super::*;

    #[test]
    fn can_add_fg() {
        for _ in 0..1000 {
            let a = Fg(thread_rng().next_u64() % GOLDILOCKS_PRIME);
            let b = Fg(thread_rng().next_u64() % GOLDILOCKS_PRIME);

            let c = a + b;
            let expected = ((a.0 as u128 + b.0 as u128) % GOLDILOCKS_PRIME as u128) as u64;

            assert_eq!(c, Fg(expected));
        }
    }

    #[test]
    fn can_sub_fg() {
        for _ in 0..1000 {
            let a = Fg(thread_rng().next_u64() % GOLDILOCKS_PRIME);
            let b = Fg(thread_rng().next_u64() % GOLDILOCKS_PRIME);

            let c = a - b;
            let expected = ((a.0 as u128 + (GOLDILOCKS_PRIME - b.0) as u128)
                % GOLDILOCKS_PRIME as u128) as u64;

            assert_eq!(c, Fg(expected));
        }
    }

    #[test]
    fn can_neg_fg() {
        for _ in 0..1000 {
            let a = Fg(thread_rng().next_u64() % GOLDILOCKS_PRIME);

            let c = -a;
            let expected = Fg(0) - a;

            assert_eq!(c, expected);
        }
    }

    #[test]
    fn can_mul_fg() {
        fn test_case(a: u64, b: u64) {
            let c = Fg(a) * Fg(b);
            let expected = ((a as u128 * b as u128) % GOLDILOCKS_PRIME as u128) as u64;

            assert_eq!(c, Fg(expected));
        }

        test_case(GOLDILOCKS_PRIME - 1, GOLDILOCKS_PRIME - 1);

        for _ in 0..1000 {
            test_case(
                thread_rng().next_u64() % GOLDILOCKS_PRIME,
                thread_rng().next_u64() % GOLDILOCKS_PRIME,
            );
        }
    }

    #[test]
    fn can_mad_fg() {
        for _ in 0..1000 {
            let a = Fg(thread_rng().next_u64() % GOLDILOCKS_PRIME);
            let b = Fg(thread_rng().next_u64() % GOLDILOCKS_PRIME);
            let c = Fg(thread_rng().next_u64() % GOLDILOCKS_PRIME);

            let acutal = a.mad(b, c);
            let expected =
                ((a.0 as u128 * b.0 as u128 + c.0 as u128) % GOLDILOCKS_PRIME as u128) as u64;

            assert_eq!(acutal, Fg(expected));
        }
    }

    #[test]
    fn nth_root_of_unity() {
        for i in 1..16u64 {
            let root = Fg::nth_root_of_unity(0x1 << i);

            assert_eq!(root.pow(0x1u64 << i), Fg::one());
        }
    }
}
