use std::{collections::HashMap, mem::size_of};
use std::ops::Deref;

use lazy_static::{lazy_static, __Deref};
use metal::{Device, ComputePipelineState, CommandQueue, Buffer, MTLResourceOptions, MTLSize, MTLCommandBufferStatus, Library};

mod scalarvec;
pub use scalarvec::*;

const SHADERLIB: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/curve25519-dalek.metallib"));

pub struct Runtime {
    device: Device,
    lib: Library,
    command_queue: CommandQueue,
}

/// TODO Remove
unsafe impl Sync for Runtime {}

lazy_static! {
    static ref RUNTIME: Runtime = {
        let device = Device::system_default().unwrap();
        let lib = device.new_library_with_data(SHADERLIB).unwrap();
        let command_queue = device.new_command_queue();

        Runtime {
            device: Device::system_default().unwrap(),
            lib,
            command_queue
        }
    };
}

impl Runtime {
    pub fn get() -> &'static Runtime {
        &*RUNTIME
    }

    pub fn alloc(&self, len: usize) -> Buffer {
        self.device.new_buffer(len as u64, MTLResourceOptions::StorageModeShared)
    }

    pub fn run(&self, kernel_name: &'static str, data: &[&Buffer], grid: [(u64, u64); 3]) {
        let command_buffer = self.command_queue.new_command_buffer();
        let encoder = command_buffer.new_compute_command_encoder();

        let gpu_fn = self.lib.get_function(kernel_name, None).unwrap();
        let gpu_fn = self.device.new_compute_pipeline_state_with_function(&gpu_fn).unwrap();

        dbg!(gpu_fn.max_total_threads_per_threadgroup());

        encoder.set_compute_pipeline_state(&gpu_fn);
        
        for (i, buf) in data.iter().enumerate() {
            encoder.set_buffer(i as u64, Some(buf), 0);
        }

        let global = MTLSize::new(grid[0].0, grid[1].0, grid[2].0);
        let local = MTLSize::new(grid[0].1, grid[1].1, grid[2].1);

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

pub(crate) struct U32Arg {
    pub(crate) data: Buffer,
}

impl U32Arg {
    pub fn new(val: u32) -> Self {
        let runtime = Runtime::get();

        let data = runtime.alloc(size_of::<u32>());

        unsafe { *(data.contents() as *mut u32) = val };

        Self {
            data
        }
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
    use core::slice;

    use super::*;

    #[test]
    fn can_init() {
        Runtime::get();
    }
}