use core::slice;
use std::{borrow::Cow, ops::Deref, mem::{align_of, MaybeUninit, size_of}};

use bytemuck::{cast, cast_slice, Pod};
use futures::channel::oneshot;
use lazy_static::lazy_static;
use tokio::runtime::{Builder as TokioRuntimeBuilder, Runtime as TokioRuntime};
use wgpu::{Instance, RequestAdapterOptions, Device, Queue, ShaderModuleDescriptor, ShaderModule, BufferDescriptor, COPY_BUFFER_ALIGNMENT, BufferUsages, Buffer, ComputePipelineDescriptor, BindGroupDescriptor, BindGroupEntry, CommandEncoderDescriptor, ComputePassDescriptor, util::{BufferInitDescriptor, DeviceExt}, Maintain};

mod ristrettovec;
mod scalarvec;

pub use ristrettovec::GpuRistrettoPointVec;
pub use scalarvec::GpuScalarVec;

pub struct Runtime {
    device: Device,
    queue: Queue,
    shaders: ShaderModule,
}

// In build.rs, we compile 2 variants of the curve25519-dalek.metallib library:
// test and release. In test, we #define the TEST macro, which exposes test kernels.
// The release library does not feature these kernels.
#[cfg(not(test))]
const SHADERS: &str = include_str!(concat!(
    env!("OUT_DIR"),
    "/shaders-release.wgsl"
));

#[cfg(test)]
const SHADERS: &str =
    include_str!(concat!(env!("OUT_DIR"), "/shaders-test.wgsl"));

fn assert_aligned<T>(ptr: *const T) {
    assert!(ptr.cast::<()>().align_offset(align_of::<T>()) == 0);
}

pub struct Grid((u32, u32, u32));

impl Grid {
    pub fn new(x: u32, y: u32, z: u32) -> Self {
        Self((x, y, z))
    }
}

trait BufferExt {
    fn clone(&self) -> Buffer;

    fn copy_into(&self, dst: &Buffer);

    fn get_data<T: Pod + Copy>(&self) -> Vec<T>;
}

impl BufferExt for Buffer {
    fn clone(&self) -> Buffer {
        let runtime = Runtime::get();

        let cloned = runtime.alloc::<u8>(self.size() as usize);
        self.copy_into(&cloned);

        cloned
    }

    fn copy_into(&self, dst: &Buffer) {
        let runtime = Runtime::get();

        let mut encoder = runtime.device.create_command_encoder(&CommandEncoderDescriptor { label: None });
        encoder.copy_buffer_to_buffer(self, 0, &dst, 0, self.size());

        runtime.queue.submit(Some(encoder.finish()));
        runtime.device.poll(wgpu::MaintainBase::Wait);
    }

    fn get_data<T: Pod + Copy>(&self) -> Vec<T> {
        let (s, r) = oneshot::channel();

        // In vanilla WebGPU, if you use the MAP_READ flag, you must also set COPY_DST
        // and *only* COPY_DST. This means you can't use such buffers in compute 
        // shaders. As such, we create a temporary buffer with these properties so we
        // can copy data out of the shader-capable buffer and return the results.
        let runtime = Runtime::get();

        let copy_buf = runtime.device.create_buffer(&BufferDescriptor {
            label: None,
            size: self.size(),
            usage: BufferUsages::MAP_READ | BufferUsages::COPY_DST,
            mapped_at_creation: false
        });

        self.copy_into(&copy_buf);

        let buffer_slice = copy_buf.slice(..);
        buffer_slice.map_async(wgpu::MapMode::Read, move |v| { s.send(v).unwrap(); });

        runtime.device.poll(Maintain::Wait);

        TOKIO_RUNTIME.block_on(async {
            r.await.unwrap().unwrap();

            let s = buffer_slice.get_mapped_range();
            bytemuck::cast_slice(&s).to_owned()
        })
    }
}

