mod scalarvec;
use core::ops::Deref;
use std::{ffi::CString, mem::size_of, ops::DerefMut};

use ocl::{
    prm::cl_uint, Buffer, Context, Device, Kernel, MemMap, OclPrm, Platform, Program, Queue,
};
pub use scalarvec::GpuScalarVec;
mod ristrettovec;
pub use ristrettovec::GpuRistrettoPointVec;

use lazy_static::lazy_static;

const KERNEL_SOURCE: &str = include_str!("shaders/sunscreen_math.cl");

pub struct Runtime {
    device: Device,
    ctx: Context,
    queue: Queue,
    program: Program,
}

pub(crate) enum KernelArg<'a> {
    MappedBuffer(&'a MappedBuffer<cl_uint>),
    Buffer(&'a Buffer<cl_uint>),
    U32(cl_uint),
}

pub struct MappedBuffer<T: OclPrm> {
    buffer: Buffer<T>,
    map: MemMap<T>,
}

impl<T: OclPrm> Clone for MappedBuffer<T> {
    fn clone(&self) -> Self {
        Runtime::get().alloc_from_slice(&self.map)
    }
}

impl<T: OclPrm> MappedBuffer<T> {
    pub fn new(buffer: Buffer<T>) -> Self {
        let map = unsafe { buffer.map().read().enq().unwrap() };

        Self { buffer, map }
    }
}

impl<'a> From<&'a MappedBuffer<cl_uint>> for KernelArg<'a> {
    fn from(val: &'a MappedBuffer<cl_uint>) -> Self {
        Self::MappedBuffer(val)
    }
}

impl<'a> From<&'a Buffer<cl_uint>> for KernelArg<'a> {
    fn from(val: &'a Buffer<cl_uint>) -> Self {
        Self::Buffer(val)
    }
}

impl From<cl_uint> for KernelArg<'_> {
    fn from(value: cl_uint) -> Self {
        Self::U32(value)
    }
}

impl<T: OclPrm> Deref for MappedBuffer<T> {
    type Target = [T];

    fn deref(&self) -> &Self::Target {
        &self.map
    }
}

impl<T: OclPrm> DerefMut for MappedBuffer<T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        self.map.as_mut()
    }
}

pub struct Grid([(usize, usize); 3]);

impl From<[(usize, usize); 3]> for Grid {
    fn from(value: [(usize, usize); 3]) -> Self {
        Self(value)
    }
}

impl From<usize> for Grid {
    fn from(value: usize) -> Self {
        Self([(value, 128), (1, 1), (1, 1)])
    }
}

impl Grid {
    pub fn global(&self) -> [usize; 3] {
        [self.0[0].0, self.0[1].0, self.0[2].0]
    }

