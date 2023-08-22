# Dot product

Let's walk through an example of how to efficiently compute a dot product using batching. Recall that a dot product is an operation on two vectors that multiplies each element in the first vector by the corresponding element in the second vector and finally sums all of these values together. A straightforward Rust implementation might look like

```rust
fn dot_product(a: &[i64], b: &[i64]) -> i64 {
    if a.len() != b.len() {
        panic!("a and b must be the same length");
    }

    let mut sum = 0;

    for (a_i, b_i) in a.iter().zip(b.iter()) {
        sum += a_i * b_i;
    }

    sum
}
#
# fn main() {
#   let a = (0..10).into_iter().collect::<Vec<i64>>();
#   let b = (10..20).into_iter().collect::<Vec<i64>>();
#
#   let c = dot_product(&a, &b);
#
#   println!("{:?} dot {:?} = {}", a, b, c);
# }
```

## Import types

First, some boilerplate code
```rust
use sunscreen_compiler::{
    fhe_program,
    types::{bfv::Batched, Cipher, LaneCount, SwapRows},
    Compiler, FheProgramInput, FheRuntime, PlainModulusConstraint,
};

use std::ops::*;

const VECLENDIV2: usize = 4096;

fn main() {
}
```

## Algorithm description

A high level approach to efficiently computing a dot product with FHE is:
1. Pack each vector value into a lane of the `Batched` value. Half of the vector's elements go in the first row while the other half should go in the second.
2. Multiply the 2 `Batched` values together.
3. Add all the lanes together by repeatedly rotating the rows by increasing powers to 2 and accumulating into a sum variable.
4. Sum the two rows together by adding the sum variable to a `swap_rows()` version of itself.

To show why steps 3 and 4 sum the lanes of a `Batched` value, let's walk through an example
```ignore
c =
  [[01, 02, 03, 04, 05, 06, 07, 08], [09, 10, 11, 12, 13, 14, 15, 16]]

c = c + (c << 1)
  [[01, 02, 03, 04, 05, 06, 07, 08], [09, 10, 11, 12, 13, 14, 15, 16]]
+ [[02, 03, 04, 05, 06, 07, 08, 01], [10, 11, 12, 13, 14, 15, 16, 09]]
= [[03, 05, 07, 09, 11, 13, 15, 09], [19, 21, 23, 25, 27, 29, 31, 25]]

c = c + (c << 2)
  [[03, 05, 07, 09, 11, 13, 15, 09], [19, 21, 23, 25, 27, 29, 31, 25]]
+ [[07, 09, 11, 13, 15, 09, 03, 05], [23, 25, 27, 29, 31, 25, 19, 21]]
= [[10, 14, 18, 22, 26, 22, 18, 14], [42, 46, 50, 54, 58, 54, 50, 46]]

c = c + (c << 4)
  [[10, 14, 18, 22, 26, 22, 18, 14], [042, 046, 050, 054, 058, 054, 050, 046]]
+ [[26, 22, 18, 14, 10, 14, 18, 22], [058, 054, 050, 046, 042, 046, 050, 054]]
= [[36, 36, 36, 36, 36, 36, 36, 36], [100, 100, 100, 100, 100, 100, 100, 100]]
```

After running step 3, we have 2 rows where every column contains the sum of all the columns in the respective row for the original c vector.

Next, we simply need to swap the rows and add
```ignore
c = c + c.swapRows()
  [[036, 036, 036, 036, 036, 036, 036, 036], [100, 100, 100, 100, 100, 100, 100, 100]]
+ [[100, 100, 100, 100, 100, 100, 100, 100], [036, 036, 036, 036, 036, 036, 036, 036]]
= [[136, 136, 136, 136, 136, 136, 136, 136], [136, 136, 136, 136, 136, 136, 136, 136]]
```

## Implement algorithm

We're going to write this algorithm [generically](../../fhe_programs/factoring_fhe_programs.md) so we can reuse the code for `Batched` types with different `LANES` type arguments:

```rust
use sunscreen_compiler::{
    fhe_program,
    types::{bfv::Batched, Cipher, LaneCount, SwapRows},
    Compiler, FheProgramInput, FheRuntime, PlainModulusConstraint,
};

use std::ops::*;

// Generic dot-product implementation
fn dot_product_impl<T>(a: T, b: T) -> T
// We require that type T allows us to do *, +, <<, lane_count(), and
// swap_rows(). Batched types with any number of lanes support all these
// operations.
where
    T: Mul<Output = T>
        + Add<Output = T>
        + SwapRows<Output = T>
        + Shl<u64, Output = T>
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

fn main() {
}
```

## Make test data

