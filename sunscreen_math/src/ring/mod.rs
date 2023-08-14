use crate::{refify, Error};
pub use crypto_bigint::Uint;
use num::traits::{WrappingAdd, WrappingMul, WrappingNeg, WrappingSub};
use std::{
    marker::PhantomData,
    ops::{Add, Mul},
};

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
{
}

/// Declares the given type as performing wrapping arithmetic (rather than e.g. panicking
/// on overflow).
pub trait WrappingSemantics:
    Copy + Clone + std::fmt::Debug + WrappingAdd + WrappingMul + WrappingSub + WrappingNeg
{
}

impl WrappingSemantics for u8 {}
impl WrappingSemantics for u16 {}
impl WrappingSemantics for u32 {}
impl WrappingSemantics for u64 {}
impl WrappingSemantics for u128 {}

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

impl<T> Add<&ZInt<T>> for &ZInt<T>
where
    T: WrappingSemantics,
{
    type Output = ZInt<T>;

    fn add(self, rhs: &ZInt<T>) -> Self::Output {
        self.0.wrapping_add(&rhs.0).into()
    }
}

refify! {
    Add, ZInt, (T, (WrappingSemantics)), T
}

impl<T> Mul<&ZInt<T>> for &ZInt<T>
where
    T: WrappingSemantics,
{
    type Output = ZInt<T>;

    fn mul(self, rhs: &ZInt<T>) -> Self::Output {
        self.0.wrapping_mul(&rhs.0).into()
    }
}

refify! {
    Mul, ZInt, (T, (WrappingSemantics)), T
}

impl<T> Ring for ZInt<T> where T: WrappingSemantics {}

/// A backend for performing arithmetic over the ring Zq. `q` needn't be prime.
pub trait ArithmeticBackend<const N: usize> {
    /// The modulus q defining the integer ring.
    const MODULUS: Uint<N>;

    /// Add lhs and rhs and reduce the value modulo [`ArithmeticBackend::MODULUS`].
    fn add_mod(lhs: &Uint<N>, rhs: &Uint<N>) -> Uint<N> {
        lhs.add_mod(rhs, &Self::MODULUS)
    }

    /// Multiply lhs and rhs and reduce the value modulo [`ArithmeticBackend::MODULUS`].
    fn mul_mod(lhs: &Uint<N>, rhs: &Uint<N>) -> Uint<N>;
}

/// A ring of integers mod q.
pub struct Fq<const N: usize, B: ArithmeticBackend<N>> {
    _val: Uint<N>,

    _phantom: PhantomData<B>,
}

impl<const N: usize, B: ArithmeticBackend<N>> Fq<N, B> {}

impl<const N: usize, B: ArithmeticBackend<N>> TryFrom<Uint<N>> for Fq<N, B> {
    type Error = crate::Error;

    /// Fails if value >= C::MODULUS.
    fn try_from(value: Uint<N>) -> Result<Self, Self::Error> {
        if value.ge(&B::MODULUS) {
            return Err(Error::OutOfRange);
        }

        todo!();
    }
}
