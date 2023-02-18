#![cfg_attr(feature = "nightly-features", feature(test))]

#[cfg(feature = "metal")]
mod metal_impl;

mod cpu;
pub use cpu::{CpuScalarVec, CpuRistrettoPointVec};

#[cfg(feature = "pina")]
mod pina;
#[cfg(feature = "pina")]
pub use pina::{PinaScalarVec, PinaRistrettoPointVec};

#[cfg(all(feature = "pina", not(feature = "gpu")))]
compile_error!("feature pina requires a GPU backend feature.");

#[cfg(feature = "metal")]
pub use metal_impl::GpuRistrettoPointVec;

#[cfg(feature = "metal")]
pub use metal_impl::GpuScalarVec;

#[cfg(feature = "metal")]
pub use metal_impl::GpuVec;

#[cfg(feature = "pina")]
pub type RistrettoPointVec = PinaRistrettoPointVec;

#[cfg(all(feature = "gpu", not(feature = "pina")))]
pub type RistrettoPointVec = GpuRistrettoPointVec;

#[cfg(not(feature = "gpu"))]
pub type RistrettoPointVec = CpuRistrettoPointVec;

#[cfg(feature = "pina")]
pub type ScalarVec = PinaScalarVec;

#[cfg(all(feature = "gpu", not(feature = "pina")))]
pub type ScalarVec = GpuScalarVec;

#[cfg(not(feature = "gpu"))]
pub type ScalarVec = CpuScalarVec;
