#![cfg_attr(feature = "nightly-features", feature(test))]

#[cfg(feature = "metal")]
mod metal_impl;

mod cpu;
pub use cpu::{CpuScalarVec, CpuRistrettoPointVec};

#[cfg(all(feature = "pina", not(feature = "gpu")))]
compile_error!("feature pina requires a GPU backend feature.");

#[cfg(feature = "metal")]
pub use metal_impl::GpuRistrettoPointVec;

#[cfg(feature = "metal")]
pub use metal_impl::GpuScalarVec;

#[cfg(feature = "metal")]
pub use metal_impl::GpuVec;

#[cfg(feature = "gpu")]
pub type RistrettoPointVec = GpuRistrettoPointVec;

#[cfg(not(feature = "gpu"))]
pub type RistrettoPointVec = CpuRistrettoPointVec;

#[cfg(feature = "gpu")]
pub type ScalarVec = GpuScalarVec;

#[cfg(not(feature = "gpu"))]
pub type ScalarVec = CpuScalarVec;
