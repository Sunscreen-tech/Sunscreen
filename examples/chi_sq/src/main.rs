//! A simple chi squared computation that demonstrates how to
//! optimize [`fhe_program`]s. This example shows the parts of chi
//! squared computed homomorphically. The problem can be summized
//! as given integers `n_0`, `n_1`, `n_2`, compute:
//! * `alpha` = `(4 * n_0 * n_2 - n_1^2)^2`
//! * `b_1` = `2(2n_0 + n_1)^2`
//! * `b_2` = `(2n_0 + n_1) * (2n_2 + n_1)`
//! * `b_3` = `2(2n_2 + n_1)^2`
//!
//! For more details on this algorithm and to compare
//! Sunscreen's results with other FHE compilers, see
//! [SoK: Fully Homomorphic Encryption Compilers](https://arxiv.org/abs/2101.07078).

#![allow(clippy::type_complexity)]

use sunscreen::{
    fhe_program,
    types::{
        bfv::{Batched, Signed},
        Cipher, FheType, TypeName,
    },
    Compiler, Error, FheProgramFn, FheProgramInput, PlainModulusConstraint, Runtime,
};

use std::marker::PhantomData;
use std::ops::*;
use std::time::Instant;

/**
 * The naive implementation of chi squared. More or less a
 * transliteration of the problem statement.
 *
 * Defining the implementation generically this way allows us
 * to use both the Signed and Batched data types.
 */
fn chi_sq_impl<T>(n_0: T, n_1: T, n_2: T) -> (T, T, T, T)
where
    T: Add<T, Output = T> + Mul<T, Output = T> + Sub<T, Output = T> + Copy,
    i64: Mul<T, Output = T>,
{
    let a = 4 * n_0 * n_2 - n_1 * n_1;
    let a_sq = a * a;

    let b_1 = 2 * n_0 + n_1;
    let b_1_sq = 2 * b_1 * b_1;

    let b_2 = (2 * n_0 + n_1) * (2 * n_2 + n_1);
    let b_3 = 2 * (2 * n_2 + n_1) * (2 * n_2 + n_1);

    (a_sq, b_1_sq, b_2, b_3)
}

/**
 * This implementation features the following optimizations:
 * * Replace multiplication by constant with additions.
 * * Common subexpression elimination. I.e. reuse temporaries multiple times to avoid recomputation.
 *
 * On a first gen M1 Mac, this implementation is over 6x
 * faster than the naive implementation.
 */
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

