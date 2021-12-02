use bindgen;

use cmake::Config;
use emsdk::Config as EmConfig;

use std::path::{Path, PathBuf};

fn compile_native(profile: &str, out_path: &Path) {
    let dst = Config::new("SEAL")
        .define("CMAKE_BUILD_TYPE", profile)
        .define("CMAKE_CXX_FLAGS_RELEASE", "-DNDEBUG -flto -O3")
        .define("CMAKE_C_FLAGS_RELEASE", "-DNDEBUG -flto -O3")
        .define("SEAL_BUILD_STATIC_SEAL_C", "ON")
        .define("SEAL_BUILD_DEPS", "ON")
        .define("SEAL_BUILD_SEAL_C", "ON")
        .define("SEAL_BUILD_BENCH", "OFF")
        .define("SEAL_BUILD_EXAMPLES", "OFF")
        .define("SEAL_BUILD_TESTS", "OFF")
        .define("SEAL_USE_CXX17", "ON")
        .define("SEAL_USE_INTRIN", "ON")
        .define("SEAL_USE_MSGSL", "OFF")
        .define("SEAL_USE_ZLIB", "ON")
        .define("SEAL_USE_ZSTD", "ON")
        .define("SEAL_PURE_SOURCETREE", "ON")
        .build();

    println!("cargo:rustc-link-search=native={}/build/lib", dst.display());
    println!("cargo:rustc-link-lib=static=sealc-3.7");
    println!("cargo:rustc-link-lib=static=seal-3.7");

    println!("-I{}", out_path.join("include").display());
}

fn compile_wasm(profile: &str, out_path: &Path) {
    let lib = PathBuf::from(std::env::var("OUT_DIR").unwrap())
        .join("build")
        .join("lib")
        .join("libseal-3.7.a");

    let _dst = EmConfig::new("SEAL")
        .define("CMAKE_BUILD_TYPE", profile)
        .define("CMAKE_CXX_FLAGS_RELEASE", "-DNDEBUG -flto -O3")
        .define("CMAKE_C_FLAGS_RELEASE", "-DNDEBUG -flto -O3")
        //.define("SEAL_BUILD_STATIC_SEAL_C", "ON")
        .define("SEAL_BUILD_DEPS", "ON")
        //.define("SEAL_BUILD_SEAL_C", "ON")
        .define("SEAL_BUILD_BENCH", "OFF")
        .define("SEAL_BUILD_EXAMPLES", "OFF")
        .define("SEAL_BUILD_TESTS", "OFF")
        .define("SEAL_USE_CXX17", "ON")
        .define("SEAL_USE_INTRIN", "ON")
        .define("SEAL_USE_MSGSL", "OFF")
        .define("SEAL_USE_ZLIB", "ON")
        .define("SEAL_USE_ZSTD", "ON")
        .define("SEAL_PURE_SOURCETREE", "ON")
        .define("SEAL_THIRDPARTY_DIR", &out_path.to_string_lossy().as_ref())
        .emcc_arg("-Wall")
        .emcc_arg("-flto")
        .emcc_arg("-O3")
        .emcc_arg("-s")
        .emcc_arg("WASM=1")
        .emcc_arg("-s")
        .emcc_arg("ALLOW_MEMORY_GROWTH=1")
        .emcc_arg(&lib.to_string_lossy())
        .build();
}

fn main() {
    // debug/release
    let profile = std::env::var("PROFILE").expect("Failed to get build profile");
    let out_path = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    let target = std::env::var("TARGET").expect("Failed to get target");

    let profile = if profile == "release" {
        "Release"
    } else if profile == "debug" {
        "Debug"
    } else {
        panic!("Unknown profile type {}", profile);
    };

    if target == "wasm32-unknown-unknown" {
        compile_wasm(&profile, &out_path);
    } else {
        compile_native(&profile, &out_path);
    }

    let bindings = bindgen::builder()
        .clang_arg(format!("-I{}", out_path.join("include/SEAL-3.7").display()))
        .clang_arg("-ISEAL/native/src")
        .clang_arg("-xc++")
        .clang_arg("-std=c++17")
        .detect_include_paths(true)
        .header("bindgen_wrapper.h")
        .parse_callbacks(Box::new(bindgen::CargoCallbacks))
        .allowlist_function("BatchEncoder_.*")
        .allowlist_function("Ciphertext_.*")
        .allowlist_function("CKKSEncoder_.*")
        .allowlist_function("CoeffModulus_.*")
        .allowlist_function("ContextData_.*")
        .allowlist_function("Decryptor_.*")
        .allowlist_function("EPQ_.*")
        .allowlist_function("EncParams_.*")
        .allowlist_function("Encryptor_.*")
        .allowlist_function("Evaluator_.*")
        .allowlist_function("GaloisKeys_.*")
        .allowlist_function("KeyGenerator_.*")
        .allowlist_function("KSwitchKeys_.*")
        .allowlist_function("MemoryManager_.*")
        .allowlist_function("MemoryPoolHandle_.*")
        .allowlist_function("Modulus_.*")
        .allowlist_function("Plaintext_.*")
        .allowlist_function("PublicKey_.*")
        .allowlist_function("RelinKeys_.*")
        .allowlist_function("SEALContext_.*")
        .allowlist_function("SecretKey_.*")
        .allowlist_function("Serialization_.*")
        .allowlist_function("ValCheck_.*")
        .generate()
        .unwrap();

    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("Failed to write bindings");
}
