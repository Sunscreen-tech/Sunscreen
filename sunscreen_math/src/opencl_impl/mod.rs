mod scalarvec;
use std::{ffi::CString, marker::PhantomData, mem::size_of, time::Instant};

use log::trace;
use ocl::{
    prm::cl_uint, Buffer as OclBuffer, Context, Device, Kernel, OclPrm, Platform, Program,
    Queue,
};
pub use scalarvec::GpuScalarVec;
mod ristrettovec;
pub use ristrettovec::GpuRistrettoPointVec;

use lazy_static::lazy_static;

const KERNEL_SOURCE: &str = include_str!("shaders/sunscreen_math.cl");

pub struct Runtime {
    queue: Queue,
    program: Program,
}

pub(crate) enum KernelArg<'a> {
    Buffer(&'a Buffer<cl_uint>),
    OclBuffer(&'a OclBuffer<cl_uint>),
    U32(cl_uint),
}

pub struct Buffer<T: OclPrm> {
    buffer: OclBuffer<T>,
}

impl<T: OclPrm> Clone for Buffer<T> {
    fn clone(&self) -> Self {
        let queue = &Runtime::get().queue;
        let dst = OclBuffer::builder()
            .queue(queue.clone())
            .len(self.buffer.len())
            .build()
            .unwrap();

        self.buffer.copy(&dst, None, None).enq().unwrap();

        queue.finish().unwrap();

        Self { buffer: dst }
    }
}

impl<T: OclPrm> Buffer<T> {
    pub fn new(buffer: OclBuffer<T>) -> Self {
        Self { buffer }
    }

    /**
     * Allocate a buffer on the host and copy this GPU buffer's contents into it.
     */
    pub fn as_vec(&self) -> Vec<T> {
        let mut dst = vec![T::default(); self.buffer.len()];

        let start = Instant::now();

        self.buffer.read(&mut dst).enq().unwrap();

        let time = start.elapsed().as_secs_f64();
        let bytes = self.buffer.len() * size_of::<T>();

        trace!("Read GPU buffer: {}b {}s {}b/s", bytes, time, bytes as f64 / time);

        dst
    }
}

impl<'a> From<&'a Buffer<cl_uint>> for KernelArg<'a> {
    fn from(val: &'a Buffer<cl_uint>) -> Self {
        Self::Buffer(val)
    }
}

impl<'a> From<&'a OclBuffer<cl_uint>> for KernelArg<'a> {
    fn from(val: &'a OclBuffer<cl_uint>) -> Self {
        Self::OclBuffer(val)
    }
}

impl From<cl_uint> for KernelArg<'_> {
    fn from(value: cl_uint) -> Self {
        Self::U32(value)
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
        Self([(value, 256), (1, 1), (1, 1)])
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
    vec: Vec<u32>,
    index: usize,
    _phantom: PhantomData<T>,
}

impl<T: GpuVec> Iterator for IntoGpuVecIter<T> {
    type Item = T::Item;

    fn next(&mut self) -> Option<Self::Item> {
        let item = if self.index >= T::u32_len_to_t_len(self.vec.len()) {
            None
        } else {
            Some(T::get(&self.vec, self.index))
        };

        self.index += 1;

        item
    }
}

pub struct GpuVecIter<T: GpuVec> {
    vec: Vec<u32>,
    index: usize,
    _phantom: PhantomData<T>,
}

