use crate::{field::Field, Error, ModSwitch, One, Zero};
use crypto_bigint::NonZero;
pub use crypto_bigint::Uint;
use curve25519_dalek::scalar::Scalar;
use num::traits::{WrappingAdd, WrappingMul, WrappingNeg, WrappingSub};
use std::{
    marker::PhantomData,
    ops::{Add, Mul, Neg, Sub},
};
use subtle::{Choice, ConditionallySelectable};
use sunscreen_math_macros::refify_binary_op;
use zerocopy::AsBytes;

mod barrett;
pub use barrett::*;

/// The set of operations one can perform on a ring.
pub trait Ring:
    std::fmt::Debug
    + Clone
    + Mul<Self, Output = Self>
    + for<'a> Mul<&'a Self, Output = Self>
    + Add<Self, Output = Self>
    + for<'a> Add<&'a Self, Output = Self>
    + Sub<Self, Output = Self>
    + for<'a> Sub<&'a Self, Output = Self>
    + Zero
    + One
    + Eq
    + PartialEq
    + Neg<Output = Self>
    + Sync
    + Send
{
}

/**
 * For Z_q rings, returns q.
 */
pub trait RingModulus<const N: usize> {
    /**
     * The modulus of the field.
     */
    fn field_modulus() -> Uint<N>;

    /**
     * The modulus of the field divided by 2.
     */
    fn field_modulus_div_2() -> Uint<N>;
}

/// Declares the given type as performing wrapping arithmetic (rather than e.g. panicking
/// on overflow).
pub trait WrappingSemantics:
    Copy
    + Clone
    + std::fmt::Debug
    + WrappingAdd
    + WrappingMul
    + WrappingSub
    + WrappingNeg
    + Zero
    + One
    + Eq
    + Sync
    + Send
    + AsBytes
{
}

impl WrappingSemantics for u8 {}
impl WrappingSemantics for u16 {}
impl WrappingSemantics for u32 {}
impl WrappingSemantics for u64 {}
impl WrappingSemantics for u128 {}

impl Zero for u8 {
    #[inline(always)]
    fn zero() -> Self {
        0
    }

    #[inline(always)]
    fn vartime_is_zero(&self) -> bool {
        self == &0
    }
}
impl Zero for u16 {
    #[inline(always)]
    fn zero() -> Self {
        0
    }

    #[inline(always)]
    fn vartime_is_zero(&self) -> bool {
        self == &0
    }
}
impl Zero for u32 {
    #[inline(always)]
    fn zero() -> Self {
        0
    }

    #[inline(always)]
    fn vartime_is_zero(&self) -> bool {
        self == &0
    }
}
impl Zero for u64 {
    #[inline(always)]
    fn zero() -> Self {
        0
    }

    #[inline(always)]
    fn vartime_is_zero(&self) -> bool {
        self == &0
    }
}
impl Zero for u128 {
    #[inline(always)]
    fn zero() -> Self {
        0
    }

    #[inline(always)]
    fn vartime_is_zero(&self) -> bool {
        self == &0
    }
}

impl One for u8 {
    #[inline(always)]
    fn one() -> Self {
        1
    }
}
impl One for u16 {
    #[inline(always)]
    fn one() -> Self {
        1
    }
}
impl One for u32 {
    #[inline(always)]
    fn one() -> Self {
        1
    }
}
impl One for u64 {
    #[inline(always)]
    fn one() -> Self {
        1
    }
}
impl One for u128 {
    #[inline(always)]
    fn one() -> Self {
        1
    }
}

#[repr(transparent)]
#[derive(Clone, Copy, Debug, AsBytes)]
/// A ring of integers modulo a power of 2. Said modulus is defined by T's bit width.
///
/// # Remarks
/// Reduction modulo 2**n over an n-bit integer is trivial - just do wrapping arithmetic
/// and allow values to overflow. This type simply exposes operations on the underlying
/// integer type with wrapping semantics.
pub struct ZInt<T>(pub T)
where
    T: WrappingSemantics;

