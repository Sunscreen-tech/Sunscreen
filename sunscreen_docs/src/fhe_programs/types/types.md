# Types
Sunscreen supports a number of data types for different scenarios. Each of these data types is located in the `sunscreen_compiler::types::bfv` module.

All types `T` support `+`, `-`, `*` operations on plaintext, ciphertext, and literals. Note that at least one of the operands must be a ciphertext.

* Use `Signed` if you need to work with integers. 
* Use `Fractional` if you need to work with decimals (but *don't* anticipate needing to divide by ciphertexts).
* Use`Rational` if ciphertext division is *absolutely necessary* to your application. This type incurs more overhead than `Fractional`. 

type       | division
-----------|-----------------------
Signed     | unsupported
Fractional | divide by literal only
Rational   | fully supported

## Cipher

The `Cipher` type is special in that you don't directly create `Cipher` values. `Cipher<T>` should only appear in an FHE program's call signature and denotes that an argument or return value is an encrypted `T`. The absence of this wrapper indicates that `T` is unencrypted. 

While arguments may be unencrypted (i.e. of type `T`), return values must always be encrypted (i.e. of type `Cipher<T>`).

For example:
```rust,no_run
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
# };
#
#[fhe_program(scheme = "bfv")]
fn my_program(a: Cipher<Signed>, b: Signed) -> (Cipher<Signed>, Cipher<Signed>) {
    // Do things
    # (a, a + b)
}
```

* Argument `a` is an encrypted `Signed` value.
* Argument `b` is an *un*encrypted `Signed` value.
* `my_program` returns 2 encrypted `Signed` values via a tuple.

## Arrays
Sunscreen supports fixed-length arrays[^1] that behave as you'd expect. You declare and use them as any other fixed-length array in Rust:

```rust,no_run
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Fractional, Cipher},
# };
#
#[fhe_program(scheme = "bfv")]
fn matrix_vector_multiply(a: [[Cipher<Fractional<64>>; 10]; 10], b: [Cipher<Fractional<64>>; 10]) -> [Cipher<Fractional<64>>; 10] {
    // Clone b just so we get an initialized object of the right
    // type in col.
    let mut col = b.clone();

    // Perform matrix-vector multiplication with col_query to extract
    // Alice's desired column
    for i in 0..10 {
        for j in 0..10 {
            if j == 0 {
                col[i] = a[i][j] * b[j];
            } else {
                col[i] = col[i] + a[i][j] * b[j];
            }
        }
    }

    col
}
```

You can make arrays of encrypted or unencrypted data types. In the former case, the `Cipher` must go inside the array; you can't declare a `Cipher<[T; 2]>`.

*TODO: add discussion on using arrays as inputs to FHE programs (readable vs writeable). having to initialize writeable arrays. cannot return arrays from FHE programs.*

[^1]: Don't confuse these with `Vec`, which Sunscreen does *not* support!

## Working with literals
Sometimes, you simply want to double a value or add `15`. Fortunately, most FHE types and operations support literal operands.

For example, `Signed` values work with `i64` values
```rust,no_run
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
# };
#
#[fhe_program(scheme = "bfv")]
fn answer(a: Cipher<Signed>) -> Cipher<Signed> {
    a + 42
}
```

while `Fractional` and `Rational` values support `f64` values
```rust,no_run
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Fractional, Cipher},
# };
#
#[fhe_program(scheme = "bfv")]
fn answer_2(a: Cipher<Fractional<64>>) -> Cipher<Fractional<64>> {
    42.0 * a
}
```
