# Rational
The `Rational` type allows you to perform all decimal arithmetic:

operation | operand
----------|---------------------------------------
add       | ciphertext, plaintext, literal
sub       | ciphertext, plaintext, literal
mul       | ciphertext, plaintext, literal
div       | ciphertext, plaintext, literal

Additionally, you can perform unary negation on `Rational` ciphertexts (i.e., given `a`, compute `-a`).

## Representation
`Rational` encodes a numerator and denominator as two independent `Signed` values. This results in ciphertexts **twice** as large as when using the [`Fractional`](./fractional.md) type.

## Efficiency
In addition to the increased size, each `Rational` operation (except negation) requires multiple FHE operations. Thus, even addition can quickly increase FHE [program complexity](../../advanced/noise_margin.html#what-is-noise). Using `Rational` ciphertexts in prolonged computation may require larger scheme parameters (hence resulting in slower computations).
