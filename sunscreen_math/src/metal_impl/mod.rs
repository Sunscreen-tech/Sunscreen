use core::slice;
use std::mem::{size_of, MaybeUninit};
use std::ops::Deref;
use std::sync::Mutex;

use lazy_static::lazy_static;
use metal::{
    Buffer, CommandQueue, Device, Library, MTLCommandBufferStatus, MTLResourceOptions, MTLSize,
};

mod ristrettovec;
pub use ristrettovec::*;
mod scalarvec;
pub use scalarvec::*;

// In build.rs, we compile 2 variants of the curve25519-dalek.metallib library:
// test and release. In test, we #define the TEST macro, which exposes test kernels.
// The release library does not feature these kernels.
#[cfg(not(test))]
const SHADERLIB: &[u8] = include_bytes!(concat!(
    env!("OUT_DIR"),
    "/curve25519-dalek.release.metallib"
));

#[cfg(test)]
const SHADERLIB: &[u8] =
    include_bytes!(concat!(env!("OUT_DIR"), "/curve25519-dalek.test.metallib"));

pub struct Grid([(u64, u64); 3]);

pub struct Runtime {
    // Device is not known to be thread safe
    device: Mutex<Device>,

    // Library is not known to be thread safe
    lib: Mutex<Library>,

    // Command queues are documented to be thread safe.
    command_queue: CommandQueue,
}

// device and lib are guarded with Mutexes and CommandQueue is thread safe,
// so we are now okay to share Runtimes between threads.
unsafe impl Sync for Runtime {}

lazy_static! {
    static ref RUNTIME: Runtime = {
        let device = Device::system_default().unwrap();
        let lib = device.new_library_with_data(SHADERLIB).unwrap();
        let command_queue = device.new_command_queue();

        Runtime {
            device: Mutex::new(Device::system_default().unwrap()),
            lib: Mutex::new(lib),
            command_queue,
        }
    };
}

impl Runtime {
    pub fn get() -> &'static Runtime {
        &RUNTIME
    }

    pub fn alloc(&self, len: usize) -> Buffer {
        self.device
            .lock()
            .unwrap()
            .new_buffer(len as u64, MTLResourceOptions::StorageModeShared)
    }

    pub fn run(&self, kernel_name: &'static str, data: &[&Buffer], grid: Grid) {
        let command_buffer = self.command_queue.new_command_buffer();
        let encoder = command_buffer.new_compute_command_encoder();

        let gpu_fn = self
            .lib
            .lock()
            .unwrap()
            .get_function(kernel_name, None)
            .unwrap();
        let gpu_fn = self
            .device
            .lock()
            .unwrap()
            .new_compute_pipeline_state_with_function(&gpu_fn)
            .unwrap();

        dbg!(gpu_fn.max_total_threads_per_threadgroup());

        encoder.set_compute_pipeline_state(&gpu_fn);

        for (i, buf) in data.iter().enumerate() {
            encoder.set_buffer(i as u64, Some(buf), 0);
        }

        let global = MTLSize::new(grid.0[0].0, grid.0[1].0, grid.0[2].0);
        let local = MTLSize::new(grid.0[0].1, grid.0[1].1, grid.0[2].1);

        // TODO: We're relying on non-uniform thread groups. We
        // should either document this as a requirement or
        // do feature detection and modify our kernels to mask
        // off excess threads.
        // See https://developer.apple.com/metal/Metal-Feature-Set-Tables.pdf
        encoder.dispatch_threads(global, local);
        encoder.end_encoding();
        command_buffer.commit();
        command_buffer.wait_until_completed();
        assert_eq!(command_buffer.status(), MTLCommandBufferStatus::Completed);
    }
}

pub struct GpuVecIter<'a, P: GpuVec> {
    index: usize,
    gpu_vec: &'a P,
}

impl<'a, P: GpuVec> Iterator for GpuVecIter<'a, P> {
    type Item = P::Item;

    fn next(&mut self) -> Option<Self::Item> {
        let item = if self.index >= self.gpu_vec.len() {
            None
        } else {
            Some(self.gpu_vec.get(self.index))
        };

        self.index += 1;

        item
    }
}

/**
 * A vector of items stored on the GPU. This trait is agnostic as to the
 * data layout.
 */
