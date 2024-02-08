use std::{ffi::c_void, mem::size_of};

use cust::{
    context::CurrentContext,
    init,
    memory::{DeviceCopy, GpuBuffer, MemoryAdvise},
    prelude::*,
};
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

pub(crate) struct Runtime {
    ctx: Context,
    module: Module,
}

impl Runtime {
    pub fn get() -> &'static Self {
        &RUNTIME
    }

    pub fn alloc<T: DeviceCopy + Default>(&self, len: usize) -> Buffer<T> {
        CurrentContext::set_current(&self.ctx).unwrap();
        let data = UnifiedBuffer::new(&T::default(), len).unwrap();
        data.advise_read_mostly(false).unwrap();

        Buffer { data }
    }

    pub fn alloc_from_slice<T: DeviceCopy>(&self, data: &[T]) -> Buffer<T> {
        CurrentContext::set_current(&self.ctx).unwrap();
        let data = UnifiedBuffer::from_slice(data).unwrap();
        data.advise_read_mostly(true).unwrap();

        Buffer { data }
    }

    pub fn launch_kernel(&self, name: &'static str, args: &[KernelArg], grid: &Grid) {
        CurrentContext::set_current(&self.ctx).unwrap();
        let func = self.module.get_function(name).unwrap();

        let local = grid.local();
        let blocks: [u32; 3] = grid
            .global()
            .iter()
            .zip(local.iter())
            .map(|(g, l)| if g % l == 0 { g / l } else { g / l + 1 })
            .collect::<Vec<_>>()
            .try_into()
            .unwrap();

        let stream = Stream::new(StreamFlags::DEFAULT, None).unwrap();

        union ArgUnion {
            u32: u32,
            buffer: DevicePointer<u32>,
        }

        let args = args
            .iter()
            .map(|x| match x {
                KernelArg::Buffer(x) => ArgUnion {
                    buffer: x.data.as_device_ptr(),
                },
                KernelArg::U32(x) => ArgUnion { u32: *x },
            })
            .collect::<Vec<_>>();

        let arg_ptrs = args
            .iter()
            .map(|x| x as *const _ as *mut c_void)
            .collect::<Vec<_>>();

        unsafe {
            stream
                .launch(
                    &func,
                    (blocks[0], blocks[1], blocks[2]),
                    (local[0], local[1], local[2]),
                    0,
                    &arg_ptrs,
                )
                .unwrap();
        }

        CurrentContext::synchronize().unwrap();
    }
}

pub struct GpuVecIter<'a, T: GpuVec> {
    vec: &'a T,
    index: usize,
}

impl<'a, T: GpuVec> Iterator for GpuVecIter<'a, T> {
    type Item = T::Item;

    fn next(&mut self) -> Option<Self::Item> {
        let item = if self.index >= self.vec.len() {
            None
        } else {
            Some(self.vec.get(self.index))
        };

        self.index += 1;

        item
    }
}

pub struct IntoGpuVecIter<T: GpuVec> {
    vec: T,
    index: usize,
}

impl<T: GpuVec> Iterator for IntoGpuVecIter<T> {
    type Item = T::Item;

    fn next(&mut self) -> Option<Self::Item> {
        let item = if self.index >= self.vec.len() {
            None
        } else {
            Some(self.vec.get(self.index))
        };

        self.index += 1;

        item
    }
}

pub trait GpuVec
where
    Self: Sized,
{
    type Item;

    fn get_buffer(&self) -> &Buffer<u32>;

    fn len(&self) -> usize;

    fn u32_len(&self) -> usize {
        self.len() * size_of::<Self::Item>() / size_of::<u32>()
    }

    fn get(&self, i: usize) -> <Self as GpuVec>::Item;

    fn is_empty(&self) -> bool {
        self.len() == 0
    }

    fn iter(&self) -> GpuVecIter<Self> {
        GpuVecIter {
            index: 0,
            vec: self,
        }
    }

    fn into_iter(self) -> IntoGpuVecIter<Self> {
        IntoGpuVecIter {
            vec: self,
            index: 0,
        }
    }

    fn unary_gpu_kernel(&self, kernel_name: &'static str) -> Buffer<u32> {
        let runtime = Runtime::get();
        let out_buf = runtime.alloc(self.u32_len());

        runtime.launch_kernel(
            kernel_name,
            &[
                KernelArg::from(self.get_buffer()),
                KernelArg::from(&out_buf),
                KernelArg::from(self.len() as u32),
            ],
            &Grid::from(self.len() as u32),
        );

        out_buf
    }

    fn binary_gpu_kernel<Rhs: GpuVec>(&self, kernel_name: &'static str, rhs: &Rhs) -> Buffer<u32> {
        let runtime = Runtime::get();
        let out_buf = runtime.alloc(self.u32_len());

        runtime.launch_kernel(
            kernel_name,
            &[
                KernelArg::from(self.get_buffer()),
                KernelArg::from(rhs.get_buffer()),
                KernelArg::from(&out_buf),
                KernelArg::from(self.len() as u32),
            ],
            &Grid::from(self.len() as u32),
        );

        out_buf
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
        self.0 .0
    }

    fn local(&self) -> [u32; 3] {
        self.0 .1
    }
}

pub struct Buffer<T: DeviceCopy> {
    data: UnifiedBuffer<T>,
}

unsafe impl<T: DeviceCopy> Sync for Buffer<T> {}
unsafe impl<T: DeviceCopy> Send for Buffer<T> {}

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

        Runtime { module, ctx }
    };
}

#[cfg(test)]
mod tests {
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

        runtime.launch_kernel(
            "basic_kernel",
            &[
                KernelArg::from(&a),
                KernelArg::from(&b),
                KernelArg::from(&c),
                (a.len() as u32).into(),
            ],
            &Grid::from(a.len() as u32),
        );

        for ((a, b), c) in a
            .as_slice()
            .iter()
            .zip(b.as_slice().iter())
            .zip(c.as_slice().iter())
        {
            assert_eq!(a + b, *c);
        }
    }
}
