use std::{path::PathBuf, process::Command};

fn compile_metal_shaders() {
    let outdir = std::env::var("OUT_DIR").unwrap();
    let shader_dir = PathBuf::from(".")
        .join("src")
        .join("metal_impl")
        .join("shaders");

    println!("cargo:rerun-if-changed=src/metal_impl/shaders");

    let include_dir = shader_dir.join("include");

    for config in ["test", "release"] {
        let mut air_files = vec![];
        let shaders = std::fs::read_dir(&shader_dir).unwrap();

        for s in shaders {
            let file = s.unwrap();
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
                .arg("-Wall")
                .arg("-Werror")
                .arg(format!("-D{}", config.to_uppercase()))
                //.arg("-S")
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
    compile_metal_shaders();
}