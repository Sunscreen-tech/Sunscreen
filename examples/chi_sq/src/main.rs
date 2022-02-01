use sunscreen_compiler::{
    circuit,
    types::{bfv::Signed, Cipher},
    CircuitFn, CircuitInput, Compiler, PlainModulusConstraint, Runtime,
};

use std::ops::*;
use std::time::Instant;

fn chi_sq_impl<T>(n_0: T, n_1: T, n_2: T) -> (T, T, T, T)
where
    T: Add<T, Output = T> + Mul<T, Output = T> + Sub<T, Output = T> + Copy,
    i64: Mul<T, Output = T>,
{
    let a = 4 * n_0 * n_2 - n_1 * n_1;
    let a_sq = a * a;

    let b_1 = 2 * n_0 + n_1;
    let b_1_sq = 2 * b_1 * b_1;

    let x = 2 * n_2 + n_1;

    let b_2 = (2 * n_0 + n_1) * x;
    let b_3 = 2 * x * x;

    (a_sq, b_1_sq, b_2, b_3)
}

fn chi_sq_optimized_impl<T>(n_0: T, n_1: T, n_2: T) -> (T, T, T, T)
where
    T: Add<T, Output = T> + Mul<T, Output = T> + Sub<T, Output = T> + Copy,
    i64: Mul<T, Output = T>,
{
    let x = n_0 + n_0 + n_1;
    let y = n_2 + n_2 + n_1;

    // alpha
    let n_0_n_2 = n_0 * n_2;
    let n_0_n_2 = n_0_n_2 + n_0_n_2;
    let n_0_n_2 = n_0_n_2 + n_0_n_2;
    let n_1_sq = n_1 * n_1;

    let alpha = n_0_n_2 - n_1_sq;
    let alpha = alpha * alpha;

    // b_1
    let b_1 = x * x;
    let b_1 = b_1 + b_1;

    // b_2
    let b_2 = x * y;

    // b_3
    let b_3 = y * y;
    let b_3 = b_3 + b_3;

    (alpha, b_1, b_2, b_3)
}

#[circuit(scheme = "bfv")]
fn chi_sq_circuit(
    n_0: Cipher<Signed>,
    n_1: Cipher<Signed>,
    n_2: Cipher<Signed>,
) -> (
    Cipher<Signed>,
    Cipher<Signed>,
    Cipher<Signed>,
    Cipher<Signed>,
) {
    chi_sq_impl(n_0, n_1, n_2)
}

#[circuit(scheme = "bfv")]
fn chi_sq_optimized_circuit(
    n_0: Cipher<Signed>,
    n_1: Cipher<Signed>,
    n_2: Cipher<Signed>,
) -> (
    Cipher<Signed>,
    Cipher<Signed>,
    Cipher<Signed>,
    Cipher<Signed>,
) {
    chi_sq_optimized_impl(n_0, n_1, n_2)
}

/**
 * Compute chi squared without encryption
 */
fn run_native<F>(f: F, n_0: i64, n_1: i64, n_2: i64)
where F: Fn(i64, i64, i64) -> (i64, i64, i64, i64)
{
    let start = Instant::now();
    let (a, b_1, b_2, b_3) = f(n_0, n_1, n_2);
    let elapsed = start.elapsed().as_secs_f64();

    println!(
        "\t\tchi_sq (non-fhe) alpha {}, beta_1 {}, beta_2 {}, beta_3 {}, ({}s)",
        a, b_1, b_2, b_3, elapsed
    );
}

fn run_fhe<F: CircuitFn>(c: F, n_0: i64, n_1: i64, n_2: i64) {
    let start = Instant::now();
    let circuit = Compiler::with_circuit(c)
        .noise_margin_bits(20)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(1_000))
        .compile()
        .unwrap();
    let elapsed = start.elapsed().as_secs_f64();

    println!("\t\tCompile time {}s", elapsed);

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let n_0 = Signed::from(n_0);
    let n_1 = Signed::from(n_1);
    let n_2 = Signed::from(n_2);

    let start = Instant::now();
    let (public, secret) = runtime.generate_keys().unwrap();
    let elapsed = start.elapsed().as_secs_f64();

    println!("\t\tKeygen time {}s", elapsed);

    let start = Instant::now();
    let n_0_enc = runtime.encrypt(n_0, &public).unwrap();
    let n_1_enc = runtime.encrypt(n_1, &public).unwrap();
    let n_2_enc = runtime.encrypt(n_2, &public).unwrap();
    let elapsed = start.elapsed().as_secs_f64();

    println!("\t\tEncryption time {}s", elapsed);

    let start = Instant::now();
    let args: Vec<CircuitInput> = vec![n_0_enc.into(), n_1_enc.into(), n_2_enc.into()];

    let result = runtime.run(&circuit, args, &public).unwrap();
    let elapsed = start.elapsed().as_secs_f64();

    println!("\t\tRun time {}s", elapsed);

    let start = Instant::now();
    let a: Signed = runtime.decrypt(&result[0], &secret).unwrap();
    let b_1: Signed = runtime.decrypt(&result[1], &secret).unwrap();
    let b_2: Signed = runtime.decrypt(&result[2], &secret).unwrap();
    let b_3: Signed = runtime.decrypt(&result[3], &secret).unwrap();
    let elapsed = start.elapsed().as_secs_f64();

    println!("\t\tDecryption time {}s", elapsed);

    let a: i64 = a.into();
    let b_1: i64 = b_1.into();
    let b_2: i64 = b_2.into();
    let b_3: i64 = b_3.into();

    println!(
        "\t\tchi_sq (fhe) alpha {}, beta_1 {}, beta_2 {}, beta_3 {}",
        a, b_1, b_2, b_3
    );
}

fn main() {
    let n_0 = 2;
    let n_1 = 7;
    let n_2 = 9;

    println!("**********Naive**************");
    println!("\t**********Native************");
    run_native(chi_sq_impl, n_0, n_1, n_2);
    println!("\t**********FHE************");
    run_fhe(chi_sq_circuit, n_0, n_1, n_2);
    println!("**********Optimized************");
    println!("\t**********Native************");
    run_native(chi_sq_optimized_impl, n_0, n_1, n_2);
    println!("\t**********FHE************");
    run_fhe(chi_sq_optimized_circuit, n_0, n_1, n_2);
}