impl<T> ZInt<T>
where
    T: WrappingSemantics,
{
    #[inline(always)]
    /// Create a [`ZInt`] wrapping the given value.
    pub fn new(val: T) -> Self {
        Self(val)
    }
}

impl<T> From<T> for ZInt<T>
where
    T: WrappingSemantics,
{
    #[inline(always)]
    fn from(value: T) -> Self {
        Self(value)
    }
}

#[refify_binary_op]
impl<T> Sub<&ZInt<T>> for &ZInt<T>
where
    T: WrappingSemantics,
{
    type Output = ZInt<T>;

    fn sub(self, rhs: &ZInt<T>) -> Self::Output {
        self.0.wrapping_sub(&rhs.0).into()
    }
}

#[refify_binary_op]
impl<T> Add<&ZInt<T>> for &ZInt<T>
where
    T: WrappingSemantics,
{
    type Output = ZInt<T>;

    fn add(self, rhs: &ZInt<T>) -> Self::Output {
        self.0.wrapping_add(&rhs.0).into()
    }
}

#[refify_binary_op]
impl<T> Mul<&ZInt<T>> for &ZInt<T>
where
    T: WrappingSemantics,
{
    type Output = ZInt<T>;

    fn mul(self, rhs: &ZInt<T>) -> Self::Output {
        self.0.wrapping_mul(&rhs.0).into()
    }
}

impl<T> Zero for ZInt<T>
where
    T: WrappingSemantics,
{
    #[inline(always)]
    fn zero() -> Self {
        Self(T::zero())
    }

    #[inline(always)]
    fn vartime_is_zero(&self) -> bool {
        self.0.vartime_is_zero()
    }
}

impl<T> One for ZInt<T>
where
    T: WrappingSemantics,
{
    #[inline(always)]
    fn one() -> Self {
        Self(T::one())
    }
}

impl<T> Neg for ZInt<T>
where
    T: WrappingSemantics,
{
    type Output = ZInt<T>;

    fn neg(self) -> Self::Output {
        Self::zero() - self
    }
}

impl<T> Neg for &ZInt<T>
where
    T: WrappingSemantics,
{
    type Output = ZInt<T>;

    fn neg(self) -> Self::Output {
        ZInt::zero() - self
    }
}

impl<T> PartialEq for ZInt<T>
where
    T: WrappingSemantics,
{
    fn eq(&self, other: &Self) -> bool {
        self.0 == other.0
    }
}

impl<T> Eq for ZInt<T> where T: WrappingSemantics {}

impl<T> Ring for ZInt<T> where T: WrappingSemantics {}

impl<T> PartialOrd for ZInt<T>
where
    T: WrappingSemantics + PartialOrd,
{
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        self.0.partial_cmp(&other.0)
    }
}

impl<T> Ord for ZInt<T>
where
    T: WrappingSemantics + Ord,
{
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.0.cmp(&other.0)
    }
}

/// A backend for performing arithmetic over the ring Zq. `q` needn't be prime.
pub trait ArithmeticBackend<const N: usize>: Sync + Send {
    /// The modulus q defining the integer ring.
    const MODULUS: Uint<N>;

    /// The modulus divided by 2 (rounded down).
    const MODULUS_DIV_2: Uint<N>;

    /// Zero
    const ZERO: Uint<N>;

    /// One
    const ONE: Uint<N>;

    /// Add lhs and rhs and reduce the value modulo [`ArithmeticBackend::MODULUS`].
    fn add_mod(lhs: &Uint<N>, rhs: &Uint<N>) -> Uint<N> {
        lhs.add_mod(rhs, &Self::MODULUS)
    }

    /// Compute lhs - rhs and reduce the value modulo [`ArithmeticBackend::MODULUS`].
    fn sub_mod(lhs: &Uint<N>, rhs: &Uint<N>) -> Uint<N> {
        lhs.sub_mod(rhs, &Self::MODULUS)
    }

