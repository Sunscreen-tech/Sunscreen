//! This example demonstrates how to use batching (i.e. the [`Batched`] data type)
//! as well as how build fhe_programs that can be run non-homomorphically.
//! To illustrate these features, we implement a
//! [dot product](https://en.wikipedia.org/wiki/Dot_product#Algebraic_definition)
use sunscreen::{
    fhe_program,
    types::{bfv::Batched, Cipher, LaneCount, SwapRows},
    Compiler, FheProgramInput, PlainModulusConstraint, Runtime,
};

use std::ops::*;
use std::time::Instant;

const VECLENDIV2: usize = 4096;

/**
 * A generic dot product implementation for `2xN/2` vector types. This
 * implementation is optimized for fast execution in the BFV scheme.
 *
 * Writing the implementation generically allows us to:
 * * Run it without using FHE.
 * * Share the implementation for different data types. Imagine we
 * had another encryption scheme that supported Batched, this implementation
 * would work for that as well!
 */
fn dot_product_impl<T>(a: T, b: T) -> T
where
    T: Mul<Output = T>
        + Add<Output = T>
        + SwapRows<Output = T>
        + Shl<u64, Output = T>
        + Shr<u64, Output = T>
        + LaneCount
        + Copy,
{
    // Each Batched lane is an entry in the vector. Multiply every lane in a
    // by every lane in b.
    let mut c = a * b;
    let mut shift_amount = 1;

    // Now, we need to perform a reduction, summing all the lanes with
    // each other. Recall that Bfv Batched vectors are 2xN.
    // A simple example to illustate how this adds all the columns:
    // suppose c =
    //   [[01, 02, 03, 04, 05, 06, 07, 08], [09, 10, 11, 12, 13, 14, 15, 16]]
    // c = c + c << 1
    //   [[01, 02, 03, 04, 05, 06, 07, 08], [09, 10, 11, 12, 13, 14, 15, 16]]
    // + [[02, 03, 04, 05, 06, 07, 08, 01], [10, 11, 12, 13, 14, 15, 16, 09]]
    // = [[03, 05, 07, 09, 11, 13, 15, 09], [19, 21, 23, 25, 27, 29, 31, 25]]
    // c = c + c << 2
    //   [[03, 05, 07, 09, 11, 13, 15, 09], [19, 21, 23, 25, 27, 29, 31, 25]]
    // + [[07, 09, 11, 13, 15, 09, 03, 05], [23, 25, 27, 29, 31, 25, 19, 21]]
    // = [[10, 14, 18, 22, 26, 22, 18, 14], [42, 46, 50, 54, 58, 54, 50, 46]]
    // c = c + c << 4
    //   [[10, 14, 18, 22, 26, 22, 18, 14], [042, 046, 050, 054, 058, 054, 050, 046]]
    // + [[26, 22, 18, 14, 10, 14, 18, 22], [058, 054, 050, 046, 042, 046, 050, 054]]
    // = [[36, 36, 36, 36, 36, 36, 36, 36], [100, 100, 100, 100, 100, 100, 100, 100]]
    loop {
        if shift_amount >= T::lane_count() {
            break;
        }

        c = c + (c << shift_amount as u64);

        shift_amount *= 2;
    }

    // Now, we need to add the rows together, so we add c to itself with the rows
    // swapped. Continuing our above example:
    // c = c + c.swapRows()
    //   [[036, 036, 036, 036, 036, 036, 036, 036], [100, 100, 100, 100, 100, 100, 100, 100]]
    // + [[100, 100, 100, 100, 100, 100, 100, 100], [036, 036, 036, 036, 036, 036, 036, 036]]
    // = [[136, 136, 136, 136, 136, 136, 136, 136], [136, 136, 136, 136, 136, 136, 136, 136]]
    c + c.swap_rows()
}

/**
 * A naive simple implementation of a dot product that's easy to follow:
 * simply multiply every element in a with every element in b and add up
 * all the terms.
 */
fn dot_product_naive(a: &[i64], b: &[i64]) -> i64 {
    if a.len() != b.len() {
        panic!("a and b must be the same length");
    }

    let mut sum = 0;

    for (a_i, b_i) in a.iter().zip(b.iter()) {
        sum += a_i * b_i;
    }

    sum
}

#[fhe_program(scheme = "bfv")]
fn dot_product(
    a: Cipher<Batched<VECLENDIV2>>,
    b: Cipher<Batched<VECLENDIV2>>,
) -> Cipher<Batched<VECLENDIV2>> {
    dot_product_impl(a, b)
}

/**
 * Returns whether the given unsigned value is a power of 2 or not.
 */
fn is_power_of_2(value: usize) -> bool {
    value.count_ones() == 1
}

/**
 * Creates a math vector and returns it represented as both a [`Vec`] and a
 * [`Batched`] type.
 */
fn make_vector<const LENDIV2: usize>() -> Result<(Vec<i64>, Batched<LENDIV2>), sunscreen::Error> {
    if !is_power_of_2(LENDIV2) {
        panic!("Vector length not a power of 2");
    }

    let end = LENDIV2 as i64 * 2;

    // Create a vector of numbers from 0 to LENDIV2 * 2 and split it into 2
    // parts each with 4096 elements.
    let a = (0..end).map(|x| x % 32).into_iter().collect::<Vec<i64>>();
    let (a_top, a_bottom) = a.split_at(LENDIV2);

    let batched = Batched::<LENDIV2>::try_from([a_top.to_owned(), a_bottom.to_owned()])?;

    Ok((a, batched))
}

fn main() -> Result<(), sunscreen::Error> {
    let (a_vec, a_batched) = make_vector::<VECLENDIV2>()?;

    // Run our naive implementation of dot product we know to be correct.
    let start = Instant::now();
    let c = dot_product_naive(&a_vec, &a_vec);
    let end = start.elapsed();

    println!("Naive dot product: {} Time: {}s", c, end.as_secs_f64());

    // Run our optimized dot product, but non-homomorphically.
    let start = Instant::now();
    let non_fhe_dot = dot_product_impl(a_batched, a_batched);
    let end = start.elapsed();

    println!(
        "Non FHE dot product = {} Time: {}s",
        non_fhe_dot[(0, 0)],
        end.as_secs_f64()
    );

    let start = Instant::now();

    // When using batching, we need to use the PlainModulusConstraint::BatchingMinimum
    // plaintext modulus constraint. This chooses a prime number for our plain modulus
    // suitable for use with Batched types. The 24 denotes the minimum precision of the plain
    // modulus.
    let app = Compiler::new()
        .fhe_program(dot_product)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(24))
        .compile()?;
    let end = start.elapsed();

    println!("Compiled in {}s", end.as_secs_f64());

    let runtime = Runtime::new(app.params())?;

    let (public_key, private_key) = runtime.generate_keys()?;
    let a_enc = runtime.encrypt(a_batched, &public_key)?;

    let args: Vec<FheProgramInput> = vec![a_enc.clone().into(), a_enc.into()];

    // Run our dot product homomorphically, decrypt and verify the result.
    let start = Instant::now();
    let results = runtime.run(app.get_program(dot_product).unwrap(), args, &public_key)?;
    let end = start.elapsed();

    let fhe_dot: Batched<VECLENDIV2> = runtime.decrypt(&results[0], &private_key)?;

    println!(
        "FHE dot product = {} Time: {}s",
        fhe_dot[(0, 0)],
        end.as_secs_f64()
    );

    Ok(())
}
