# Carryless arithmetic

When learning arithmetic in grade school, you learned the base 10 system where digits range from 0-9. Whenever adding digits exceeds 9, you have to carry the 1. However, this is not the only way to do arithmetic; we can instead omit the carry and allow digits to exceed 9!

Why would we want to do this? FHE operations actually add and multiply [polynomials](/intro/why.md) under the hood. If we treat each coefficient of the polynomial as a digit and use carryless arithmetic, we can trick them into behaving like numbers. This results in more efficient data types.

## Addition
Let's start with a simple carryless addition example. Adding 99 + 43 without propagating carries gives us:
```ignore
  9  9
+ 4  3
------
 13 12
```

That is `13` in the 10s place and `12` in the 1s place which is `13 * 10 + 12 * 1 = 142`. This is the same value as if we had propagated carries (`1 * 100 + 4 * 10 + 2 * 1 = 142`). Under carryless arithmetic, *both* are valid ways to represent the value 142; representations are no longer unique!

Furthermore, we can represent negative values by negating each digit. For example, `-123` is `-1 * 100 + -2 * 10 + -3 * 1`. Mechanically, we simply treat each polynomial coefficient as `p`'s complement[^1] value to allow negative numbers.

We can easily extend this reasoning to base 2 (binary). Under carryless arithmetic, base 2 simply means that each digit is a multiple of a power of 2. For example, we can compute `3 + 2 + (-4)` as follows:

```ignore
3 + 2 =
  1 1 = 3
+ 1 0 = 2
-----
  2 1 = 2*2^1 + 1*2^0 = 5

5 + (-4) =
   0 2 1 = 5
+ -1 0 0 = -4
--------
  -1 2 1 = -1*2^2 + 2*2^1 + 1*2^0 = 1 
```

Again `-1 2 1` equals `1`, as does `0 0 1`; the representation is not unique.

[^1]: `p` is the [plain modulus](/advanced/plain_modulus/plain_modulus.md)


### Adding polynomials
To see why carryless arithmetic is useful, let's take the values of our previous example (`3`, `2`, `-4`) and map their digits onto polynomials like so: 

\\[3 = 0\times 2^2 + 1\times 2^1 + 1\times 2^0 \rightarrow 0x^2 + 1x + 1\\]

\\[2 = 0\times 2^2 + 1\times 2^1 + 0\times 2^0 \rightarrow 0x^2 + 1x + 0\\]

\\[-4 = -1\times 2^2 + 0\times 2^1 + 0\times 2^0 \rightarrow -1x^2 + 0x + 0\\]

To add polynomials, recall that you simply collect the terms:

\\[3 + 2 \rightarrow \(0x^2 + 1x + 1\) + \(0x^2 + 1x + 0\) = 0x^2 + 2x + 1\\]

Now, let's subtract 4:

\\[5 + (-4) \rightarrow \(0x^2 + 2x + 1\) + \(-1x^2 + 0x + 0\) = -1x^2 + 2x + 1 \\]

Note that the coefficients are the same as the digits in our carryless arithmetic result. We can convert the polynomial back into an integer by evaluating it at `x = 2`, yielding `1`!

## Multiplication
Now, lets go through a multiplication example with binary carryless arithmetic. Here, we multiply `7 * 13 = 91`:
```ignore
        0 1 1 1 = 7
*       1 1 0 1 = 13
---------------
        0 1 1 1
+     0 0 0 0
+   0 1 1 1
+ 0 1 1 1
---------------
  0 1 2 2 2 1 1 = 1*2^5 + 2*2^4 + 2*2^3 + 2*2^2 + 1*2^1 + 1*2^0 = 91
```

Notice that when we collected each place, we didn't propagate carries when values exceeded `1`.

As another example, when we square `1 0 0 0 0 = 16`, we get `1 0 0 0 0 0 0 0 0 = 256`. Compared to the previous example, the operands are larger (`16 * 16` vs. `7 * 13`), but the result's largest digit is smaller &mdash; `1` in `1 0 0 0 0 0 0 0 0` vs. `2` in `0 1 2 2 2 1 1`. This will come up again when we talk about overflow.

### Multiplying polynomials
As with addition, we'll now show how carryless multiplication directly maps to polynomial multiplication. Let's encode `7` and `13` as polynomials:

\\[7 = 0\times 2^3 + 1\times 2^2 + 1\times 2^1 + 1\times 2^0 \rightarrow 0x^3 + 1x^2 + 1x^1 + 1\\]

\\[13 = 1\times 2^3 + 1\times 2^2 + 0\times 2^1 + 1\times 2^0 \rightarrow 1x^3 + 1x^2 + 0x^1 + 1\\]

Let's multiply these polynomials:

\\[7 \times 13 \rightarrow \(0x^3 + 1x^2 + 1x^1 + 1\)\(1x^3 + 1x^2 + 0x^1 + 1\) \\]
\\[= 1x^3\(0x^3 + 1x^2 + 1x^1 + 1\) + 1x^2\(0x^3 + 1x^2 + 1x^1 + 1\)\\]
\\[ + 0x^1\(0x^3 + 1x^2 + 1x^1 + 1\) + 1\(0x^3 + 1x^2 + 1x^1 + 1\) \\]

\\[=\(0x^6 + 1x^5 + 1x^4 + 1x^3\) + \(0x^5 + 1x^4 + 1x^3 + 1x^2\)\\]
\\[+\(0x^4 + 0x^3 + 0x^2 + 0x^1\) + \(0x^3 + 1x^2 + 1x^1 + 1\)  \\]

\\[=0x^6 + 1x^5 + 2x^4 + 2x^3 + 2x^2 + 1x^1 + 1\\]

Again, the coefficients of this polynomial exactly match our carryless addition result, so we can trivially map our polynomial back into a number to recover our answer!

You might be wondering: "can polynomial coefficients grow indefinitely?" 

Unfortunately, they can't.

## Overflow
As with normal computer arithmetic, values in FHE can *overflow*. In Sunscreen, plaintext polynomials have [`p`'s complement](https://en.wikipedia.org/wiki/Method_of_complements) coefficients, where `p` is the [plaintext modulus](./plain_modulus/plain_modulus.md). Assuming `p` is odd, this means each coefficient must be in the range \\([\frac{-p}{2}, \frac{p}{2}] \\) [^2]. The result of any operation that falls outside this range will wrap around &mdash; it overflows.

Suppose `p = 7` and we try to add `3 + 1`. Values should be within the range \\([-3,3]\\), but `3 + 1 = 4` is not and thus wraps around to `-3`! This example looks at a single value, but polynomials feature many coefficients, each of which has the same range restriction.

[^2]: When `p` is odd, \\(\frac{p}{2}\\) rounds down. If `p` is even, the interval is \\([\frac{-p}{2}, \frac{p}{2})\\), i.e. the upper bound opens.

### Addition
Let's look at an addition example, treating the coefficients as carryless arithmetic binary digits. Take `p = 9` (meaning digits are in the interval \\([-4,4]\\)) and add `15 = 4 0 -1`[^3] with `8 = 2 2 -4`.

```ignore
  4 0 -1 = 15
+ 2 2 -4 = 8
--------
 -3 2  4 = -3*2^2 + 2*2^1 + 4*2^0 = -4
```

From this example, we have two observations:
* We expected `6 2 -5 = 23`, but both the 4s and 1s places overflowed, giving us a very strange `-4`!
* Operands' digits only contribute to their respective place in the result (i.e. the 4s place contributes only to the 4s place, the 2s place to only the 2s place, etc).

If we increase `p` to `13` and repeat the example, we do get the correct answer because `6` and `-5` are within \\([-6,6]\\).

[^3]: Recall that values have many representations under carryless arithmetic &mdash; this example is typical after performing a few operations!

### Multiplication
Next, let's consider canonical representations of `31 = 1 1 1 1 1` and `15 = 0 1 1 1 1` when `p = 7` (i.e. digits in interval \\([-3, 3]\\)). Adding these numbers doesn't lead to overflow, but what about multiplication? Let's find out:

```ignore
             1  1  1  1  1 = 31
*            0  1  1  1  1 = 15
--------------------------
             1  1  1  1  1
          1  1  1  1  1
       1  1  1  1  1
    1  1  1  1  1
 0  0  0  0  0
--------------------------
 0  1  2  3 -1 -1  3  2  1
 = 0*256 + 1*128 + 2*64 + 3*32 + -1*16 + -1*8 + 3*4 + 2*2 + 1
 = 345
```

We draw 2 observations from this example:
* We expected `465 = 0 1 2 3 4 4 3 2 1`, but got `345` because the 16s and 8s places overflowed.
* The number of non-zero digits in each operand contributes to the result digits' magnitudes.

Increasing `p` to `9` eliminates the overflow since `4` is in the interval \\([-4, 4]\\).

If we multiply canonical representations of `32 = 1 0 0 0 0 0` and `16 = 0 1 0 0 0 0` when `p = 7`, surely this will overflow as well, right? After all, they're bigger numbers than in our previous example! As it turns out, this gives exactly the right answer: `512 = 1 0 0 0 0 0 0 0 0 0`. The operands feature far fewer non-zero digits, and thus are less impacted by our second observation.

We chose operand digits with value 1 in this example to reveal the second observation, but larger values further compound digit growth! You can see this by redoing the example with 4's: `124 = 4 4 4 4 4` times `60 = 0 4 4 4 4` equals `7440 = 0 16 32 48 64 64 48 32 16`.

### Preventing overflow
Overflow is a bit counterintuitive under carryless arithmetic, but you can prevent it &mdash; simply increase the [plaintext modulus](./plain_modulus/plain_modulus.md). Understanding your computation and knowing the range of your inputs can help you choose the appropriate value.