Next, we'll make some test data. Let's write a function `make_vector` that generates a vector with 8192 elements of the sequence `0..32` repeated and packed as described in the algorithm outline.

```rust
fn is_power_of_2(value: usize) -> bool {
    value.count_ones() == 1
}

fn make_vector<const LENDIV2: usize>() -> Batched<LENDIV2> {
    if !is_power_of_2(LENDIV2) {
        panic!("Vector length not a power of 2");
    }

    let end = LENDIV2 as i64 * 2;

    // Create a vector of numbers from 0 to LENDIV2 * 2 and split it into 2
    // parts each with 4096 elements.
    let a = (0..end).map(|x| x % 32).into_iter().collect::<Vec<i64>>();
    let (a_top, a_bottom) = a.split_at(LENDIV2);

    let batched = Batched::<LENDIV2>::try_from([a_top.to_owned(), a_bottom.to_owned()]).unwrap();

    batched
}
```

## FHE dot product
Finally, we'll put it all together to compute a dot product with FHE:

```rust
use sunscreen_compiler::{
    fhe_program,
    types::{bfv::Batched, Cipher, LaneCount, SwapRows},
    Compiler, FheProgramInput, FheRuntime, PlainModulusConstraint,
};

use std::ops::*;

const VECLENDIV2: usize = 4096;

// Generic dot-product implementation
fn dot_product_impl<T>(a: T, b: T) -> T
// We require that type T allows us to do *, +, <<, lane_count(), and
// swap_rows(). Batched types with any number of lanes support all these
// operations.
where
    T: Mul<Output = T>
        + Add<Output = T>
        + SwapRows<Output = T>
        + Shl<u64, Output = T>
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

fn is_power_of_2(value: usize) -> bool {
    value.count_ones() == 1
}

fn make_vector<const LENDIV2: usize>() -> Batched<LENDIV2> {
    if !is_power_of_2(LENDIV2) {
        panic!("Vector length not a power of 2");
    }

    let end = LENDIV2 as i64 * 2;

    // Create a vector with LENDIV2 * 2 elements and split it into 2
    // parts each with LENDIV2 elements. a_top is the first row, a_bottom
    // the second
    let a = (0..end).map(|x| x % 32).into_iter().collect::<Vec<i64>>();
    let (a_top, a_bottom) = a.split_at(LENDIV2);

    let batched = Batched::<LENDIV2>::try_from([a_top.to_owned(), a_bottom.to_owned()]).unwrap();

    batched
}

// 1. Declare our FHE program
#[fhe_program(scheme = "bfv")]
fn dot_product(
    a: Cipher<Batched<VECLENDIV2>>,
    b: Cipher<Batched<VECLENDIV2>>,
) -> Cipher<Batched<VECLENDIV2>> {
    dot_product_impl(a, b)
}

fn main() {
    let a = make_vector::<VECLENDIV2>();
    let b = make_vector::<VECLENDIV2>();

    // 2. Compile our FHE program
    let fhe_program = Compiler::with_fhe_program(dot_product)
        // To use batching, Sunscreen requires the plain modulus to be a large
        // prime number. `PlainModulusConstraint::BatchingMinimum(24)` says
        // set the plain modulus to be a prime number capable of supporting
        // batching with at least 24 bits of precision. We choose 24 because
        // the final value of our dot product requires this much integer
        // precision.
        .plain_modulus_constraint(PlainModulusConstraint::BatchingMinimum(24))
        .compile()
        .unwrap();
    let end = start.elapsed();

    // 3. Make our runtime, generate keys, encrypt our data, run our
    // program, and check the result
    let runtime = FheRuntime::new(&fhe_program.metadata.params).unwrap();

    let (public_key, private_key) = runtime.generate_keys().unwrap();
    let a_enc = runtime.encrypt(a_batched, &public_key).unwrap();

    let args: Vec<FheProgramInput> = vec![a_enc.clone().into(), a_enc.clone().into()];

    // Run our dot product homomorphically, decrypt and verify the result.
    let results = runtime.run(&fhe_program, args, &public_key).unwrap();

    let c: Batched<VECLENDIV2> = runtime.decrypt(&results[0], &private_key).unwrap();

    // 4. Check the result
    // Every value in the vector has the same value, so we'll arbitrarily
    // compare the first one to the expected answer
    assert_eq!(c[(0, 0)], 2666496);
}
```

We
1. Create an FHE program that calls our generic implementation.
2. Compile it.
3. Generate keys, encrypt our inputs, run the program, decrypt the result.
4. Assert we did in fact get the correct value.

And voila! We have efficiently computed a dot product on two encrypted vectors using batching.
