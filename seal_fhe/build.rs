use cmake::Config;
use emsdk::Config as EmConfig;

use std::path::{Path, PathBuf};

fn compile_native(profile: &str, out_path: &Path) {
    let hexl = if std::env::var("CARGO_FEATURE_HEXL").is_ok() {
        "ON"
    } else {
        "OFF"
    };

    let dst = Config::new("SEAL")
        .define("CMAKE_BUILD_TYPE", profile)
        .define("CMAKE_CXX_FLAGS_RELEASE", "-DNDEBUG -O3")
        .define("CMAKE_C_FLAGS_RELEASE", "-DNDEBUG -O3")
        .define("SEAL_USE_GAUSSIAN_NOISE", "ON")
        .define("SEAL_BUILD_STATIC_SEAL_C", "ON")
        .define("SEAL_USE_INTEL_HEXL", hexl)
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
        .build();

    let out_path_suffix = if std::env::var("CARGO_CFG_WINDOWS").is_ok() {
        profile
    } else {
        ""
    };

    println!(
        "cargo:rustc-link-search=native={}/build/lib/{}",
        dst.display(),
        out_path_suffix
    );

    println!("cargo:rustc-link-lib=static=sealc-4.0");
    println!("cargo:rustc-link-lib=static=seal-4.0");

    println!("-I{}", out_path.join("include").display());
}

fn compile_wasm(profile: &str, _out_path: &Path) {
    let dst = EmConfig::new("SEAL")
        .define("CMAKE_BUILD_TYPE", profile)
        .define("CMAKE_CXX_FLAGS_RELEASE", "-DNDEBUG -g -O3")
        .define("CMAKE_C_FLAGS_RELEASE", "-DNDEBUG -g -O3")
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
        .build();

    let lib_path = format!("{}/lib/{}", dst.display(), "");

    println!("cargo:rustc-link-search=native={}", lib_path);

    println!("cargo:rustc-link-lib=static=sealc-4.0");
    println!("cargo:rustc-link-lib=static=seal-4.0");
}

fn main() {
    // debug/release
    let profile = std::env::var("PROFILE").expect("Failed to get build profile");
    let out_path = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    let target = std::env::var("TARGET").expect("Failed to get target");

    println!("cargo:rerun-if-changed=SEAL");

    let profile = if profile == "release" {
        "Release"
    } else if profile == "debug" {
        "Debug"
    } else {
        panic!("Unknown profile type {}", profile);
    };

    if target == "wasm32-unknown-emscripten" {
        compile_wasm(profile, &out_path);
    } else {
        compile_native(profile, &out_path);
    }

    let mut builder = bindgen::builder()
        .clang_arg(format!("-I{}", out_path.join("include/SEAL-3.7").display()))
        .clang_arg("-ISEAL/native/src")
        .clang_arg("-xc++")
        .clang_arg("-std=c++17");

    if target == "wasm32-unknown-emscripten" {
        // Bindgen appears to be broken under wasm. Just generate bindings with
        // the host's target.
        builder = builder
            .clang_arg("-target")
            .clang_arg("aarch64-apple-darwin")
            .detect_include_paths(false);
    }

    let builder = builder
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
        .allowlist_function("ValCheck_.*");

    let bindings = builder.generate().unwrap();

    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("Failed to write bindings");
}
