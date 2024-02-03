# Batched type
All other data types in Sunscreen encode a single value into a polynomial. `Batched` is unique in that encodes *multiple* signed integers (called lanes) into a single ciphertext using a technique called "batching." Batching organizes multiple values into a matrix 2 rows of `LANES` columns. The `LANES` type argument must be a power of 2.

Using the `Batched` data type allow up to 4-5 orders of magnitude more throughput, as each FHE operation now operates on 1,000s of independent values! As an added bonus, this comes at *no* increase in ciphertext size! If you application can support batching, there is little reason not to use it.

Operations on `Batched` work element-wise on values contained within the two operands. If you've ever written SSE or AVX code before, this is very similar idea. Here's a simplified example (with only 1 row of values) of what this looks like.

```text
a = [0, 1, 2, 3];
b = [4, 5, 6, 7];

c = a * b
  [00, 01, 02, 03]
* [04, 05, 06, 07]
= [00, 05, 12, 21] // 0 * 4 = 0; 1 * 5 = 5; 2 * 6 = 12; 3 * 7 = 21;
```

`Batched` values support the following arithmetic operations with one ciphertext operand and another operand as follows

Operation | operand
----------|----------------------
Add       | ciphertext, plaintext
Sub       | ciphertext, plaintext
Mul       | ciphertext, plaintext, `i64` literal
Unary neg | ciphertext

Multiplication by an `i64` literal scales each element in the `Batched` value, similar to scalar-vector multiplication.

Additionally, the `Batched` type features a number of rotations
* `<<` rotates each row N places to the left.
* `>>` rotates each row N places to the right.
* `swap_rows`, as you might guess, swaps the 2 rows.
* `lane_count` returns `LANES`. The result is a constant expression, so you *can* use it in flow control statements. This is useful to genericize an algorithm over an arbitrary `LANES` count.

Under rotations, lanes wrap around the left or right side. In this example, we rotate a batched type left by 3 places

```text
  [[0, 1, 2, 3], [4, 5, 6, 7]] << 3
= [[3, 0, 1, 2], [7, 4, 5, 6]]
```
`0`, `1`, `2` wrap around on the first row while `4`, `5`, `6` wrap on the second row.


## Representation
The maximum value `LANES` can be depends on the scheme parameters. To get the maximum number of lanes available for an FHE program, compile it and inspect `my_program.metadata.params.lattice_dimension`. While you can set `LANES` to any power of 2 up to this maximum, smaller values result in lower throughput and higher ciphertext expansion. If you choose a value less than the maximum, Sunscreen will emulate the requested number of lanes. However, requesting *more* than the maximum lanes will result in errors.

When compiling FHE programs using the `Batched` type, you must set a plain modulus constraint of `PlainModulusConstraint::BatchingMinimum(x)`. This will select a plain modulus on your behalf that suitable for batching with at least `x` bits of precision. When using this constraint, Sunscreen chooses the exact value of `p`, which you can inspect after compilation by looking at `my_program.metadata.params.plain_modulus`. Each lane supports values in the range `[-p / 2, p / 2]`[^1] where `p` is the resolved plain modulus. 

[^1] Negative values are stored using [`p`'s-complement](https://en.wikipedia.org/wiki/Method_of_complements). When batching, `p` is prime and thus odd, resulting in a balanced range.