    pub fn local(&self) -> [usize; 3] {
        [self.0[0].1, self.0[1].1, self.0[2].1]
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

pub trait GpuVec
where
    Self: Sized,
{
    type Item;

    fn get_buffer(&self) -> &MappedBuffer<u32>;

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

    fn unary_gpu_kernel(&self, kernel_name: &'static str) -> MappedBuffer<u32> {
        let runtime = Runtime::get();
        let out_buf = runtime.alloc_internal(self.u32_len());

        dbg!(self.u32_len());
        dbg!(self.len());

        runtime.run_kernel(
            kernel_name,
            &[
                KernelArg::from(self.get_buffer()),
                KernelArg::from(&out_buf),
                KernelArg::from(self.len() as u32),
            ],
            &Grid::from(self.len()),
        );

        let map = unsafe { out_buf.map().enq() }.unwrap();

        MappedBuffer {
            buffer: out_buf,
            map
        }
    }

    fn binary_gpu_kernel<Rhs: GpuVec>(
        &self,
        kernel_name: &'static str,
        rhs: &Rhs,
    ) -> MappedBuffer<u32> {
        let runtime = Runtime::get();
        let out_buf = runtime.alloc_internal(self.u32_len());

        runtime.run_kernel(
            kernel_name,
            &[
                KernelArg::from(self.get_buffer()),
                KernelArg::from(rhs.get_buffer()),
                KernelArg::from(&out_buf),
                KernelArg::from(self.len() as u32),
            ],
            &Grid::from(self.len()),
        );

        let map = unsafe { out_buf.map().enq() }.unwrap();

        MappedBuffer {
            buffer: out_buf,
            map
        }
    }
}

impl Runtime {
    pub fn get() -> &'static Self {
        &RUNTIME
    }

    fn run_kernel(&self, name: &str, args: &[KernelArg], grid: &Grid) {
        let mut builder = Kernel::builder();

        let local = grid.local();
        let global: [usize; 3] = local
            .iter()
            .zip(grid.global())
            .map(|(l, g)| if g % l == 0 { g } else { ((g / l) + 1) * l })
            .collect::<Vec<_>>()
            .try_into()
            .unwrap();

        let mut kernel = builder
            .program(&self.program)
            .name(name)
            .queue(self.queue.clone())
            .global_work_size(&global)
            .local_work_size(local);

        for arg in args.iter() {
            match arg {
                KernelArg::Buffer(b) => {
                    kernel = kernel.arg(*b);
                },
                KernelArg::MappedBuffer(b) => {
                    kernel = kernel.arg(&b.buffer);
                },
                KernelArg::U32(v) => {
                    kernel = kernel.arg(v);
                }
            }
        }

        let kernel = kernel.build().unwrap();
        unsafe { kernel.enq() }.unwrap();

        self.queue.finish().unwrap();
    }

    fn alloc_internal<T: OclPrm>(&self, len: usize) -> Buffer<T> {
        Buffer::builder()
            .fill_val(T::default()) // Avoids dealing with MaybeUninit<T>
            .queue(self.queue.clone())
            .len(len)
            .build()
            .unwrap()
    }

    fn alloc<T: OclPrm>(&self, len: usize) -> MappedBuffer<T> {
        MappedBuffer::new(self.alloc_internal(len))
    }

    fn alloc_from_slice<T: OclPrm>(&self, data: &[T]) -> MappedBuffer<T> {
        let buffer = self.alloc_internal::<T>(data.len());

        let mut map = unsafe {
            buffer
                .map()
                .write_invalidate()
                .queue(&self.queue)
                .enq()
                .unwrap()
        };

        map.copy_from_slice(data);
        map.unmap().queue(&self.queue).enq().unwrap();

        self.queue.finish().unwrap();

        MappedBuffer::new(buffer)
    }
}

lazy_static! {
    static ref RUNTIME: Runtime = {
        let platform = Platform::first().unwrap();
        let device = Device::first(platform).unwrap();
        let ctx = Context::builder()
            .devices(device)
            .build()
            .unwrap();

        let queue = Queue::new(&ctx, device, None).unwrap();

        let compile_args = if cfg!(test) {
            CString::new("-DTEST").unwrap()
        } else {
            CString::new("").unwrap()
        };

        // Assert we can compile our program and print any errors if not.
        let program = Program::with_source(&ctx, &[CString::new(KERNEL_SOURCE).unwrap()], Some(&[device]), &compile_args).unwrap();

        Runtime {
            device,
            ctx,
            queue,
            program
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

    #[test]
    fn can_add_hello_world() {
        let runtime = Runtime::get();

        let a = [1u32, 2, 3, 4];
        let b = [2u32, 3, 4, 5];

        let a_gpu = runtime.alloc_from_slice(&a);
        let b_gpu = runtime.alloc_from_slice(&b);
        let mut c_gpu = runtime.alloc::<u32>(a.len());

        runtime.run_kernel(
            "basic_kernel",
            &[
                KernelArg::from(&a_gpu),
                KernelArg::from(&b_gpu),
                KernelArg::from(&c_gpu),
                KernelArg::from(a.len() as u32),
            ],
            &Grid::from(a.len()),
        );

        c_gpu.map.unmap().enq().unwrap();
        c_gpu.map = unsafe { c_gpu.buffer.map().enq() }.unwrap();

        assert_eq!(c_gpu.len(), a.len());

        for (c, (a, b)) in (*c_gpu).iter().zip(a.iter().zip(b.iter())) {
            assert_eq!(*c, a + b);
        }
    }

    #[test]
    fn can_clone_buffer() {
        let a = Runtime::get().alloc_from_slice(&[1, 2, 3, 4]);
        let b = a.clone();

        for (a, b) in a.iter().zip(b.iter()) {
            assert_eq!(a, b);
        }

        assert_ne!(a.map.as_ptr(), b.map.as_ptr());
    }

    #[test]
    fn can_pack_unpack_field2625() {
        let a = (0..40).into_iter().collect::<Vec<_>>();

        let runtime = Runtime::get();

        let a = runtime.alloc_from_slice(&a);
        let mut b = runtime.alloc::<u32>(a.len());

        runtime.run_kernel("test_can_pack_unpack_field2625", &[KernelArg::from(&a), KernelArg::from(&b), KernelArg::from(a.len() as u32)], &Grid::from(4));

        b.map.unmap().enq().unwrap();
        b.map = unsafe { b.buffer.map().enq() }.unwrap();

        for (i, j) in a.iter().zip(b.iter()) {
            assert_eq!(i, j);
        }
    }

    #[test]
    fn can_pack_unpack_ristretto_raw() {
        let a = (0..160).into_iter().collect::<Vec<_>>();
        let a_len = a.len();

        let runtime = Runtime::get();

        let a = runtime.alloc_from_slice(&a);
        let mut b = runtime.alloc_internal::<u32>(a_len);

        runtime.run_kernel("test_can_pack_unpack_ristretto", &[KernelArg::from(&a), KernelArg::from(&b), KernelArg::from((a.len() / 40) as u32)], &Grid::from(4));

        let b_map = unsafe { b.map().enq() }.unwrap();

        dbg!(&*a.map);
        dbg!(&*b_map);

        for (i, j) in a.iter().zip(b_map.iter()) {
            assert_eq!(i, j);
        }
    }
}
