fn main() {
    let target = std::env::var("TARGET").expect("Failed to get target");

    if target == "wasm32-unknown-emscripten" {
        println!("cargo:rustc-link-arg=-sALLOW_MEMORY_GROWTH");
        println!("cargo:rustc-link-arg=-sDISABLE_EXCEPTION_CATCHING=0");
    }
}