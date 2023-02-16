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
}