impl<'a, T: GpuVec> Iterator for GpuVecIter<T> {
    type Item = T::Item;

    fn next(&mut self) -> Option<Self::Item> {
        let item = if self.index >= T::u32_len_to_t_len(self.vec.len()) {
            None
        } else {
            Some(T::get(&self.vec, self.index))
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

    fn u32_len_to_t_len(len: usize) -> usize {
        len * size_of::<u32>() / size_of::<<Self as GpuVec>::Item>()
    }

    fn get(data: &[u32], i: usize) -> <Self as GpuVec>::Item;

    fn is_empty(&self) -> bool {
        self.len() == 0
    }

    fn iter(&self) -> GpuVecIter<Self> {
        GpuVecIter {
            index: 0,
            vec: self.get_buffer().as_vec(),
            _phantom: PhantomData,
        }
    }

    fn into_iter(self) -> IntoGpuVecIter<Self> {
        IntoGpuVecIter {
            vec: self.get_buffer().as_vec(),
            index: 0,
            _phantom: PhantomData,
        }
    }

    fn unary_gpu_kernel(&self, kernel_name: &'static str) -> Buffer<u32> {
        let runtime = Runtime::get();

        let out_buf = runtime.alloc_internal(self.u32_len());

        runtime.run_kernel(
            kernel_name,
            &[
                KernelArg::from(self.get_buffer()),
                KernelArg::from(&out_buf),
                KernelArg::from(self.len() as u32),
            ],
            &Grid::from(self.len()),
        );

        Buffer { buffer: out_buf }
    }

    fn binary_gpu_kernel<Rhs: GpuVec>(&self, kernel_name: &'static str, rhs: &Rhs) -> Buffer<u32> {
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

        Buffer { buffer: out_buf }
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
            .global_work_size(global)
            .local_work_size(local);

        for arg in args.iter() {
            match arg {
                KernelArg::OclBuffer(b) => {
                    kernel = kernel.arg(*b);
                }
                KernelArg::Buffer(b) => {
                    kernel = kernel.arg(&b.buffer);
                }
                KernelArg::U32(v) => {
                    kernel = kernel.arg(v);
                }
            }
        }

        let kernel = kernel.build().unwrap();
        unsafe { kernel.enq() }.unwrap();

        self.queue.finish().unwrap();
    }

    fn alloc_internal<T: OclPrm>(&self, len: usize) -> OclBuffer<T> {
        OclBuffer::builder()
            .queue(self.queue.clone())
            .len(len)
            .build()
            .unwrap()
    }

    #[allow(unused)]
    fn alloc<T: OclPrm>(&self, len: usize) -> Buffer<T> {
        Buffer::new(self.alloc_internal(len))
    }

    fn alloc_from_slice<T: OclPrm>(&self, data: &[T]) -> Buffer<T> {
        let start = Instant::now();

        let buffer = OclBuffer::builder()
            .queue(self.queue.clone())
            .len(data.len())
            .copy_host_slice(data)
            .build()
            .unwrap();

        let time = start.elapsed().as_secs_f64();
        let bytes = data.len() * size_of::<T>();

        trace!("Read GPU buffer: {}b {}s {}b/s", bytes, time, bytes as f64 / time);

        Buffer::new(buffer)
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
        let c_gpu = runtime.alloc::<u32>(a.len());

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

        for (c, (a, b)) in c_gpu.as_vec().iter().zip(a.iter().zip(b.iter())) {
            assert_eq!(*c, a + b);
        }
    }

    #[test]
    fn can_clone_buffer() {
        let a = Runtime::get().alloc_from_slice(&[1, 2, 3, 4]);
        let b = a.clone();

        let a_vec = a.as_vec();
        let b_vec = b.as_vec();

        for (a, b) in a_vec.iter().zip(b_vec.iter()) {
            assert_eq!(a, b);
        }
    }

    #[test]
    fn can_pack_unpack_field2625() {
        let a = (0..40).collect::<Vec<_>>();

        let runtime = Runtime::get();

        let a = runtime.alloc_from_slice(&a);
        let b = runtime.alloc::<u32>(40);

        runtime.run_kernel(
            "test_can_pack_unpack_field2625",
            &[
                KernelArg::from(&a),
                KernelArg::from(&b),
                KernelArg::from(40u32),
            ],
            &Grid::from(4),
        );

        let a = a.as_vec();
        let b = b.as_vec();

        for (i, j) in a.iter().zip(b.iter()) {
            assert_eq!(i, j);
        }
    }

    #[test]
    fn can_pack_unpack_ristretto_raw() {
        let a = (0..160).collect::<Vec<_>>();
        let a_len = a.len();

        let runtime = Runtime::get();

        let a = runtime.alloc_from_slice(&a);
        let b = runtime.alloc::<u32>(a_len);

        runtime.run_kernel(
            "test_can_pack_unpack_ristretto",
            &[
                KernelArg::from(&a),
                KernelArg::from(&b),
                KernelArg::from(160u32 / 40),
            ],
            &Grid::from(4),
        );

        let a = a.as_vec();
        let b = b.as_vec();

        for (i, j) in a.iter().zip(b.iter()) {
            assert_eq!(i, j);
        }
    }
}
