# Constraints

So far we've discussed how to create native field elements and perform
arithmetic on them. But performing arithmetic on its own doesn't allow us to
_prove_ anything. We'll need constraints to create proofs.

You can think of constraints as a set of conditions we claim our hidden values (i.e. private witness) must satify. These constraints are then encoded as a circuit, taking in any public values along with the hidden values. But not to worry, our compiler does this translation for you!

At your disposal, you'll have two types of constraints&mdash;equality and comparison.

## Equality

The most basic constraint we can introduce is an equality constraint. At first
this might not seem very useful; if we prove our private value is equal to
something else, isn't that going to reveal too much information? It turns out
this equality constraint is _very_ useful, particularly when constrained against
a polynomial!

```rust
# use sunscreen::{
#     types::zkp::{ConstrainEq, Field, FieldSpec}, zkp_program, zkp_var,
# };
#
#[zkp_program]
fn one_of<F: FieldSpec>(
    #[private] x: Field<F>,
    #[public] ys: [Field<F>; 100],
) {
    // prove that our secret is one of 100 possible values
    let zero = zkp_var!(0);
    let one = zkp_var!(1);
    let mut poly = one;
    for y in ys {
        poly = poly * (y - x);
    }
    poly.constrain_eq(zero);
}
```
As `constrain_eq` is native to R1CS, it is very fast for native fields.

## Ordering/Comparisons

The other constraint available in our compiler is an ordering constraint. This
one is slightly more complicated to use since the user is required to bound the
maximum difference between the numbers being compared. 

While the example below involves comparing a private value with a public value, you are free to compare any combination of private and public values in practice!

```rust
# use sunscreen::{
#     types::zkp::{ConstrainCmp, Field, FieldSpec}, zkp_program, zkp_var,
# };
#
#[zkp_program]
fn exceeds<F: FieldSpec>(
    #[private] balance: Field<F>,
    #[public] threshold: Field<F>,
) {
    // prove that balance > threshold
    balance.constrain_gt_bounded(threshold, 64);
}
```

When we call `balance.constrain_gt_bounded(threshold, 64)`, the second argument
is the maximum number of bits required to represent the absolute difference
`|balance - threshold|`. In this example, if we suppose that balance and
threshold values are represented in our application as `u64`, we know that the
difference can be represented in 64 bits.

We also offer `constrain_ge_bounded`, `constrain_lt_bounded`, and
`constrain_le_bounded`, which constrain `>=`, `<`, `<=` respectively.

Please note that comparison constraints are **not** native to R1CS (and are actually making use of [gadgets](../advanced/gadgets.md) we've created for you under the hood). Thus, a larger number of bits will result in slower proofs.
