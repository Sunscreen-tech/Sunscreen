use std::process::Output;

#[cfg(feature = "cuda")]
fn compile_cuda_shaders() {
    use std::{path::PathBuf, process::Command};

    use find_cuda_helper::find_cuda_root;

    let outdir = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    let cuda_root = find_cuda_root().unwrap();
    let shaders_dir = PathBuf::from(".")
        .join("src")
        .join("cuda_impl")
        .join("shaders");

    let nvcc = cuda_root.join("bin").join("nvcc");
    let nvlink = cuda_root.join("bin").join("nvlink");
    let is_cu_file = |file: &std::fs::DirEntry| {
        file.file_name().to_string_lossy().ends_with(".cu") && file.file_type().unwrap().is_file()
    };

    println!("cargo:rerun-if-changed=src/cuda_impl/shaders");

    for config in ["test", "release"] {
        let shaders = std::fs::read_dir(&shaders_dir)
            .unwrap()
            .filter_map(Result::ok)
            .filter(is_cu_file);

        let mut out_files = vec![];

        for s in shaders {
            let filename = s.file_name().to_string_lossy().into_owned();
            let srcfile = shaders_dir.join(&filename);
            let outfile = outdir.join(format!("{filename}.ptx"));

            let c = Command::new(&nvcc)
                .arg("-Werror")
                .arg("all-warnings")
                .arg("-I")
                .arg("src/cuda_impl/shaders/include")
                .arg("--ptx")
                .arg("--relocatable-device-code")
                .arg("true")
                .arg("--generate-line-info")
                .arg("-O4")
                .arg("-D")
                .arg("CUDA_C")
                .arg("-D")
                .arg(config.to_uppercase())
                .arg("-o")
                .arg(&outfile)
                .arg(srcfile)
                .output()
                .unwrap();

            validate_command_output(c, "nvcc compilation failed.");

            out_files.push(outfile);
        }

        let binary = outdir.join(format!("sunscreen_math.{config}.fatbin"));

        let c = Command::new(&nvlink)
            .arg("--arch")
            .arg("sm_75")
            .arg("-o")
            .arg(&binary)
            .arg("--verbose")
            .args(out_files)
            .output()
            .unwrap();

        validate_command_output(c, "nvcc compilation failed.");
    }
}

#[cfg(feature = "opencl")]
fn compile_opencl_shaders() {
    use std::{env, ffi::CString, fs::read_to_string, path::PathBuf, process::Command};

    use ocl::{Context, Device, Platform, Program};

    // We first preprocess `main.cl` with Clang so we don't
    // need to fool with include paths when calling `Program::with_source()`. We
    // then include_str!() the contents of the preprocessed files in
    // a constant vector in OUT_DIR/{test,release}-shaders.rs.
    //
    // This allows us to have a fairly sane developer workflow for shaders
    // whereby you can have multiple .cl files and headers under
    // `src/opencl_impl/sharders/include`.
    //
    // We're ultimately targeting OpenCL 1.2, as this is the version with
    // broadest support from vendors. The OpenCL 3.0 features that make it
    // compelling (i.e. offline compiler, C++, and SPIRV support) are in
    // fact optional and not supported by Nvidia, who is one of the most
    // important vendors.
    let outdir = PathBuf::from(env::var("OUT_DIR").unwrap());

    let shader_dir = PathBuf::from(".")
        .join("src")
        .join("opencl_impl")
        .join("shaders");

    let include_dir = PathBuf::from(".")
        .join("src")
        .join("opencl_impl")
        .join("shaders")
        .join("include");

    println!("cargo:rerun-if-changed={}", shader_dir.to_string_lossy());

    // We precompile the sources with e.g. -DTEST or -DRELEASE so you can conditionally compile
    // shaders for using with `cargo test` that don't get included in released libraries.
    for config in ["test", "release"] {
        println!("Profile {}", config);

        let main_cl = PathBuf::from(&shader_dir).join("main.cl");
        let outfile = PathBuf::from(&outdir).join(format!("{}_main.cl", config));

        let output = Command::new("clang")
            .arg("--precompile")
            .arg("-cl-no-stdinc")
            .arg("-I")
            .arg(&include_dir)
            .arg(format!("-D{}", config.to_ascii_uppercase()))
            .arg("-o")
            .arg(&outfile)
            .arg(&main_cl)
            .output()
            .unwrap();

        validate_command_output(output, "Shader precompilation failed.");

        let src = CString::new(read_to_string(outfile).unwrap()).unwrap();

        let platform = Platform::first().unwrap();
        let device = Device::first(platform).unwrap();
        let ctx = Context::builder().devices(device).build().unwrap();

        // Assert we can compile our program and print any errors if not.
        let program =
            Program::with_source(&ctx, &[src], Some(&[device]), &CString::new("").unwrap());

        match program {
            Ok(_) => {}
            Err(e) => {
                println!("{}", e);
                panic!();
            }
        }
    }
}

