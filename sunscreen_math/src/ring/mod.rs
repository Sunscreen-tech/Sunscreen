use crate::{refify, Error};
pub use crypto_bigint::Uint;
use num::traits::{WrappingAdd, WrappingMul, WrappingNeg, WrappingSub};
use paste::paste;
use std::{
    marker::PhantomData,
    ops::{Add, Mul},
};

mod barret;
pub use barret::*;

pub trait Montgomery {
    fn to_montgomery_form(&self) -> Self;

    fn to_standard_form(&self) -> Self;
}

pub trait Ring:
    std::fmt::Debug
    + Clone
    + Mul<Self, Output = Self>
    + for<'a> Mul<&'a Self, Output = Self>
    + Add<Self, Output = Self>
    + for<'a> Add<&'a Self, Output = Self>
    + Montgomery
{
}

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

impl<T> Montgomery for ZInt<T>
where
    T: WrappingSemantics,
{
    /// For integers mod 2^{8, 16, 32, ...}, we don't actually need Montgomery
    /// arithmetic as wrapping does the modulus reduction for us. Thus, this
    /// method is a no-op.
    fn to_montgomery_form(&self) -> Self {
        *self
    }

    /// For integers mod 2^{8, 16, 32, ...}, we don't actually need Montgomery
    /// arithmetic as wrapping does the modulus reduction for us. Thus, this
    /// method is a no-op.
    fn to_standard_form(&self) -> Self {
        *self
    }
}

impl<T> Ring for ZInt<T> where T: WrappingSemantics {}

pub trait ArithmeticBackend<const N: usize> {
    const MODULUS: Uint<N>;

    fn add_mod(lhs: &Uint<N>, rhs: &Uint<N>) -> Uint<N> {
        lhs.add_mod(rhs, &Self::MODULUS)
    }

    fn mul_mod(lhs: &Uint<N>, rhs: &Uint<N>) -> Uint<N>;
}

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