pub trait GpuVec
where
    Self: Sized,
{
    /**
     * The type of item iterated over.
     */
    type Item: Sized;

    /**
     * Gets the underlying [`Buffer`] object.
     */
    fn get_buffer(&self) -> &Buffer;

    /**
     * Returns the length in [`Self::Item`].
     */
    fn len(&self) -> usize;

    fn len_bytes(&self) -> usize {
        self.len() * size_of::<Self::Item>()
    }

    /**
     * Returns a mutable slice of the GPU buffer. Since the data may not have
     * been initialized, we return `MaybeUninit<u32>` to ensure soundness.
     */
    unsafe fn buffer_slice_mut(&mut self) -> &mut [MaybeUninit<u32>] {
        let byte_len = self.len_bytes();

        slice::from_raw_parts_mut(
            self.get_buffer().contents() as *mut MaybeUninit<u32>,
            byte_len,
        )
    }

    /**
     * Return an immutable slice of the GPU buffer as u32 values.
     *
     * # Undefined behavior
     * Before using this method, you must first call `buffer_slice_mut`,
     * and initialize all the elements. Calling this method before doing
     * this is unsound.
     */
    unsafe fn buffer_slice(&self) -> &[u32] {
        let byte_len = self.len_bytes();

        slice::from_raw_parts(self.get_buffer().contents() as *const u32, byte_len)
    }

    fn get(&self, index: usize) -> Self::Item;

    fn iter(&self) -> GpuVecIter<Self> {
        GpuVecIter {
            index: 0,
            gpu_vec: self,
        }
    }

    /**
     * Clones the buffer in this vector and copies the contained data.
     *
     * # Remarks
     * Unfortunately, Clone is a foreign trait so we can't make a blanket
     * implementation for impl GpuVec. Furthermore, we can't return Self
     * in a trait method. So, we simply clone the buffer and let the
     * concrete type implement call this.
     */
    fn clone_buffer(&self) -> Buffer {
        let runtime = Runtime::get();

        let buffer = runtime.alloc(self.len_bytes());

        unsafe {
            std::ptr::copy_nonoverlapping(
                self.get_buffer().contents() as *const u8,
                buffer.contents() as *mut u8,
                self.len_bytes(),
            )
        };

        // Unfortunate we can't construct Self in a trait method.
        buffer
    }

    /**
     * Runs a 1 operand GPU kernel that produces 1 output.
     *
     * # TODO
     * Currently requires the Metal non-uniform threadgroups feature,
     * which may not be present on older GPUs.
     */
    fn unary_gpu_kernel(&self, kernel_name: &'static str) -> Buffer {
        let runtime = Runtime::get();
        let out_buf = runtime.alloc(self.len_bytes());
        let len = U32Arg::new(self.len() as u32);

        // out_buf gets mutated here, but the data is behind a pointer not a
        // reference so we don't break any aliasing rules
        runtime.run(
            kernel_name,
            &[self.get_buffer(), &out_buf, &len.data],
            Grid([(self.len() as u64, 64), (1, 1), (1, 1)]),
        );

        out_buf
    }

    /**
     * Run a 2 operand GPU kernel that produces 1 output.
     *
     * # TODO
     * Currently requires the Metal non-uniform threadgroups feature,
     * which may not be present on older GPUs.
     */
    fn binary_gpu_kernel<Rhs: GpuVec>(&self, kernel_name: &'static str, rhs: &Rhs) -> Buffer {
        assert_eq!(self.len(), rhs.len());

        let runtime = Runtime::get();
        let out_buf = runtime.alloc(self.len_bytes());
        let len = U32Arg::new(self.len() as u32);

        // out_buf gets mutated here, but the data is behind a pointer not a
        // reference so we don't break any aliasing rules
        runtime.run(
            kernel_name,
            &[self.get_buffer(), rhs.get_buffer(), &out_buf, &len.data],
            Grid([(self.len() as u64, 64), (1, 1), (1, 1)]),
        );

        // Unfortunate we can't construct Self in a trait method.
        out_buf
    }
}

pub(crate) struct U32Arg {
    pub(crate) data: Buffer,
}

impl U32Arg {
    pub fn new(val: u32) -> Self {
        let runtime = Runtime::get();

        let data = runtime.alloc(size_of::<u32>());

        unsafe { *(data.contents() as *mut u32) = val };

        Self { data }
    }
}

impl Deref for U32Arg {
    type Target = Buffer;

    fn deref(&self) -> &Self::Target {
        &self.data
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_init() {
        Runtime::get();
    }
}
