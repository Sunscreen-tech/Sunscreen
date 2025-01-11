use bytemuck::{Pod as BytemuckPod, Zeroable};
use num::traits::{
    Bounded, MulAdd, Num, WrappingAdd, WrappingMul, WrappingNeg, WrappingShl, WrappingShr,
    WrappingSub,
};
use serde::{Deserialize, Serialize};
use std::{
    fmt::{Binary, Debug, LowerHex, UpperHex},
    num::Wrapping,
    ops::{Add, AddAssign, BitAnd, Deref, Mul, Neg, Shl, Shr, Sub, SubAssign},
};
use sunscreen_math::{refify_binary_op, Zero};

use crate::{
    math::{ReinterpretAsSigned, ReinterpretAsUnsigned},
    scratch::Pod,
    PlaintextBits,
};

/// Number of bits used in the representation of a type.
pub trait NumBits {
    /// The number of bits used in the representation of a type.
    const BITS: u32;
}

impl NumBits for u32 {
    const BITS: u32 = u32::BITS;
}

impl NumBits for u64 {
    const BITS: u32 = u64::BITS;
}

/// Convert a type into a 64-bit floating point number.
pub trait ToF64 {
    /// Approximately convert the value to an f64.
    fn to_f64(self) -> f64;
}

/// Convert a 64-bit floating point number into a type.
pub trait FromF64
where
    Self: Sized,
{
    /// Approximately convert an f64 into a value.
    fn from_f64(x: f64) -> Self;
}

/// A type that supports operations on a Torus.
pub trait TorusOps:
    BitAnd<Self, Output = Self>
    + WrappingAdd
    + WrappingSub
    + WrappingMul
    + WrappingShl
    + WrappingShr
    + WrappingNeg
    + BitAnd
    + ReinterpretAsSigned
    + Num
    + NumBits
    + From<u32>
    + TryFrom<u64>
    + FromU64
    + Clone
    + Copy
    + Binary
    + LowerHex
    + UpperHex
    + std::fmt::Debug
    + Ord
    + Zero
    + Pod
    + BytemuckPod
    + Bounded
    + ToF64
    + FromF64
    + ToU64
    + NumBits
    + Sync
    + Send
{
}

// Sound since Torus is a transparent wrapper and `S` impl `Pod`
unsafe impl<S: TorusOps> Zeroable for Torus<S> {}
unsafe impl<S: TorusOps> BytemuckPod for Torus<S> {}

/// Convert a type into a 64-bit unsigned integer.
pub trait ToU64 {
    /// Convert the value to a 64-bit unsigned integer.
    fn to_u64(self) -> u64;
}

impl ToU64 for u32 {
    fn to_u64(self) -> u64 {
        self as u64
    }
}

impl ToU64 for u64 {
    fn to_u64(self) -> u64 {
        self
    }
}

impl<T> ToU64 for Torus<T>
where
    T: TorusOps,
{
    fn to_u64(self) -> u64 {
        self.0.to_u64()
    }
}

/// Convert a 64-bit unsigned integer into a type.
pub trait FromU64 {
    /// For the given 64-bit value, take the N most significant bits, where
    /// N is the bitlength of this type.
    fn from_u64(val: u64) -> Self;
}

impl FromU64 for u32 {
    fn from_u64(val: u64) -> Self {
        (val & 0xFFFFFFFF) as Self
    }
}

impl FromU64 for u64 {
    fn from_u64(val: u64) -> Self {
        val
    }
}

macro_rules! impl_tof64 {
    ($t:ty) => {
        impl ToF64 for $t {
            fn to_f64(self) -> f64 {
                self as f64
            }
        }
    };
}

impl_tof64!(i8);
impl_tof64!(i16);
impl_tof64!(i32);
impl_tof64!(i64);
impl_tof64!(i128);
impl_tof64!(u8);
impl_tof64!(u16);
impl_tof64!(u32);
impl_tof64!(u64);
impl_tof64!(u128);

impl<T> ToF64 for Wrapping<T>
where
    T: ToF64,
{
    fn to_f64(self) -> f64 {
        self.0.to_f64()
    }
}

impl<T> ToF64 for Torus<T>
where
    T: TorusOps,
{
    fn to_f64(self) -> f64 {
        self.0.to_f64()
    }
}

macro_rules! impl_unsigned_fromf64 {
    ($t:ty,$st:ty) => {
        impl FromF64 for $t {
            #[inline(always)]
            fn from_f64(x: f64) -> $t {
                let x = x as $st;

                x.reinterpret_as_unsigned()
            }
        }
    };
}

