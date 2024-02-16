use std::ops::{Add, BitAnd, Mul, Shr};

pub use sunscreen_math::{One, Zero};

/// FFT based operations.
pub mod fft;

mod goldilocks_field;

/// Math operations on polynomials.
pub mod polynomial;

/// Operations for performing radix decompositions.
pub mod radix;
mod torus;
pub use torus::*;

mod basic;
pub use basic::*;

/// Types where the roots of unity in the given field can be found.
pub trait RootOfUnity
where
    Self: Sized,
{
    /// Find the n-th root of unity for the given field.
    ///
    /// # Remarks
    /// `w` is an n-th root of unity if `w^n = 1`.
    ///
    /// # Panics
    /// Implementers may choose to panic if no n-th root of unity
    /// exists. You should take care in choosing your field modulus
    /// to ensure the root does exist.
    fn nth_root_of_unity(n: u64) -> Self;
}

/// Numbers that have an inverse element.
pub trait Inverse
where
    Self: Sized,
{
    /// Find the inverse of the given number.
    fn inverse(&self) -> Self;
}

/// Numbers that can be raised to a power.
pub trait Pow<T>
where
    Self: Sized,
    T: Shr<u32, Output = T> + BitAnd<T, Output = T> + One + Eq,
{
    /// Raise the number to the given power.
    fn pow(&self, exp: T) -> Self;
}

impl<T, U> Pow<T> for U
where
    T: Shr<u32, Output = T> + BitAnd<T, Output = T> + One + Eq + Copy,
    U: sunscreen_math::One + Copy + Add<U, Output = U> + Mul<U, Output = U>,
{
    fn pow(&self, exp: T) -> U {
        let mut result = U::one();
        let mut power = *self;

        for i in 0..64 {
            if (exp >> i) & T::one() == T::one() {
                result = result * power
            }

            power = power * power;
        }

        result
    }
}

/// Reinterpret the bits of an unsigned value as signed.
///
/// # Remarks
/// This is different than a cast. For example, UINT_MAX becomes -1
/// when interpreted as a 2's complement signed value.
pub trait ReinterpretAsSigned {
    /// The output type of the reinterpretation.
    type Output: ToF64;

    /// Reinterpret the bits of an unsigned value as signed.
    fn reinterpret_as_signed(self) -> Self::Output;
}

macro_rules! impl_reinterpret_signed {
    ($ut:ty, $st:ty) => {
        impl ReinterpretAsSigned for $ut {
            type Output = $st;

            #[inline(always)]
            fn reinterpret_as_signed(self) -> Self::Output {
                unsafe { std::mem::transmute(self) }
            }
        }
    };
}

impl_reinterpret_signed!(u8, i8);
impl_reinterpret_signed!(u16, i16);
impl_reinterpret_signed!(u32, i32);
impl_reinterpret_signed!(u64, i64);
impl_reinterpret_signed!(u128, i128);

/// Reinterpret the bits of a signed value as unsigned.
///
/// # Remarks
/// This is different than a cast. For example, -1 becomes UINT_MAX
/// when interpreted as an unsigned integer.
pub trait ReinterpretAsUnsigned {
    /// The output type of the reinterpretation.
    type Output;

    /// Reinterpret the bits of a signed value as unsigned.
    fn reinterpret_as_unsigned(self) -> Self::Output;
}

macro_rules! impl_reinterpret_unsigned {
    ($st:ty, $ut:ty) => {
        impl ReinterpretAsUnsigned for $st {
            type Output = $ut;

            #[inline(always)]
            fn reinterpret_as_unsigned(self) -> Self::Output {
                unsafe { std::mem::transmute(self) }
            }
        }
    };
}

impl_reinterpret_unsigned!(i8, u8);
impl_reinterpret_unsigned!(i16, u16);
impl_reinterpret_unsigned!(i32, u32);
impl_reinterpret_unsigned!(i64, u64);
impl_reinterpret_unsigned!(i128, u128);

/// A type that can be converted from and to the fourier domain.
pub trait FrequencyTransform {
    /// Original domain representation.
    type BaseRepr;

    /// Fourier domain representation.
    type FrequencyRepr;

    /// Perform a fourier transform.
    fn forward(&self, data: &[Self::BaseRepr], output: &mut [Self::FrequencyRepr]);

    /// Perform an inverse fourier transform.
    fn reverse(&self, data: &[Self::FrequencyRepr], output: &mut [Self::BaseRepr]);
}

/// A trait that allows types to specify how many leading zeros or ones are in
/// the value.
pub trait LeadingBits {
    /// Count the number of leading zeros in the value.
    fn leading_zeros(self) -> u32;

    /// Count the number of leading ones in the value.
    fn leading_ones(self) -> u32;
}