impl Runtime {
    pub fn get() -> &'static Self {
        &RUNTIME
    }

    /// Allocates space for `len` elements of type `T`.
    pub fn alloc<T>(&self, len: usize) -> Buffer {
        let len = size_of::<T>() * len;

        // Round up len to a multiple of COPY_BUFFER_ALIGNMENT, as required to use 
        // mapped_at_creation=true
        let len = if len % COPY_BUFFER_ALIGNMENT as usize == 0 { len } else { (len / COPY_BUFFER_ALIGNMENT as usize + 1) * COPY_BUFFER_ALIGNMENT as usize};

        let buffer = self.device.create_buffer(&BufferDescriptor {
            label: None,
            size: len as u64,
            usage: BufferUsages::STORAGE | BufferUsages::COPY_SRC | BufferUsages::COPY_DST,
            mapped_at_creation: false
        });

        buffer
    }

    pub fn alloc_from_slice<T: Pod>(&self, data: &[T]) -> Buffer {
        let len = size_of::<T>() * data.len();

        // Round up len to a multiple of COPY_BUFFER_ALIGNMENT, as required to use 
        // mapped_at_creation=true
        let len = if len % COPY_BUFFER_ALIGNMENT as usize == 0 { len } else { (len / COPY_BUFFER_ALIGNMENT as usize + 1) * COPY_BUFFER_ALIGNMENT as usize};

        let buffer = self.device.create_buffer_init(&BufferInitDescriptor {
            label: None,
            contents: cast_slice(data),
            usage: BufferUsages::STORAGE | BufferUsages::COPY_SRC | BufferUsages::COPY_DST,
        });

        buffer
    }

    pub fn run(&self, kernel_name: &'static str, args: &[&Buffer], threadgroups: &Grid) {
        let pipeline = self.device.create_compute_pipeline(&ComputePipelineDescriptor {
            label: None,
            layout: None,
            module: &self.shaders,
            entry_point: kernel_name
        });

        let bindings = args.iter().enumerate().map(|(i, b)| {
            BindGroupEntry {
                binding: i as u32,
                resource: b.as_entire_binding()
            }
        }).collect::<Vec<_>>();

        let layout = pipeline.get_bind_group_layout(0);

        let bind_group = self.device.create_bind_group(&BindGroupDescriptor {
            label: None,
            layout: &layout,
            entries: &bindings,
        });

        let mut encoder = self.device.create_command_encoder(&CommandEncoderDescriptor { label: None });

        {
            let (x, y, z) = threadgroups.0;

            let mut pass = encoder.begin_compute_pass(&ComputePassDescriptor { label: None });
            pass.set_pipeline(&pipeline);
            pass.set_bind_group(0, &bind_group, &[]);
            pass.dispatch_workgroups(x, y, z);
        }

        self.queue.submit(Some(encoder.finish()));

        assert!(self.device.poll(wgpu::MaintainBase::Wait));
    }
}


lazy_static! {
    static ref TOKIO_RUNTIME: TokioRuntime = {
        TokioRuntimeBuilder::new_current_thread()
            .build()
            .unwrap()
    };

    static ref RUNTIME: Runtime = {
        let fut = TOKIO_RUNTIME.spawn(async {
            let instance = Instance::default();

            let adapter = instance
                .request_adapter(&RequestAdapterOptions::default())
                .await
                .unwrap();

            adapter
                .request_device(
                    &wgpu::DeviceDescriptor {
                        label: None,
                        features: wgpu::Features::empty(),
                        limits: wgpu::Limits::downlevel_defaults(),
                    },
                    None,
                )
                .await
                .unwrap()
        });

        let (device, queue) = TOKIO_RUNTIME.block_on(fut).unwrap();

        let shaders = device.create_shader_module(ShaderModuleDescriptor {
            label: None,
            source: wgpu::ShaderSource::Wgsl(Cow::Borrowed(SHADERS)), // Moo
        });

        println!("{:#?}", device.features());

        Runtime {
            device,
            queue,
            shaders
        }
    };
}

pub struct GpuU32 {
    data: Buffer
}

impl GpuU32 {
    pub fn new(val: u32) -> Self {
        let runtime = Runtime::get();
        let data = runtime.alloc_from_slice(&[val]);

        Self {
            data
        }
    }
}

#[cfg(test)]
mod tests {
    use std::mem::size_of;

    use super::*;

    #[test]
    fn can_get_runtime() {
        let runtime = Runtime::get();
    }

    #[test]
    fn can_add_vectors() {
        let runtime = Runtime::get();

        let a = [1u32, 2, 3, 4];
        let b = [4u32, 5, 6, 7];

        let a_gpu = runtime.alloc_from_slice(&a);
        let b_gpu = runtime.alloc_from_slice(&b);
        let c_gpu = runtime.alloc::<u32>(a.len());

        let n = GpuU32::new(a.len() as u32);

        runtime.run("add", &[&a_gpu, &b_gpu, &c_gpu, &n.data], &Grid::new(1, 1, 1));

        for (c, (a, b)) in c_gpu.get_data::<u32>().iter().zip(a.iter().zip(b.iter())) {
            assert_eq!(*c, a + b);
        }
    }
}