impl_unsigned_fromf64!(u128, i128);
impl_unsigned_fromf64!(u64, i64);
impl_unsigned_fromf64!(u32, i32);
impl_unsigned_fromf64!(u16, i16);

impl<T> FromF64 for Torus<T>
where
    T: TorusOps,
{
    fn from_f64(x: f64) -> Self {
        Self(T::from_f64(x))
    }
}

impl<T> FromF64 for Wrapping<T>
where
    T: FromF64,
{
    fn from_f64(x: f64) -> Self {
        Wrapping(T::from_f64(x))
    }
}

impl TorusOps for u64 {}
impl TorusOps for u32 {}

/// A wrapper around a type that supports Torus operations.
#[repr(transparent)]
#[derive(Debug, Default, Clone, Copy, PartialEq, PartialOrd, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Torus<S: TorusOps = u64>(S);

/// Compute the distance between two Torus values, normalized to the unit torus.
/// The first argument is taken as the reference point.
///
/// For example, if a is at a normalized position of 0.2, and b is at a
/// normalized position of 0.8, then there are two distances between them:
/// 0.6 and -0.4. This function will return the shorter of the two distances,
/// -0.4.
///
/// In other words:
///
/// ```text
/// b.normalized_torus() = a.normalized_torus() + normalized_torus_distance(a, b) (mod 1.0)
/// ```
pub fn normalized_torus_distance<S: TorusOps>(a: &Torus<S>, b: &Torus<S>) -> f64 {
    let a_minus_b = a - b;
    let b_minus_a = b - a;

    let modulus = 2_f64.powi(S::BITS as i32);

    let difference = if a_minus_b < b_minus_a {
        -a_minus_b.to_f64()
    } else {
        b_minus_a.to_f64()
    };

    difference / modulus
}

impl<S: TorusOps> Deref for Torus<S> {
    type Target = S;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<S: TorusOps> NumBits for Torus<S> {
    const BITS: u32 = S::BITS;
}

impl<S: TorusOps> Torus<S> {
    /// Compute the normalized position of this [Torus] value on the unit torus [0.0, 1.0).
    pub fn normalized_torus(&self) -> f64 {
        let modulus: f64 = 2_f64.powi(S::BITS as i32);
        let val: f64 = self.0.to_f64();

        val / modulus
    }

    /// Compute the distance between this [Torus] value and another, normalized to
    /// the unit torus.
    pub fn normalized_torus_distance(&self, other: &Self) -> f64 {
        normalized_torus_distance(self, other)
    }

    /// Encode a value into a [Torus] that supports up to plain_bits of values.
    /// This encodes the value on the equispaced `2^plaintext_bits` positions on
    /// a larger torus.
    ///
    /// # Remarks
    /// We encode messages in FHE as noise grows in the lower bits of a ciphertext as
    /// computation unfolds.
    pub fn encode(val: S, plain_bits: PlaintextBits) -> Self {
        assert!(plain_bits.0 < S::BITS);

        let encoded = val.wrapping_shl(S::BITS - plain_bits.0);

        Self(encoded)
    }

    /// Decode a value from a [Torus] that supports up to plain_bits of values.
    pub fn decode(&self, plain_bits: PlaintextBits) -> S {
        assert!(plain_bits.0 < S::BITS);

        let round_bit = self.0.wrapping_shr(S::BITS - plain_bits.0 - 1) & S::from(0x1);
        let mask = S::from((0x1 << plain_bits.0) - 1);

        (self.0.wrapping_shr(S::BITS - plain_bits.0) + round_bit) & mask
    }

    /// Scale a Torus element to a different modulus. Assumes that the two moduli are
    /// powers of 2.
    pub fn switch_modulus_smaller<T>(&self) -> Torus<T>
    where
        T: TorusOps + TryFrom<S>,
        <T as TryFrom<S>>::Error: Debug,
    {
        let shift = (S::BITS - T::BITS) as usize;

        // We don't wrap the bits we don't need
        let y = self.0 >> shift;

        Torus(T::try_from(y).expect("impossible error on switch_modulus_smaller"))
    }

    /// Return the underlying type of the Torus.
    #[inline(always)]
    pub fn inner(&self) -> S {
        self.0
    }
}

impl<S: TorusOps> From<S> for Torus<S> {
    #[inline(always)]
    fn from(value: S) -> Self {
        Self(value)
    }
}

impl<S: TorusOps> Zero for Torus<S> {
    fn zero() -> Self {
        Self(S::from(0))
    }