    /// Multiply lhs and rhs and reduce the value modulo [`ArithmeticBackend::MODULUS`].
    fn mul_mod(lhs: &Uint<N>, rhs: &Uint<N>) -> Uint<N>;

    /// Encode a standard value into a form compatible with the
    /// backend.
    ///
    /// # Remarks
    /// This method is only defined over the range [0, MODULUS).
    fn encode(val: &Uint<N>) -> Uint<N>;

    /// Converts an encoded value back into standard form.
    fn decode(val: &Uint<N>) -> Uint<N>;
}

/// Declares the backend as a field.
pub trait FieldBackend {}

/// A ring of integers mod q.
pub struct Zq<const N: usize, B: ArithmeticBackend<N>> {
    /// The value of the Zq stored in its backend-specific representation.
    /// For example, using the [`BarrettBackend`], which is the standard representation
    /// but with a Montgomery backend, this will be stored in Montgomery form.
    pub val: Uint<N>,

    _phantom: PhantomData<B>,
}

impl<const N: usize, B: ArithmeticBackend<N>> Zq<N, B> {
    /// Converts the element in Zq over the range [0, q) to a canonical integer
    /// with the same number of limbs in the same range.
    pub fn into_bigint(self) -> Uint<N> {
        B::decode(&self.val)
    }
}

impl<const N: usize, B: ArithmeticBackend<N>> PartialEq for Zq<N, B> {
    fn eq(&self, other: &Self) -> bool {
        self.val.eq(&other.val)
    }
}

impl<const N: usize, B: ArithmeticBackend<N>> std::fmt::Debug for Zq<N, B> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Zq = {{ val = {:#?} }}", self.val)
    }
}

impl<const N: usize, B: ArithmeticBackend<N>> Clone for Zq<N, B> {
    fn clone(&self) -> Self {
        *self
    }
}

impl<const N: usize, B: ArithmeticBackend<N>> Copy for Zq<N, B> {}

#[refify_binary_op]
impl<const N: usize, B> Add<&Zq<N, B>> for &Zq<N, B>
where
    B: ArithmeticBackend<N>,
{
    type Output = Zq<N, B>;

    fn add(self, rhs: &Zq<N, B>) -> Self::Output {
        Self::Output {
            val: B::add_mod(&self.val, &rhs.val),
            _phantom: PhantomData,
        }
    }
}

#[refify_binary_op]
impl<const N: usize, B> Sub<&Zq<N, B>> for &Zq<N, B>
where
    B: ArithmeticBackend<N>,
{
    type Output = Zq<N, B>;

    fn sub(self, rhs: &Zq<N, B>) -> Self::Output {
        Self::Output {
            val: B::sub_mod(&self.val, &rhs.val),
            _phantom: PhantomData,
        }
    }
}

#[refify_binary_op]
impl<const N: usize, B: ArithmeticBackend<N>> Mul<&Zq<N, B>> for &Zq<N, B> {
    type Output = Zq<N, B>;

    fn mul(self, rhs: &Zq<N, B>) -> Self::Output {
        Self::Output {
            val: B::mul_mod(&self.val, &rhs.val),
            _phantom: PhantomData,
        }
    }
}

impl<const N: usize, B: ArithmeticBackend<N>> Zero for Zq<N, B> {
    #[inline(always)]
    fn zero() -> Self {
        Self {
            val: B::ZERO,
            _phantom: PhantomData,
        }
    }

    #[inline(always)]
    fn vartime_is_zero(&self) -> bool {
        self.val == Uint::ZERO
    }
}

impl<const N: usize, B: ArithmeticBackend<N>> One for Zq<N, B> {
    #[inline(always)]
    fn one() -> Self {
        Self {
            val: B::ONE,
            _phantom: PhantomData,
        }
    }
}

impl<const N: usize, B: ArithmeticBackend<N>> Neg for Zq<N, B> {
    type Output = Zq<N, B>;

