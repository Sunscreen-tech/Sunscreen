use cust::{init, prelude::*, memory::DeviceCopy};
use lazy_static::lazy_static;

mod ristrettovec;
mod scalarvec;

pub use ristrettovec::GpuRistrettoPointVec;
pub use scalarvec::GpuScalarVec;

const CUBIN: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/sunscreen_math.release.fatbin"));

pub(crate) struct Runtime {
    ctx: Context,
}

impl Runtime {
    pub fn get() -> &'static Self {
        &RUNTIME
    }

    pub fn alloc<T: DeviceCopy+ Default>(len: usize) -> Buffer<T> {
        let data = UnifiedBuffer::new(&T::default(), len).unwrap();

        Buffer {
            data
        }
    }

    pub fn alloc_from_slice<T: DeviceCopy>(data: &[T]) -> Buffer<T> {
        let data = UnifiedBuffer::from_slice(data).unwrap();

        Buffer {
            data
        }
    }
}

pub struct Buffer<T: DeviceCopy> {
    data: UnifiedBuffer<T>
}

lazy_static! {
    static ref RUNTIME: Runtime = {
        init(CudaFlags::empty()).unwrap();
        
        let device = Device::get_device(0).unwrap();
        let ctx = Context::new(device).unwrap();

        println!("{}.{}", device.get_attribute(cust::device::DeviceAttribute::ComputeCapabilityMajor).unwrap(), device.get_attribute(cust::device::DeviceAttribute::ComputeCapabilityMinor).unwrap());
        Module::from_fatbin(CUBIN, &[]).unwrap();

        Runtime {
            ctx
        }
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_create_runtime() {
        Runtime::get();
    }
}