use std::borrow::Cow;

use lazy_static::lazy_static;
use tokio::runtime::{Builder as TokioRuntimeBuilder, Runtime as TokioRuntime};
use wgpu::{Instance, RequestAdapterOptions, Device, Queue, ShaderModuleDescriptor, ShaderModule};

mod ristrettovec;
mod scalarvec;

pub use ristrettovec::GpuRistrettoPointVec;
pub use scalarvec::GpuScalarVec;

pub struct Runtime {
    device: Device,
    queue: Queue,
    shaders: ShaderModule,
}

impl Runtime {
    pub fn get() -> &'static Self {
        &RUNTIME
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
            source: wgpu::ShaderSource::Wgsl(Cow::Borrowed(include_str!("./shaders/hello.wgsl"))), // Moo
        });

        println!("{:#?}", device.features());

        Runtime {
            device,
            queue,
            shaders
        }
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_get_runtime() {
        let runtime = Runtime::get();
    }
}