    fn neg(self) -> Self::Output {
        Zq::zero() - self
    }
}

impl<const N: usize, B: ArithmeticBackend<N>> Neg for &Zq<N, B> {
    type Output = Zq<N, B>;

    fn neg(self) -> Self::Output {
        Zq::zero() - self
    }
}

impl<const N: usize, B: ArithmeticBackend<N>> Eq for Zq<N, B> {}

impl<const N: usize, B: ArithmeticBackend<N>> Ring for Zq<N, B> {}

impl<const N: usize, B: ArithmeticBackend<N>> Zq<N, B> {}

impl<const N: usize, B: ArithmeticBackend<N>> TryFrom<Uint<N>> for Zq<N, B> {
    type Error = crate::Error;

    /// Fails if value >= C::MODULUS.
    fn try_from(value: Uint<N>) -> Result<Self, Self::Error> {
        if value.ge(&B::MODULUS) {
            return Err(Error::OutOfRange);
        }

        Ok(Zq {
            val: B::encode(&value),
            _phantom: PhantomData,
        })
    }
}

impl<const N: usize, B: ArithmeticBackend<N>> From<u64> for Zq<N, B> {
    /// Returns `value % q`.
    fn from(value: u64) -> Self {
        let modulus = NonZero::new(B::MODULUS).unwrap();

        let value = Uint::from_u64(value).rem(&modulus);

        Self {
            val: B::encode(&value),
            _phantom: PhantomData,
        }
    }
}

impl<const N: usize, B: ArithmeticBackend<N>> From<i32> for Zq<N, B> {
    fn from(value: i32) -> Self {
        Self::from(value as i64)
    }
}

impl<const N: usize, B: ArithmeticBackend<N>> From<i64> for Zq<N, B> {
    /// Returns `value` over the range [-q/2, q/2].
    ///
    /// # Remarks
    /// Calling this over `Zq` where `|value| > q /2` may result in incorrect results
    ///
    /// # Panics
    /// If value is i64::MIN.
    fn from(value: i64) -> Self {
        let modulus = NonZero::new(B::MODULUS).unwrap();

        // TODO: Verify this is constant time
        let abs = Uint::from_u64(value.unsigned_abs());
        let neg = if value.is_negative() {
            Choice::from(1)
        } else {
            Choice::from(0)
        };

        let neg_val = modulus.wrapping_sub(&abs);

        let value = Uint::conditional_select(&abs, &neg_val, neg);
        let value = value.rem(&modulus);

        Self {
            val: B::encode(&value),
            _phantom: PhantomData,
        }
    }
}

impl<const N: usize, B: ArithmeticBackend<N>> PartialOrd for Zq<N, B> {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        self.val.partial_cmp(&other.val)
    }
}

impl<const N: usize, B: ArithmeticBackend<N>> Ord for Zq<N, B> {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.val.cmp(&other.val)
    }
}

impl<B: ArithmeticBackend<M>, const M: usize, const N: usize> RingModulus<N> for Zq<M, B> {
    fn field_modulus() -> Uint<N> {
        extend_bigint(&B::MODULUS)
    }

    fn field_modulus_div_2() -> Uint<N> {
        extend_bigint(&B::MODULUS_DIV_2)
    }
}

impl<const N: usize, B: FieldBackend + ArithmeticBackend<N>> Field for Zq<N, B> {
    fn inverse(&self) -> Self {
        let val = self.into_bigint();

        let inv = val.inv_odd_mod(&B::MODULUS).0;

        Self {
            val: B::encode(&inv),
            _phantom: PhantomData,
        }
    }
}

/// Extend a [`struct@Uint<M>`] to a [`struct@Uint<N>`] by appending zeros.
///
/// # Panics
/// If M > N
pub fn extend_bigint<const N: usize, const M: usize>(x: &Uint<M>) -> Uint<N> {
    assert!(M <= N);

    let mut val = Uint::<N>::ZERO;

    for (i, limb) in x.as_words().iter().enumerate() {
        val.as_words_mut()[i] = *limb;
    }

    val
}

impl Ring for Scalar {}
