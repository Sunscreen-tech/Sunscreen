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

/// Traits and types for performing arithmetic with polynomials.
pub mod poly;

mod misc_traits;
pub use misc_traits::*;

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