    fn vartime_is_zero(&self) -> bool {
        self.inner() == <S as sunscreen_math::Zero>::zero()
    }
}

impl<S: TorusOps> Neg for Torus<S> {
    type Output = Self;

    fn neg(self) -> Self::Output {
        Self::Output::from(self.0.wrapping_neg())
    }
}

impl<S: TorusOps> WrappingNeg for Torus<S> {
    fn wrapping_neg(&self) -> Self {
        Self::from(self.0.wrapping_neg())
    }
}

#[refify_binary_op]
impl<S: TorusOps> Add<&Torus<S>> for &Torus<S> {
    type Output = Torus<S>;

    fn add(self, rhs: &Torus<S>) -> Self::Output {
        Self::Output::from(self.0.wrapping_add(&rhs.0))
    }
}

impl<S: TorusOps> WrappingAdd for Torus<S> {
    fn wrapping_add(&self, rhs: &Self) -> Self {
        self + rhs
    }
}

#[refify_binary_op]
impl<S: TorusOps> Sub<&Torus<S>> for &Torus<S> {
    type Output = Torus<S>;

    fn sub(self, rhs: &Torus<S>) -> Self::Output {
        Self::Output::from(self.0.wrapping_sub(&rhs.0))
    }
}

impl<S: TorusOps> WrappingSub for Torus<S> {
    fn wrapping_sub(&self, rhs: &Self) -> Self {
        self - rhs
    }
}

#[refify_binary_op]
impl<S: TorusOps> Mul<&S> for &Torus<S> {
    type Output = Torus<S>;

    fn mul(self, rhs: &S) -> Self::Output {
        Self::Output::from(self.wrapping_mul(rhs))
    }
}

#[refify_binary_op]
impl<S: TorusOps> BitAnd<&Torus<S>> for &Torus<S> {
    type Output = Torus<S>;

    fn bitand(self, rhs: &Torus<S>) -> Self::Output {
        Torus::from(self.0 & rhs.0)
    }
}

#[refify_binary_op]
impl<S: TorusOps> Shr<&usize> for &Torus<S> {
    type Output = Torus<S>;

    fn shr(self, rhs: &usize) -> Self::Output {
        Torus::from(self.0 >> *rhs)
    }
}

#[refify_binary_op]
impl<S: TorusOps> Shl<&usize> for &Torus<S> {
    type Output = Torus<S>;

    fn shl(self, rhs: &usize) -> Self::Output {
        Torus::from(self.0 << *rhs)
    }
}

impl<S: TorusOps> AddAssign<Self> for Torus<S> {
    fn add_assign(&mut self, rhs: Self) {
        *self = *self + rhs
    }
}

impl<S: TorusOps> AddAssign<&Self> for Torus<S> {
    fn add_assign(&mut self, rhs: &Self) {
        *self = *self + rhs
    }
}

impl<S: TorusOps> SubAssign<Self> for Torus<S> {
    fn sub_assign(&mut self, rhs: Self) {
        *self = *self - rhs;
    }
}

impl<S: TorusOps> SubAssign<&Self> for Torus<S> {
    fn sub_assign(&mut self, rhs: &Self) {
        *self = *self - rhs;
    }
}

impl<S: TorusOps> std::iter::Sum for Torus<S> {
    fn sum<I: Iterator<Item = Self>>(iter: I) -> Self {
        iter.fold(Self::zero(), |acc, x| acc + x)
    }
}

impl<S> ReinterpretAsSigned for Torus<S>
where
    S: TorusOps,
{
    type Output = <S as ReinterpretAsSigned>::Output;

    #[inline(always)]
    fn reinterpret_as_signed(self) -> Self::Output {
        self.0.reinterpret_as_signed()
    }
}

impl<S: TorusOps> num::Zero for Torus<S> {
    fn zero() -> Self {
        Self(<S as num::Zero>::zero())
    }

    fn is_zero(&self) -> bool {
        self.0.is_zero()
    }
}

impl<S: TorusOps> MulAdd<S, Self> for Torus<S> {
    type Output = Self;

    #[inline(always)]
    fn mul_add(self, a: S, b: Self) -> Self::Output {
        self * a + b
    }
}

#[cfg(test)]
mod tests {
    use rand::{thread_rng, RngCore};

    use super::*;

    #[test]
    fn can_negate() {
        let x = Torus::<u64>::from(0);
        assert_eq!(-x, Torus::from(0));

        let x = Torus::<u64>::from(1);
        assert_eq!(-x, Torus::from(u64::MAX));

        let x = Torus::<u64>::from(u64::MAX);
        assert_eq!(-x, Torus::from(1));
    }

