use std::fs::{File};
use std::path::{PathBuf, Path};
use std::process::{Command, Stdio};

#[cfg(target_os = "windows")]
const HOST_OS: &str = "win";

#[cfg(target_os = "macos")]
const HOST_OS: &str = "mac";

#[cfg(target_os = "linux")]
const HOST_OS: &str = "linux";

#[cfg(not(target_os = "windows"))]
const EXTENSION: &str = "tbz2";

#[cfg(target_os = "windows")]
const EXTENSION: &str = "zip";

const REVISION: &str = "2ddc66235392b37e5b33477fd86cbe01a14b8aa2";

fn unzip<P>(file_name: P, dst: &Path) where P: Into<PathBuf> {
    let file_name = file_name.into();

    println!("{}", file_name.to_string_lossy());
    println!("{}", dst.to_string_lossy());

    let status = Command::new("tar")
        .current_dir(dst)
        .args(&["-jxvf", file_name.to_str().unwrap()])
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .unwrap()
        .wait()
        .unwrap();

    if !status.success() {
        panic!("Failed to extract emsdk");
    }
}

fn main() {
    /*
    let emscripten_zip = format!("wasm-binaries.{}", EXTENSION);
    let emscripten_url = format!("https://storage.googleapis.com/webassembly/emscripten-releases-builds/{}/{}/{}", HOST_OS, REVISION, &emscripten_zip);

    let out_dir = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    let zip_file_path = out_dir.join(emscripten_zip);

    if !std::path::Path::exists(&zip_file_path) {
        let mut zip_file = File::create(&zip_file_path).unwrap();

        println!("Downloading {} to {}", emscripten_url, zip_file_path.to_string_lossy());
        reqwest::blocking::get(emscripten_url)
            .unwrap()
            .copy_to(&mut zip_file)
            .unwrap();
        println!("Unzipping {}", zip_file_path.to_string_lossy());

        unzip(zip_file_path.file_name().unwrap(), &out_dir);
    } else {
        println!("{} exists. Skipping download", zip_file_path.to_string_lossy());
    }*/
}
