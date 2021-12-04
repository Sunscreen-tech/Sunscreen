use std::path::PathBuf;
use std::process::Command;

fn main() {
    let output = Command::new("./emsdk/emsdk")
        .arg("install")
        .arg("latest")
        .output()
        .unwrap();

    if !output.status.success() {
        println!(
            "stderr\n==========\n{}",
            String::from_utf8_lossy(&output.stderr)
        );
        println!(
            "stdout\n==========\n{}",
            String::from_utf8_lossy(&output.stdout)
        );
        panic!(
            "'emsdk install latest' failed with exit code {}.",
            output.status
        );
    }

    let output = Command::new("./emsdk/emsdk")
        .arg("activate")
        .arg("latest")
        .output()
        .unwrap();

    if !output.status.success() {
        println!(
            "stderr\n==========\n{}",
            String::from_utf8_lossy(&output.stderr)
        );
        println!(
            "stdout\n==========\n{}",
            String::from_utf8_lossy(&output.stdout)
        );
        panic!(
            "'emsdk install latest' failed with exit code {}.",
            output.status
        );
    }

    let cwd = std::env::current_dir().unwrap();
    let out_dir = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    let emsdk_tools_dir = PathBuf::from(&cwd).join("emsdk/upstream/emscripten");
    let tools_symlink = out_dir.join("emsdk_tools");
    let emsdk_dir = PathBuf::from(&cwd).join("emsdk");
    let emsdk_symlink = out_dir.join("emsdk");

    std::fs::copy("emsdk/.emscripten", out_dir.join(".emscripten")).unwrap();

    if emsdk_symlink.exists() {
        std::fs::remove_file(&emsdk_symlink).unwrap();
    }

    if tools_symlink.exists() {
        std::fs::remove_file(&tools_symlink).unwrap();
    }

    #[cfg(windows)]
    {
        std::os::windows::fs::symlink_dir(emsdk_dir, &tools_symlink).unwrap();
    }

    #[cfg(not(windows))]
    {
        std::os::unix::fs::symlink(emsdk_tools_dir, &tools_symlink).unwrap();
        std::os::unix::fs::symlink(emsdk_dir, &emsdk_symlink).unwrap();
    }
}