#[fhe_program(scheme = "bfv")]
fn chi_sq_fhe_program(
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

#[fhe_program(scheme = "bfv")]
fn chi_sq_optimized_fhe_program(
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

#[fhe_program(scheme = "bfv")]
fn chi_sq_batched_fhe_program(
    n_0: Cipher<Batched<4096>>,
    n_1: Cipher<Batched<4096>>,
    n_2: Cipher<Batched<4096>>,
) -> (
    Cipher<Batched<4096>>,
    Cipher<Batched<4096>>,
    Cipher<Batched<4096>>,
    Cipher<Batched<4096>>,
) {
    chi_sq_optimized_impl(n_0, n_1, n_2)
}

/**
 * Compute chi squared without encryption. This function may report
 * as taking 0 seconds due to being faster than the clock
 * resolution, but a typical time on a first gen M1 mac under
 * 40ns.
 */
fn run_native<F>(f: F, n_0: i64, n_1: i64, n_2: i64)
where
    F: Fn(i64, i64, i64) -> (i64, i64, i64, i64),
{
    let start = Instant::now();
    let (a, b_1, b_2, b_3) = f(n_0, n_1, n_2);
    let elapsed = start.elapsed().as_secs_f64();

    println!(
        "\t\tchi_sq (non-fhe) alpha {}, beta_1 {}, beta_2 {}, beta_3 {}, ({}s)",
        a, b_1, b_2, b_3, elapsed
    );
}

/**
 * Compile the given fhe_program, encrypt some data, homomorphically
 * run the fhe_program, decrypt the result, and report timings on
 * each step.
 *
 * The [`PhantomData`] argument allows us to tell Rust what the type
 * of U. This is preferable than passing an explicit type for F
 * using turbofish, since the concrete type of F is is an
 * implementation detail of the `#[fhe_program]` macro and could
 * change in the future.
 */
fn run_fhe<F, T, U>(
    c: F,
    _u: PhantomData<U>,
    n_0: T,
    n_1: T,
    n_2: T,
    plain_modulus: PlainModulusConstraint,
) -> Result<(), Error>
where
    F: FheProgramFn + Clone + 'static + AsRef<str>,
    U: From<T> + FheType + TypeName + std::fmt::Display,
{
    let start = Instant::now();

    let app = Compiler::new()
        .fhe_program(c.clone())
        .plain_modulus_constraint(plain_modulus)
        .compile()?;
    let elapsed = start.elapsed().as_secs_f64();

    println!("\t\tCompile time {}s", elapsed);

    let runtime = Runtime::new(app.params())?;

    let n_0 = U::from(n_0);
    let n_1 = U::from(n_1);
    let n_2 = U::from(n_2);

    let start = Instant::now();
    let (public_key, private_key) = runtime.generate_keys()?;
    let elapsed = start.elapsed().as_secs_f64();

    println!("\t\tKeygen time {}s", elapsed);

    let start = Instant::now();
    let n_0_enc = runtime.encrypt(n_0, &public_key)?;
    let n_1_enc = runtime.encrypt(n_1, &public_key)?;
    let n_2_enc = runtime.encrypt(n_2, &public_key)?;
    let elapsed = start.elapsed().as_secs_f64();

    println!("\t\tEncryption time {}s", elapsed);

    let start = Instant::now();
    let args: Vec<FheProgramInput> = vec![n_0_enc.into(), n_1_enc.into(), n_2_enc.into()];

    let result = runtime.run(app.get_program(c).unwrap(), args, &public_key)?;
    let elapsed = start.elapsed().as_secs_f64();

    println!("\t\tRun time {}s", elapsed);

    let start = Instant::now();
    let a: U = runtime.decrypt(&result[0], &private_key)?;
    let b_1: U = runtime.decrypt(&result[1], &private_key)?;
    let b_2: U = runtime.decrypt(&result[2], &private_key)?;
    let b_3: U = runtime.decrypt(&result[3], &private_key)?;
    let elapsed = start.elapsed().as_secs_f64();

    println!("\t\tDecryption time {}s", elapsed);

    println!(
        "\t\tchi_sq (fhe) alpha {:40}, beta_1 {:40}, beta_2 {:40}, beta_3 {:40}",
        a, b_1, b_2, b_3
    );

    Ok(())
}

fn main() -> Result<(), Error> {
    let n_0 = 2;
    let n_1 = 7;
    let n_2 = 9;

    env_logger::init();

    // Signed types allow us to use a really small modulus,
    // allowing us to get very performant parameters.
    let plain_modulus = PlainModulusConstraint::Raw(64);

    println!("**********Naive**************");
    println!("\t**********Native************");
    run_native(chi_sq_impl, n_0, n_1, n_2);
    println!("\t**********FHE************");
    run_fhe(
        chi_sq_fhe_program,
        PhantomData::<Signed>::default(),
        n_0,
        n_1,
        n_2,
        plain_modulus,
    )?;
    println!("**********Optimized************");
    println!("\t**********Native************");
    // run_native(chi_sq_optimized_impl, n_0, n_1, n_2);
    println!("\t**********FHE************");
    // On a first-gen M1 mac, the optimized fhe_program is around 6
    // orders of magnitude slower than running natively, taking
    // just under 50ms...
    run_fhe(
        chi_sq_optimized_fhe_program,
        PhantomData::<Signed>::default(),
        n_0,
        n_1,
        n_2,
        plain_modulus,
    )?;

    // Pack repetitions of n_0, n_1, n_2 into 2x4096 vectors
    // to demonstrate batching.
    let n_0 = [[n_0; 4096], [n_0; 4096]];
    let n_1 = [[n_1; 4096], [n_1; 4096]];
    let n_2 = [[n_2; 4096], [n_2; 4096]];

    let plain_modulus = PlainModulusConstraint::BatchingMinimum(16);

    // Using batching, we get a fhe_program
    // that runs with the same latency, but rather than computing
    // 1 instance of the chi squared function, we can compute
    // 16_384 values concurrently. This would result in an
    // amortized throughput only 1-2 orders of magnitude
    // slower than native!
    println!("**********Batched************");
    println!("\t**********FHE************");
    run_fhe(
        chi_sq_batched_fhe_program,
        PhantomData::<Batched<4096>>,
        n_0,
        n_1,
        n_2,
        plain_modulus,
    )?;

    Ok(())
}
