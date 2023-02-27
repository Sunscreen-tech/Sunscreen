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

            if !output.status.success() {
                println!("===stderr===");
                println!("{}", String::from_utf8_lossy(&output.stderr));

                println!("===stdout===");
                println!("{}", String::from_utf8_lossy(&output.stdout));

                panic!("Shader compilation failed.");
            }
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

        if !output.status.success() {
            println!("===stderr===");
            println!("{}", String::from_utf8_lossy(&output.stderr));

            println!("===stdout===");
            println!("{}", String::from_utf8_lossy(&output.stdout));

            panic!("Shader compilation failed.");
        }
    }
}

fn main() {
    #[cfg(feature = "metal")]
    compile_metal_shaders();

    #[cfg(feature = "webgpu")]
    compile_wgsl_shaders();
}