    #[test]
    fn can_encode_decode() {
        assert_eq!(
            Torus::<u64>::encode(7, PlaintextBits(4)).0,
            0x70000000_00000000
        );

        let x = Torus::<u64>::from(0x70000000_00000000);

        assert_eq!(x.decode(PlaintextBits(4)), 7);

        let x = Torus::<u64>::from(0x7FFFFFFF_FFFFFFFF);

        assert_eq!(x.decode(PlaintextBits(4)), 8);
    }

    #[test]
    fn can_decode_off_center() {
        let t = Torus::<u64>::from(((u64::MAX as f64) * 0.6) as u64);
        let r = t.decode(PlaintextBits(1));
        assert_eq!(r, 1);

        let t = Torus::<u64>::from(((u64::MAX as f64) * 0.3) as u64);
        let r = t.decode(PlaintextBits(1));
        assert_eq!(r, 1);

        let t = Torus::<u64>::from(((u64::MAX as f64) * 0.8) as u64);
        let r = t.decode(PlaintextBits(1));
        assert_eq!(r, 0);

        let t = Torus::<u64>::from(((u64::MAX as f64) * 0.2) as u64);
        let r = t.decode(PlaintextBits(1));
        assert_eq!(r, 0);
    }

    #[test]
    fn can_normalize() {
        let x = Torus::<u64>::from(0);
        assert_eq!(x.normalized_torus(), 0.0);

        let x = Torus::<u64>::from(u64::MAX / 4);
        assert_eq!(x.normalized_torus(), 0.25);

        let x = Torus::<u64>::from(u64::MAX / 2);
        assert_eq!(x.normalized_torus(), 0.5);

        let x = Torus::<u64>::from(u64::MAX / 4 * 3);
        assert_eq!(x.normalized_torus(), 0.75);

        let x = Torus::<u64>::from(u64::MAX / 8 * 7);
        assert_eq!(x.normalized_torus(), 0.875);
    }

    #[test]
    fn can_compute_distance() {
        let a = Torus::<u64>::from(0);
        let b = Torus::<u64>::from(u64::MAX / 4);

        assert_eq!(normalized_torus_distance(&a, &b), 0.25);
        assert_eq!(normalized_torus_distance(&b, &a), -0.25);

        let a = Torus::<u64>::from(u64::MAX / 4);
        let b = Torus::<u64>::from(u64::MAX / 2);

        assert_eq!(normalized_torus_distance(&a, &b), 0.25);
        assert_eq!(normalized_torus_distance(&b, &a), -0.25);

        let a = Torus::<u64>::from(0);
        let b = Torus::<u64>::from(u64::MAX / 4 * 3);

        assert_eq!(normalized_torus_distance(&a, &b), -0.25);
        assert_eq!(normalized_torus_distance(&b, &a), 0.25);

        let a = Torus::<u64>::from(u64::MAX / 8);
        let b = Torus::<u64>::from(u64::MAX / 4 * 3);

        assert_eq!(normalized_torus_distance(&a, &b), -0.375);
        assert_eq!(normalized_torus_distance(&b, &a), 0.375);
    }

    #[test]
    fn test_normalized_relation() {
        // Tests the relation:
        // b.normalized_torus() = a.normalized_torus() + normalized_torus_distance(a, b)

        for _ in 0..100 {
            let a = Torus::<u64>::from(thread_rng().next_u64());
            let b = Torus::<u64>::from(thread_rng().next_u64());

            let a_norm = a.normalized_torus();
            let b_norm = b.normalized_torus();

            let dist = normalized_torus_distance(&a, &b);

            let b_norm_from_dist = a_norm + dist;

            let b_norm_from_dist = if b_norm_from_dist < 0.0 {
                b_norm_from_dist + 1.0
            } else if b_norm_from_dist >= 1.0 {
                b_norm_from_dist - 1.0
            } else {
                b_norm_from_dist
            };

            let diff = (b_norm - b_norm_from_dist).abs();

            assert!(
                diff < 1e-12,
                "Normalized torus relation test failed:  a = {:?}, b = {:?}, a_norm = {}, b_norm = {}, dist: {}, b_norm_from_dist = {}, diff = {}",
                a,
                b,
                a_norm,
                b_norm,
                dist,
                b_norm_from_dist,
                diff
            );
        }
    }

    #[test]
    fn can_modulus_switch() {
        let x = Torus::<u64>::from(0x12345678_9ABCDEF0);

        let y = x.switch_modulus_smaller::<u32>();

        assert_eq!(y.0, 0x12345678);
    }
}
