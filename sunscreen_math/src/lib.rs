#![cfg_attr(feature = "nightly-features", feature(test))]

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
