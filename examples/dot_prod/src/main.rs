use sunscreen_compiler::{
    circuit,
    types::{bfv::Simd, Cipher, LaneCount, SwapRows},
    CircuitInput, Compiler, PlainModulusConstraint, Runtime,
};

use std::ops::*;
use std::time::Instant;

const VECLENDIV2: usize = 4096;

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
    let mut c = a * b;
    let mut shift_amount = 1;

    loop {
        if shift_amount >= T::lane_count() {
            break;
        }

        c = c + (c << shift_amount as u64);

        shift_amount *= 2;
    }

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

#[circuit(scheme = "bfv")]
fn dot_product(
    a: Cipher<Simd<VECLENDIV2>>,
    b: Cipher<Simd<VECLENDIV2>>,
) -> Cipher<Simd<VECLENDIV2>> {
    dot_product_impl(a, b)
}

/**
 * Returns whether the given unsigned value is a power of 2 or not.
 */
fn is_power_of_2(value: usize) -> bool {
    value.count_ones() == 1
}

/**
 * Creates a math vector and returns it represented as both a Vec and a
 * Simd type.
 */
fn make_vector<const LENDIV2: usize>() -> (Vec<i64>, Simd<LENDIV2>) {
    if !is_power_of_2(LENDIV2) {
        panic!("Vector length not a power of 2");
    }

    let end = LENDIV2 as i64 * 2;

    // Create a vector of numbers from 0 to LENDIV2 * 2 and split it into 2
    // parts each with 4096 elements.
    let a = (0..end).map(|x| x % 32).into_iter().collect::<Vec<i64>>();
    let (a_top, a_bottom) = a.split_at(LENDIV2);

    let simd = Simd::<LENDIV2>::try_from([a_top.to_owned(), a_bottom.to_owned()]).unwrap();

    (a, simd)
}

fn main() {
    let (a_vec, a_simd) = make_vector::<VECLENDIV2>();

    let start = Instant::now();
    let c = dot_product_naive(&a_vec, &a_vec);
    let end = start.elapsed();

    println!("Naive dot product: {} Time: {}s", c, end.as_secs_f64());

    let start = Instant::now();
    let non_fhe_dot = dot_product_impl(a_simd, a_simd);
    let end = start.elapsed();

    println!(
        "Non FHE dot product = {} Time: {}s",
        non_fhe_dot[(0, 0)],
        end.as_secs_f64()
    );

    let start = Instant::now();
    let circuit = Compiler::with_circuit(dot_product)
        .noise_margin_bits(30)
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(24))
        .compile()
        .unwrap();
    let end = start.elapsed();

    println!("Compiled in {}s", end.as_secs_f64());

    let runtime = Runtime::new(&circuit.metadata.params).unwrap();

    let (public, secret) = runtime.generate_keys().unwrap();
    let a_enc = runtime.encrypt(a_simd, &public).unwrap();

    let args: Vec<CircuitInput> = vec![a_enc.clone().into(), a_enc.clone().into()];

    let start = Instant::now();
    let results = runtime.run(&circuit, args, &public).unwrap();
    let end = start.elapsed();

    let fhe_dot: Simd<VECLENDIV2> = runtime.decrypt(&results[0], &secret).unwrap();

    println!(
        "FHE dot product = {} Time: {}s",
        fhe_dot[(0, 0)],
        end.as_secs_f64()
    );
}
