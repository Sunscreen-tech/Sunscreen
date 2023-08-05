#![cfg_attr(feature = "nightly-features", feature(test))]
#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

//! This crate contains a set of math structures and operations for working with
//! FHE and ZKPs.

#[cfg(feature = "metal")]
mod metal_impl;

#[cfg(feature = "webgpu")]
mod webgpu_impl;

#[cfg(feature = "opencl")]
mod opencl_impl;

#[cfg(feature = "cuda")]
mod cuda_impl;

#[cfg(all(test, feature = "gpu"))]
/// CPU implementation
mod test_impl;

mod cpu;
pub use cpu::{CpuRistrettoPointVec, CpuScalarVec};

#[cfg(feature = "pina")]
mod pina;
use curve25519_dalek::ristretto::RistrettoPoint;
use curve25519_dalek::scalar::Scalar;
#[cfg(feature = "pina")]
pub use pina::{PinaRistrettoPointVec, PinaScalarVec};

#[cfg(all(feature = "pina", not(feature = "gpu")))]
compile_error!("feature pina requires a GPU backend feature.");

#[cfg(feature = "metal")]
pub use metal_impl::{GpuRistrettoPointVec, GpuScalarVec, GpuVec};

#[cfg(feature = "webgpu")]
pub use webgpu_impl::GpuRistrettoPointVec;

#[cfg(feature = "webgpu")]
pub use webgpu_impl::GpuScalarVec;

#[cfg(feature = "opencl")]
pub use opencl_impl::{GpuRistrettoPointVec, GpuScalarVec, GpuVec};

#[cfg(feature = "cuda")]
pub use cuda_impl::{GpuRistrettoPointVec, GpuScalarVec};

#[cfg(feature = "pina")]
/// A vector of [`RistrettoPoint`]s that supports batched operations.
pub type RistrettoPointVec = PinaRistrettoPointVec;

#[cfg(all(feature = "gpu", not(feature = "pina")))]
/// A vector of [`RistrettoPoint`]s that supports batched operations.
pub type RistrettoPointVec = GpuRistrettoPointVec;

#[cfg(not(feature = "gpu"))]
/// A vector of [`RistrettoPoint`]s that supports batched operations.
pub type RistrettoPointVec = CpuRistrettoPointVec;

#[cfg(feature = "pina")]
/// A vector of [`Scalar`]s that supports batched operations.
pub type ScalarVec = PinaScalarVec;

#[cfg(all(feature = "gpu", not(feature = "pina")))]
/// A vector of [`Scalar`]s that supports batched operations.
pub type ScalarVec = GpuScalarVec;

#[cfg(not(feature = "gpu"))]
/// A vector of [`Scalar`]s that supports batched operations.
pub type ScalarVec = CpuScalarVec;

/// Returns the size of [`Scalar`] in bits.
#[allow(unused)]
pub(crate) const fn scalar_size_bits() -> usize {
    std::mem::size_of::<Scalar>() * 8
}

mod error;
pub use error::*;

/// Traits and types for performing arithmetic over rings.
pub mod ring;

/// Computes the number of windows over a [`Scalar`] type for the given
/// `window_size` bits per window.
#[allow(unused)]
pub(crate) const fn multiexp_num_windows(window_size_bits: usize) -> usize {
    if scalar_size_bits() % window_size_bits == 0 {
        scalar_size_bits() / window_size_bits
    } else {
        scalar_size_bits() / window_size_bits + 1
    }
}

/// Compute the number of buckets for the given `window_size` bits per window.
#[allow(unused)]
pub(crate) const fn multiexp_num_buckets(window_size_bits: usize) -> usize {
    0x1 << window_size_bits
}

/// [`RistrettoPoint`]'s `PartialEq` implementation is a bit shitty and returns
/// false positives. This version is a bit spicier and bitwise compares the points.
/// It's also significantly faster than compressing the points and comparing for
/// equality.
#[allow(unused)]
pub(crate) fn ristretto_bitwise_eq(a: RistrettoPoint, b: RistrettoPoint) -> bool {
    let a: [u32; 40] = unsafe { std::mem::transmute(a) };
    let b: [u32; 40] = unsafe { std::mem::transmute(b) };

    a == b
}

#[macro_export]
/// This trait auto impls all combinations of borrowed and owned for binary std::ops traits.
/// To use this, you must impl `std::ops::Op<&T, Output=T> for &T` and this macro will auto
/// create the other traits to call your impl by borrowing the rhs or self as appropriate.
///
/// The arguments are as follows:
/// $trait:ty: The binary Ops trait you're trying to implement.
/// $ty:ty: the type for which you wish to derive the borrowed and owned variants.
/// ($($t:ty,($($bound:ty)+))*): The bounds on generics for $ty
/// $($gen_arg:ty)*): The generics on $ty
///
/// Example
/// ```rust
/// use num::traits::{WrappingAdd, WrappingMul, WrappingNeg, WrappingSub};
/// use std::ops::Add;
/// use sunscreen_math::refify;
///
/// pub trait WrappingSemantics:     
///     Copy + Clone + std::fmt::Debug + WrappingAdd + WrappingMul + WrappingSub + WrappingNeg
/// {
/// }
///
/// impl WrappingSemantics for u64 {}
///
/// #[repr(transparent)]
/// #[derive(Clone, Copy, Debug)]
/// pub struct ZInt<T>(T)
/// where
///     T: WrappingSemantics;
///
/// impl<T> Add<&ZInt<T>> for &ZInt<T>
/// where
/// T: WrappingSemantics,
/// {
///     type Output = ZInt<T>;
///
///     fn add(self, rhs: &ZInt<T>) -> Self::Output {
///         ZInt(self.0.wrapping_add(&rhs.0))
///     }
/// }
///
/// // Now if a is ZInt<T>, we can a + a, &a + a, a + &a, and &a + &a.
/// refify! {
/// Add, ZInt, (T, (WrappingSemantics)), T
/// }
/// ```
macro_rules! refify {
    ($trait:ty, $ty:ty, ($($t:ty,($($bound:ty)+))*), $($gen_arg:ty)*) => {
        paste::paste! {
            impl<$($gen_arg),*> $trait<$ty<$($gen_arg),*>> for $ty<$($gen_arg),*> where $($t: $($bound)++),*  {
                type Output = Self;

                fn [<$trait:lower>](self, rhs: Self) -> Self::Output {
                    (&self).[<$trait:lower>](&rhs)
                }
            }

            impl<$($gen_arg),*> $trait<&$ty<$($gen_arg),*>> for $ty<$($gen_arg),*> where $($t: $($bound)++),* {
                type Output = Self;

                fn [<$trait:lower>](self, rhs: &Self) -> Self::Output {
                    (&self).[<$trait:lower>](rhs)
                }
            }

            impl<$($gen_arg),*> $trait<$ty<$($gen_arg),*>> for &$ty<$($gen_arg),*> where $($t: $($bound)++),* {
                type Output = $ty<$($gen_arg),*>;

                fn [<$trait:lower>](self, rhs: $ty<$($gen_arg),*>) -> Self::Output {
                    (self).[<$trait:lower>](&rhs)
                }
            }
        }
    };
}