#[cfg(feature = "webgpu")]
// This simply concatenates all the wgsl shaders, which get compiled at runtime.
fn compile_wgsl_shaders() {
    use std::fs::{read_to_string, DirEntry, File};
    use std::io::Write;
    use std::path::PathBuf;

    use naga::valid::{Capabilities, ValidationFlags};
    use wgpu_core::pipeline::{CreateShaderModuleError, ShaderError};

    let outdir = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    let shader_dir = PathBuf::from(".")
        .join("src")
        .join("webgpu_impl")
        .join("shaders");

    println!("cargo:rerun-if-changed=src/webgpu_impl/shaders");

    for config in ["test", "release"] {
        let is_wgsl_file = |file: &DirEntry| {
            file.file_name().to_string_lossy().ends_with(".wgsl")
                && file.file_type().unwrap().is_file()
        };

        let is_test_wgsl_file = |file: &DirEntry| {
            file.file_name().to_string_lossy().ends_with(".test.wgsl")
                && file.file_type().unwrap().is_file()
        };

        let include_file: Box<dyn Fn(&DirEntry) -> bool> = if config == "test" {
            Box::new(is_wgsl_file)
        } else {
            Box::new(|file: &DirEntry| is_wgsl_file(file) && !is_test_wgsl_file(file))
        };

        let shaders = std::fs::read_dir(&shader_dir)
            .unwrap()
            .filter_map(Result::ok)
            .filter(include_file);

        let out_file_path = outdir.join(format!("shaders-{config}.wgsl"));

        {
            let mut out_file = File::create(&out_file_path).unwrap();

            for s in shaders {
                let data = read_to_string(s.path()).unwrap();

                writeln!(out_file, "{}", data).unwrap();
            }
        };

        // Validate the shader
        let shader_contents = read_to_string(&out_file_path).unwrap();

        let parse_result = naga::front::wgsl::parse_str(&shader_contents);

        if let Err(e) = parse_result {
            let e = ShaderError {
                source: shader_contents,
                label: None,
                inner: Box::new(e),
            };

            let e = CreateShaderModuleError::Parsing(e);
            panic!("{}", e);
        }

        let mut validator =
            naga::valid::Validator::new(ValidationFlags::all(), Capabilities::empty());

        let validation_results = validator.validate(&parse_result.unwrap());

        if let Err(e) = validation_results {
            let e = ShaderError {
                source: shader_contents,
                label: None,
                inner: Box::new(e),
            };

            let e = CreateShaderModuleError::Validation(e);

            panic!("{}", e.to_string());
        }
    }
}

#[cfg(feature = "metal")]
fn compile_metal_shaders() {
    use std::{path::PathBuf, process::Command};

    let outdir = std::env::var("OUT_DIR").unwrap();
    let shader_dir = PathBuf::from(".")
        .join("src")
        .join("metal_impl")
        .join("shaders");

    println!("cargo:rerun-if-changed=src/metal_impl/shaders");

    let include_dir = shader_dir.join("include");

    for config in ["test", "release"] {
        let mut air_files = vec![];

        let is_metal_file = |file: &std::fs::DirEntry| {
            file.file_name().to_string_lossy().ends_with(".metal")
                && file.file_type().unwrap().is_file()
        };

        let shaders = std::fs::read_dir(&shader_dir)
            .unwrap()
            .filter_map(Result::ok)
            .filter(is_metal_file);

        for file in shaders {
            let filename = file.file_name().to_string_lossy().into_owned();

            let out_name = if !file.file_name().to_string_lossy().ends_with(".metal")
                || !file.file_type().unwrap().is_file()
            {
                continue;
            } else {
                format!("{}.air", filename.strip_suffix(".metal").unwrap())
            };

            let outfile = PathBuf::from(&outdir).join(&out_name);

            air_files.push(outfile.clone());

            let output = Command::new("xcrun")
                .arg("-sdk")
                .arg("macosx")
                .arg("metal")
                .arg("-g")
                .arg("-Wall")
                .arg("-Werror")
                .arg(format!("-D{}", config.to_uppercase()))
                .arg("-c")
                .arg(file.path())
                .arg("-I")
                .arg(&include_dir)
                .arg("-o")
                .arg(outfile)
                .output()
                .unwrap();

            validate_command_output(output, "Shader compilation failed.");
        }

        let libout = PathBuf::from(&outdir).join(format!("curve25519-dalek.{config}.metallib"));

        let output = Command::new("xcrun")
            .arg("-sdk")
            .arg("macosx")
            .arg("metallib")
            .args(air_files)
            .arg("-o")
            .arg(libout)
            .output()
            .unwrap();

        validate_command_output(output, "Shader compilation failed.");
    }
}

#[allow(unused)]
fn validate_command_output(output: Output, panic_msg: &str) {
    if !output.status.success() {
        println!("===stderr===");
        println!("{}", String::from_utf8_lossy(&output.stderr));

        println!("===stdout===");
        println!("{}", String::from_utf8_lossy(&output.stdout));

        panic!("{}", panic_msg);
    }
}

fn main() {
    #[cfg(feature = "metal")]
    compile_metal_shaders();

    #[cfg(feature = "webgpu")]
    compile_wgsl_shaders();

    #[cfg(feature = "opencl")]
    compile_opencl_shaders();

    #[cfg(feature = "cuda")]
    compile_cuda_shaders();
}
