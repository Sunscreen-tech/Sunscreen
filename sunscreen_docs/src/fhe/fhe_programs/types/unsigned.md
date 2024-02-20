# Unsigned

Our unsigned types actually come in a few different flavors, depending on the
number of bits you need. Just like the [`crypto_bigint::Uint`](https://docs.rs/crypto-bigint/latest/crypto_bigint/struct.Uint.html) type, you can specify however many word-sized limbs you need for your computation:

```rust,ignore
struct Unsigned<const LIMBS: usize>;
```

and we provide a few type synonyms for common bit sizes (`Unsigned64`,
`Unsigned128`, `Unsigned256`, and `Unsigned512`).

These unsigned types allow you to perform integer arithmetic as follows (recall that at least one operand must be a ciphertext):

operation | operand
----------|------------------------------------------------------------
add       | ciphertext, plaintext, `Uint<LIMBS>` literal, `u64` literal
sub       | ciphertext, plaintext, `Uint<LIMBS>` literal, `u64` literal
mul       | ciphertext, plaintext, `Uint<LIMBS>` literal, `u64` literal
