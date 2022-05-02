# Fractional
`Fractional` values allow you to perform decimal arithmetic. You can think of `Fractional` as being similar to a fixed-point representation.

Sunscreen represents `Fractional` values as an integer and fractional part.  The `INT_BITS` type argument specifies how many binary digits store the integer part. Setting `INT_BITS` to `64` should be more than sufficient for most applications since `Fractional<64>` values can exactly represent every `i64` with thousands (!!) of binary digits for the decimal portion. 

You can perform operations on `Fractional` values as follows (recall at least one operand must be a ciphertext):

operation | operand
----------|---------------------------------------
add       | ciphertext, plaintext, literal
sub       | ciphertext, plaintext, literal
mul       | ciphertext, plaintext, literal
div       | ciphertext numerator + literal divisor

Additionally, you perform unary negation on `Fractional` ciphertexts.

While division by only literals may seem limiting, this is one of the more common use cases. For example, you can average 3 values:

```rust,no_run
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Fractional, Cipher},
#     Compiler, Runtime, PublicKey
# };

#[fhe_program(scheme = "bfv")]
fn avg(
    a: Cipher<Fractional<64>>,
    b: Cipher<Fractional<64>>,
    c: Cipher<Fractional<64>>
) -> Cipher<Fractional<64>> {
    (a + b + c) / 3.0
}
```

Additionally, division by literals is sufficient to compute many transcendental functions (e.g. `sin`, `cos`, `exp`) via a power series.

## Representation
A scheme parameter `lattice_dimension` (chosen by the Sunscreen compiler) determines the number of decimal places such that `INT_BITS + DECIMAL_BITS = lattice_dimension`. This scheme parameter is always at least `1024`. You can find the compiler's chosen value with `my_compiled_program.metadata.params.lattice_dimension`.

`Fractional` values use exact arithmetic and don't suffer from roundoff errors as floating point values do. In fact, if `INT_BITS=1024` and `lattice_dimension >= 2048` they can *exactly* store every double precision value with a fixed decimal point!

## Efficiency
Unlike the [`Rational`](./rational.md) type, storing and computing `Fractional` values is as efficient as [`Signed`](./signed.md) values.
