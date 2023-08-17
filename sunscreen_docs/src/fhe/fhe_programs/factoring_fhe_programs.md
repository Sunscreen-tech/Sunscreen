# Factoring FHE programs

In this section we'll show you how to factor your programs in a specific way that allows for
* Reusing algorithms with different data types.
* Running your algorithm without FHE. This allows you to debug the algorithm without encryption getting in your way and measure FHE's performance overhead.

Let's begin by rewriting our `simple_multiply` example with a common implementation (`simple_multiply_impl`):

```rust
use sunscreen::{
    fhe_program,
    types::{bfv::{Signed, Fractional}, Cipher},
};
use std::ops::Mul;

fn simple_multiply_impl<T, U>(a: T, b: U) -> T
where T: Mul<U, Output=T> + Copy
{
    a * b
}

#[fhe_program(scheme = "bfv")]
fn simple_multiply_signed(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
    simple_multiply_impl(a, b)
}


#[fhe_program(scheme = "bfv")]
fn simple_multiply_fractional(a: Cipher<Fractional<64>>, b: Fractional<64>) -> Cipher<Fractional<64>> {
    simple_multiply_impl(a, b)
}
```

The first FHE program multiplies encrypted `Signed` values. In the second, `a` is an encrypted `Fractional` value while `b` is an unencrypted `Fractional` value. We can run both of these programs using `runtime.run()` as normal. 

## Running your implementation without FHE
If we inspect the [trait bounds](https://doc.rust-lang.org/rust-by-example/generics/where.html) on `simple_multiply_impl`, we'll notice there is no mention of anything Sunscreen related. This means we can directly run our implementation with Rust `i64` values by simply calling:

```rust
# use std::ops::Mul;
#
# fn simple_multiply_impl<T, U>(a: T, b: U) -> T
# where T: Mul<U, Output=T> + Copy
# {
#     a * b
# }
# 
# fn main() {
    simple_multiply_impl(7, 5);
# }
```

It's worth explicitly pointing out that `T` and `U` may be of the same or different types; the trait bounds merely require that you can multiply `T` and `U` values.
