use crate::{Error, One, Zero};
use crypto_bigint::NonZero;
pub use crypto_bigint::Uint;
use num::traits::{WrappingAdd, WrappingMul, WrappingNeg, WrappingSub};
use std::{
    marker::PhantomData,
    ops::{Add, Mul},
};
use sunscreen_math_macros::refify_binary_op;

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
    + Zero
    + One
{
}

/// Declares the given type as performing wrapping arithmetic (rather than e.g. panicking
/// on overflow).
pub trait WrappingSemantics:
    Copy + Clone + std::fmt::Debug + WrappingAdd + WrappingMul + WrappingSub + WrappingNeg + Zero + One
{
}

impl WrappingSemantics for u8 {}
impl WrappingSemantics for u16 {}
impl WrappingSemantics for u32 {}
impl WrappingSemantics for u64 {}
impl WrappingSemantics for u128 {}

impl Zero for u8 {
    const ZERO: Self = 0;
}
impl Zero for u16 {
    const ZERO: Self = 0;
}
impl Zero for u32 {
    const ZERO: Self = 0;
}
impl Zero for u64 {
    const ZERO: Self = 0;
}
impl Zero for u128 {
    const ZERO: Self = 0;
}

impl One for u8 {
    const ONE: Self = 1;
}
impl One for u16 {
    const ONE: Self = 1;
}
impl One for u32 {
    const ONE: Self = 1;
}
impl One for u64 {
    const ONE: Self = 1;
}
impl One for u128 {
    const ONE: Self = 1;
}

#[repr(transparent)]
#[derive(Clone, Copy, Debug)]
/// A ring of integers modulo a power of 2. Said modulus is defined by T's bit width.
///
/// # Remarks
/// Reduction modulo 2**n over an n-bit integer is trivial - just do wrapping arithmetic
/// and allow values to overflow. This type simply exposes operations on the underlying
/// integer type with wrapping semantics.
pub struct ZInt<T>(T)
where
    T: WrappingSemantics;

impl<T> From<T> for ZInt<T>
where
    T: WrappingSemantics,
{
    fn from(value: T) -> Self {
        Self(value)
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
    const ZERO: Self = Self(T::ZERO);
}

impl<T> One for ZInt<T>
where
    T: WrappingSemantics,
{
    const ONE: Self = Self(T::ONE);
}

impl<T> Ring for ZInt<T> where T: WrappingSemantics {}

/// A backend for performing arithmetic over the ring Zq. `q` needn't be prime.
pub trait ArithmeticBackend<const N: usize> {
    /// The modulus q defining the integer ring.
    const MODULUS: Uint<N>;

    /// Zero
    const ZERO: Uint<N>;

    /// One
    const ONE: Uint<N>;

    /// Add lhs and rhs and reduce the value modulo [`ArithmeticBackend::MODULUS`].
    fn add_mod(lhs: &Uint<N>, rhs: &Uint<N>) -> Uint<N> {
        lhs.add_mod(rhs, &Self::MODULUS)
    }

    /// Multiply lhs and rhs and reduce the value modulo [`ArithmeticBackend::MODULUS`].
    fn mul_mod(lhs: &Uint<N>, rhs: &Uint<N>) -> Uint<N>;

    /// Encode a standard value into a form compatible with the
    /// backend.
    fn encode(val: &Uint<N>) -> Uint<N>;
}

/// A ring of integers mod q.
pub struct Zq<const N: usize, B: ArithmeticBackend<N>> {
    val: Uint<N>,

    _phantom: PhantomData<B>,
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
        Self {
            val: self.val,
            _phantom: PhantomData,
        }
    }
}

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
impl<const N: usize, B: ArithmeticBackend<N>> Mul<&Zq<N, B>> for &Zq<N, B> {
    type Output = Zq<N, B>;

    fn mul(self, rhs: &Zq<N, B>) -> Self::Output {
        Self::Output {
            val: B::mul_mod(&self.val, &rhs.val),
            _phantom: PhantomData,
        }
    }
}

impl<const N: usize, B: ArithmeticBackend<N>> From<u64> for Zq<N, B> {
    fn from(value: u64) -> Self {
        let modulus = NonZero::new(B::MODULUS).unwrap();

        let value = Uint::from_u64(value).rem(&modulus);

        Self {
            val: B::encode(&value),
            _phantom: PhantomData,
        }
    }
}

impl<const N: usize, B: ArithmeticBackend<N>> Zero for Zq<N, B> {
    const ZERO: Self = Self {
        val: B::ZERO,
        _phantom: PhantomData,
    };
}

impl<const N: usize, B: ArithmeticBackend<N>> One for Zq<N, B> {
    const ONE: Self = Self {
        val: B::ONE,
        _phantom: PhantomData,
    };
}

impl<const N: usize, B: ArithmeticBackend<N>> Ring for Zq<N, B> {}

impl<const N: usize, B: ArithmeticBackend<N>> Zq<N, B> {}

impl<const N: usize, B: ArithmeticBackend<N>> TryFrom<Uint<N>> for Zq<N, B> {
    type Error = crate::Error;

    /// Fails if value >= C::MODULUS.
    fn try_from(value: Uint<N>) -> Result<Self, Self::Error> {
        if value.ge(&B::MODULUS) {
            return Err(Error::OutOfRange);
        }

        todo!();
    }
}
