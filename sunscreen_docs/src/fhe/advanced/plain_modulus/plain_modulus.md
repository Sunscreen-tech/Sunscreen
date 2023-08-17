# Plaintext modulus

FHE uses some [funky math](../../intro/why.md). At the lowest level, plaintexts are polynomials where the coefficient of each term is an integer modulo the *plaintext modulus*. The plaintext modulus parameter impacts [correctness](../carryless_arithmetic.md#overflow) and performance &mdash; overflow occurs when the plaintext modulus is too small, but increasing it can negatively impact performance. Sunscreen balances these two considerations by setting a default plaintext modulus that prevents overflow in most applications while maintaining good performance.[^1] However, you may at times wish to change it.

[^1]: The default is `64^3 = 262,144`, which allows multiplying any 4 canonical (i.e. all 1s and 0s) 64-bit input values without overflow.

## Why you might want to change the default plaintext modulus
A few reasons you would change the plain modulus include:
* If the default is too conservative, decreasing the plaintext modulus can improve performance.
* Very very rarely, the default can cause overflow in some FHE programs. Increasing the plaintext modulus solves this issue at the expense of performance.
* You wish to use batching, which requires very specific values.

When setting the plaintext modulus, you call `compiler.plain_modulus_constraint()` and pass a `PlainModulusConstraint`, which comes in two forms:
* `Raw(x)` sets the plaintext modulus to `x`.
* `BatchingMinimum(x)` chooses a value suitable for use with batching with at least `x` bits of precision. As noted in the name, this modulus should be used with batching.

## How to change the plaintext modulus
You can manually set the `PlainModulusConstraint` when compiling your program like so:
```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
#     Compiler, Runtime, PublicKey, PlainModulusConstraint
# };
#
# #[fhe_program(scheme = "bfv")]
# fn my_program() {
# }
#
# fn main() {
    let app = Compiler::new()
        .fhe_program(my_program)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(1_000_000))
        .compile()
        .unwrap();
# }
```
