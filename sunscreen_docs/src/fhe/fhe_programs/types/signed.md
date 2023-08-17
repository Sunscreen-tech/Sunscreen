# Signed
`Signed` values allow you to perform integer arithmetic as follows (recall that at least one operand must be a ciphertext):

operation | operand
----------|---------------------------------------
add       | ciphertext, plaintext, `i64` literal
sub       | ciphertext, plaintext, `i64` literal
mul       | ciphertext, plaintext, `i64` literal

Additionally, you can perform unary negation on encrypted `Signed` values.

## Representation

`Signed` values contain thousands of binary digits of precision, easily enough to store any `i64` value.
