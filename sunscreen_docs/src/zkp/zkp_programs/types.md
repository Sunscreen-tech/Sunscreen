# Types

All of the types relevant to a ZKP program live in
[`sunscreen::types::zkp`](https://docs.rs/sunscreen/latest/sunscreen/types/zkp/index.html).

## Native field elements
The ZKPs we're looking at operate over mathematical objects called [fields](https://en.wikipedia.org/wiki/Field_(mathematics)). Thus, we're actually specifying field elements in our ZKP programs.

As we saw in [my first ZKP program](../getting_started/example.md), the atomic
type used in all ZKP programs is `Field<F>`, which represents a native
field element in the backend proof system. For most users, this is
the only type you need to be aware of!

The `Field` type supports the following basic field arithmetic: `+`, `-`, `*`.[^1]

```rust
# use sunscreen::{
#     types::zkp::{ConstrainEq, Field, FieldSpec}, zkp_program
# };
#
#[zkp_program]
fn distribution<F: FieldSpec>(a: Field<F>, b: Field<F>, c: Field<F>) {
    let left = a * (b + c);
    let right = a * b + a * c;
    left.constrain_eq(right);
}
```

The `constrain_eq` introduces a _constraint_ into the proof.
We'll talk more about this in [Constraints](./constraints.md).

[^1]: If you're familiar with *fields* but haven't worked with ZKPs before you may be a little confused&mdash;don't fields support division? Yes, they do. However, in ZKPs, we're thinking about constraints in our programs. Division is not "native" to R1CS constraints so it is not supported out of the box.

## Arrays

Sunscreen supports fixed-length arrays[^2] that behave as you'd expect. You
declare and use them like any other fixed-length array in Rust:

```rust
# use sunscreen::{
#     types::zkp::{ConstrainEq, Field, FieldSpec}, zkp_program
# };
#
#[zkp_program]
fn my_program<F: FieldSpec>(a: [[Field<F>; 10]; 10], b: [Field<F>; 10]) {
    // Assert that each array in `a` is equal to the `b` array
    for i in 0..10 {
        for j in 0..10 {
            a[i][j].constrain_eq(b[j]);
        }
    }
}
```

[^2]: Don't confuse these with `Vec`, which Sunscreen does *not* support!

## Working with literals

Sometimes, you simply want to double a value or add `15`. The easiest way to do
this is to use the
[`sunscreen::zkp_var!`](https://docs.rs/sunscreen/latest/sunscreen/macro.zkp_var.html)
macro:

```rust
# use sunscreen::{
#     types::zkp::{ConstrainEq, Field, FieldSpec}, zkp_program, zkp_var
# };
#
#[zkp_program]
fn double_and_add<F: FieldSpec>(a: Field<F>) {
    let two = zkp_var!(2);
    let x = two * a + zkp_var!(15);
    x.constrain_eq(zkp_var!(42));
}
```

You can also create arrays:

```rust
# use sunscreen::{
#     types::zkp::{ConstrainEq, Field, FieldSpec}, zkp_program, zkp_var
# };
#
#[zkp_program]
fn my_program<F: FieldSpec>(a: [Field<F>; 10]) {
    // Assert a is all zeroes.
    let arr = zkp_var![0; 5];
    for i in 0..5 {
        arr[i].constrain_eq(a[i]);
    }

    // You can also specify varying values, like normal array syntax:
    let arr = zkp_var![11, 1, 2, 42];
    for i in 0..5 {
        arr[i].constrain_eq(a[i + 5]);
    }
}
```
