# Attributes

We've already discussed the `#[zkp_program]`
attribute. However, there are also attributes on program _arguments_.

```rust
# use sunscreen::{
#     types::zkp::{ConstrainEq, Field, FieldSpec}, zkp_program, zkp_var
# };
#
#[zkp_program]
fn all_kinds<F: FieldSpec>(
    #[private] x: Field<F>,
    #[public] p: Field<F>,
) {
    // prove that our secret value x is equal to either p or 1
    let poly = (x - p) * (x - zkp_var!(1));
    poly.constrain_eq(zkp_var!(0));
}
```
Note that `zkp_program` arguments should appear in the order private, public, and
finally constant to match `prove` call.

## Private

The `#[private]` attribute is used for any arguments that are private to the
prover (i.e. shouldn't be seen by anyone else). In more formal terminology, these arguments are the *witnesses*. For example, this might be a
private key in an encryption scheme or something application specific like an
account balance that you (as the prover) wish to keep hidden.

This is the default argument type; omitting an attribute is the same as
specifying `#[private]`. 

## Public

The `#[public]` attribute is used for any arguments that are public to both the
prover and verifier. For example, this could be the public generator of a group
in some encryption scheme or something application specific like a minimum balance
threshold for issuing transactions.

## Constant

We do not discuss these in the main docs; please see the [advanced
section](../advanced/constant_inputs.md) if you're interested in working with
constant arguments.

## Linked

Lastly, there is also a `#[linked]` attribute available when the `linkedproofs`
feature is enabled. This attribute is used when linking together our FHE and ZKP
compilers; see the [linked section](/linked/intro/intro.md) for more details.
