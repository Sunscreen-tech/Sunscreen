use std::ffi::c_void;

use cust::{init, prelude::*, memory::{DeviceCopy, GpuBuffer, MemoryAdvise}, context::CurrentContext};
use lazy_static::lazy_static;

mod ristrettovec;
mod scalarvec;

pub use ristrettovec::GpuRistrettoPointVec;
pub use scalarvec::GpuScalarVec;

#[cfg(not(test))]
const CUBIN: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/sunscreen_math.release.fatbin"));

#[cfg(test)]
const CUBIN: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/sunscreen_math.test.fatbin"));

pub enum KernelArg<'a> {
    Buffer(&'a Buffer<u32>),
    U32(u32),
}

impl From<u32> for KernelArg<'_> {
    fn from(value: u32) -> Self {
        Self::U32(value)
    }
}

impl<'a> From<&'a Buffer<u32>> for KernelArg<'a> {
    fn from(value: &'a Buffer<u32>) -> Self {
        Self::Buffer(value)
    }
}

impl<'a> KernelArg<'a> {
    /*
    pub fn as_ptr(&self) -> *mut c_void {
        match self {
            Self::Buffer(t) => {
                dbg!(t.data.as_device_ptr());
                dbg!(&t.data.as_device_ptr() as *const _ as *mut c_void);
                dbg!(t.data.as_device_ptr().as_ptr());
                t.data.as_device_ptr().as_ptr()
            },
            Self::U32(t) => t as *const _ as *mut c_void
        }
    } */
}

pub(crate) struct Runtime {
    ctx: Context,
    module: Module
}

impl Runtime {
    pub fn get() -> &'static Self {
        &RUNTIME
    }

    pub fn alloc<T: DeviceCopy+ Default>(&self, len: usize) -> Buffer<T> {
        CurrentContext::set_current(&self.ctx).unwrap();
        let data = UnifiedBuffer::new(&T::default(), len).unwrap();
        data.advise_read_mostly(false).unwrap();

        Buffer {
            data
        }
    }

    pub fn alloc_from_slice<T: DeviceCopy>(&self, data: &[T]) -> Buffer<T> {
        CurrentContext::set_current(&self.ctx).unwrap();
        let data = UnifiedBuffer::from_slice(data).unwrap();
        data.advise_read_mostly(true).unwrap();

        Buffer {
            data
        }
    }

    pub fn launch_kernel(&self, name: &'static str, args: &[KernelArg], grid: &Grid) {
        CurrentContext::set_current(&self.ctx).unwrap();
        let func = self.module.get_function(name).unwrap();

        let local = grid.local();
        let blocks: [u32; 3] = grid.global().iter().zip(local.iter()).map(|(g, l)| {
            if g % l == 0 { g / l } else { g / l + 1 }
        }).collect::<Vec<_>>().try_into().unwrap();

        let stream = Stream::new(StreamFlags::DEFAULT, None).unwrap();

        union ArgUnion {
            u32: u32,
            buffer: DevicePointer<u32>,
        };

        let args = args.iter().map(|x| {
            match x {
                KernelArg::Buffer(x) => ArgUnion { buffer: x.data.as_device_ptr() },
                KernelArg::U32(x) => ArgUnion { u32: *x }
            }
        }).collect::<Vec<_>>();

        let arg_ptrs = args.iter().map(|x| {
            x as *const _ as *mut c_void
        }).collect::<Vec<_>>();

        unsafe {
            stream.launch(&func, (blocks[0], blocks[1], blocks[2]), (local[0], local[1], local[2]), 0, &arg_ptrs).unwrap();
        }

        CurrentContext::synchronize().unwrap();
    }
}

pub struct Grid(([u32; 3], [u32; 3]));

impl From<u32> for Grid {
    fn from(value: u32) -> Self {
        Grid(([value, 1, 1], [256, 1, 1]))
    }
}

impl Grid {
    fn global(&self) -> [u32; 3] {
        self.0.0
    }

    fn local(&self) -> [u32; 3] {
        self.0.1
    }
}

pub struct Buffer<T: DeviceCopy> {
    data: UnifiedBuffer<T>,
}

impl<T: DeviceCopy> Buffer<T> {
    pub fn len(&self) -> usize {
        self.data.len()
    }

    pub fn as_slice(&self) -> &[T] {
        self.data.as_slice()
    }
}

lazy_static! {
    static ref RUNTIME: Runtime = {
        init(CudaFlags::empty()).unwrap();
        
        let device = Device::get_device(0).unwrap();
        let ctx = Context::new(device).unwrap();

        let module = Module::from_fatbin(CUBIN, &[]).unwrap();

        Runtime {
            module,
            ctx
        }
    };
}

#[cfg(test)]
mod tests {
    use cust::memory::MemoryAdvise;

    use super::*;

    #[test]
    fn can_create_runtime() {
        Runtime::get();
    }

    #[test]
    fn can_run_basic_kernel() {
        let runtime = Runtime::get();
        let a = runtime.alloc_from_slice(&(1..75u32).collect::<Vec<_>>());
        let b = runtime.alloc_from_slice(&(2..76u32).collect::<Vec<_>>());
        let c = runtime.alloc::<u32>(b.len());

        dbg!(&a.data);

        runtime.launch_kernel("basic_kernel", &[
            KernelArg::from(&a),
            KernelArg::from(&b),
            KernelArg::from(&c),
            (a.len() as u32).into()
        ], &Grid::from(a.len() as u32));

        for ((a, b), c) in a.as_slice().iter().zip(b.as_slice().iter()).zip(c.as_slice().iter()) {
            assert_eq!(a + b, *c);
        }
    }
}