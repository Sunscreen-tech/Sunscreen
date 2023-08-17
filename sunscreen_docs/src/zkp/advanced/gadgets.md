# Gadgets

Gadgets in ZKPs are analogous to functions in programming languages. Like functions, they can be invoked from within a ZKP, take inputs, and compute
outputs. Gadgets can also call other gadgets. 

We refer to the inputs of the gadget as "gadget inputs". With these inputs, the gadget then computes "hidden inputs" which will likely (but not always) be the gadget outputs. They're "hidden" in the sense that they're not directly passed into `prove` or `verify` but instead snuck into the [R1CS constraints](https://learn.0xparc.org/materials/circom/additional-learning-resources/r1cs%20explainer/) outside of the argument list; they're "inputs" in the sense that they will be viewed as private values that will be fed into your ZKP program. It is up to the gadget implementation to prove that the hidden inputs are calculated correctly.

## Why you might want to create a gadget

There a few reasons you might be interested in creating a gadget:
- To fine-tune/improve performance
- To re-use them across different ZKP programs
- To accomplish things not native to R1CS like division

## How to create a gadget

You can create your own gadgets by implementing the `Gadget` trait:[^object-safe]

```rust
# use sunscreen::{Result, types::zkp::{BigInt, NodeIndex}};
# use std::any::Any;
pub trait Gadget: Any + Send + Sync {
    /// Generate the circuit that proves the hidden inputs are calculated correctly
    /// and return the gadget outputs.
    fn gen_circuit(
        &self,
        gadget_inputs: &[NodeIndex],
        hidden_inputs: &[NodeIndex],
    ) -> Vec<NodeIndex>;

    /// Compute the ZKP hidden inputs from the gadget inputs
    fn compute_hidden_inputs(&self, gadget_inputs: &[BigInt]) -> Result<Vec<BigInt>>;

    /// Expected # of gadget inputs (this should be constant for a given implementation)
    fn gadget_input_count(&self) -> usize;

    /// Expected # of ZKP hidden inputs/gadget outputs (this should be constant for a given implementation)
    fn hidden_input_count(&self) -> usize;
}
```

You may have noticed that the `Field<F>` type does not occur in the gadget
definition. This is mostly an implementation detail, as we need to package up
various gadgets as dynamic trait objects. Instead, you work with `BigInt`s which
are the internal representation of a native field. If your gadget relies on
any context specific to the ZKP backend, you'll have to provide that context to
the gadget. This is demonstrated in the example below.

**Warning**: Even though we're working with `BigInt` values, the gadget must return values less than the field modulus otherwise proof generation will fail. You can pass the field modulus as an argument to the gadget's constructor and provide this value via `FieldSpec::FIELD_MODULUS`. See [example](https://github.com/Sunscreen-tech/Sunscreen/blob/f05ce704b1a9e220a3d8daab506cf564655e809b/sunscreen/src/types/zkp/gadgets/arithmetic.rs#L236).


## Example

Let's walk through an example of a gadget that computes the multiplicative inverse
of a native field element. Here, the gadget input will be some native field
element \\(x\\) and the calculated hidden input will be \\(x^{-1}\\). The gadget
output is just the hidden input in this case.[^example-output]

### Definition

The inverse calculation is dependent on the field modulus, so we'll parameterize
the gadget with this context:

```rust
use sunscreen::types::zkp::BigInt;

pub struct Inverse {
    field_modulus: BigInt,
}
```

### Counting inputs

Let's get the easy stuff out of the way. To calculate an inverse, we take in one
native field element (this will be the value to be inverted) and return one native field element (this will be the inverse). Thus:

```rust
use sunscreen::{
    types::zkp::{BigInt, Gadget, NodeIndex},
    ZkpResult,
};
# pub struct Inverse {
#     field_modulus: BigInt,
# }
impl Gadget for Inverse {

    fn gadget_input_count(&self) -> usize {
        1
    }

    fn hidden_input_count(&self) -> usize {
        1
    }

    fn compute_hidden_inputs(&self, gadget_inputs: &[BigInt]) -> ZkpResult<Vec<BigInt>> {
        todo!()
    }

    fn gen_circuit(
        &self,
        gadget_inputs: &[NodeIndex],
        hidden_inputs: &[NodeIndex],
    ) -> Vec<NodeIndex> {
        todo!()
    }
}
```

### Computing inputs

Next, we compute the hidden input, which in this case is the inverse of the
single gadget input. There's one very important detail to keep in mind when
computing hidden inputs&mdash;**to prevent timing (side channel) attacks, your implementation must run in [constant time](https://en.wikipedia.org/wiki/Timing_attack)!**

```rust
# use sunscreen::{
#     types::zkp::{BigInt, Gadget, NodeIndex},
#     ZkpError, ZkpResult,
# };
# pub struct Inverse {
#     field_modulus: BigInt,
# }
# impl Gadget for Inverse {
# 
#     fn gadget_input_count(&self) -> usize {
#         1
#     }
# 
#     fn hidden_input_count(&self) -> usize {
#         1
#     }
# 
fn compute_hidden_inputs(&self, gadget_inputs: &[BigInt]) -> ZkpResult<Vec<BigInt>> {
    let x = gadget_inputs[0];

    if x == BigInt::ZERO {
        return Err(ZkpError::gadget_error("Cannot take inverse of zero."));
    }
    if self.field_modulus == BigInt::ZERO {
        return Err(ZkpError::gadget_error(
            "Cannot have a finite field of zero size.",
        ));
    }

    // Note: BigInt::inverse_fp runs in constant time
    let x_inv = x.inverse_fp(&self.field_modulus);

    Ok(vec![x_inv])
}
# 
#     fn gen_circuit(
#         &self,
#         gadget_inputs: &[NodeIndex],
#         hidden_inputs: &[NodeIndex],
#     ) -> Vec<NodeIndex> {
#         todo!()
#     }
# }
```

### Generating the circuit

Finally, we need to produce the circuit proving that the hidden inputs were
calculated correctly. 

```rust
# use sunscreen::{
#     types::zkp::{BigInt, Gadget, NodeIndex},
#     zkp::{ZkpContextOps, with_zkp_ctx},
#     ZkpError, ZkpResult,
# };
# pub struct Inverse {
#     field_modulus: BigInt,
# }
# impl Gadget for Inverse {
# 
#     fn gadget_input_count(&self) -> usize {
#         1
#     }
# 
#     fn hidden_input_count(&self) -> usize {
#         1
#     }
# 
#     fn compute_hidden_inputs(&self, gadget_inputs: &[BigInt]) -> ZkpResult<Vec<BigInt>> {
#         todo!()
#     }
# 
fn gen_circuit(
    &self,
    gadget_inputs: &[NodeIndex],
    hidden_inputs: &[NodeIndex],
) -> Vec<NodeIndex> {
   let x = gadget_inputs[0];
   let x_inv = hidden_inputs[0];

   with_zkp_ctx(|ctx| {
       // Assert x * x^-1 == 1
       let prod = ctx.add_multiplication(x, x_inv);
       ctx.add_constraint(prod, &BigInt::ONE);
   });

   vec![x_inv]
}
# }
```

The proof that the inverse was calculated properly is quite simple in this case;
we just need to constrain that the product of the gadget input and its inverse
is equal to one. The `with_zkp_ctx` call is how we insert these constraints into
the graph context. Finally, we return the inverse as the gadget output.

### Invoking the gadget

To use our gadget, we use the `sunscreen::invoke_gadget` function. This function
returns raw graph node indices, so library authors are encouraged to write a wrapper
function for use in ZKP program functions.

```rust
# use sunscreen::{
#     invoke_gadget,
#     types::zkp::{BigInt, Gadget, Field, FieldSpec, NodeIndex, ProgramNode},
#     zkp::{ZkpContextOps, with_zkp_ctx},
#     zkp_program, zkp_var, ZkpError, ZkpResult,
# };
# pub struct Inverse {
#     field_modulus: BigInt,
# }
# impl Gadget for Inverse {
#     fn gadget_input_count(&self) -> usize {
#         1
#     }
#     fn hidden_input_count(&self) -> usize {
#         1
#     }
#     fn compute_hidden_inputs(&self, gadget_inputs: &[BigInt]) -> ZkpResult<Vec<BigInt>> {
#         let x = gadget_inputs[0];
#     
#         if x == BigInt::ZERO {
#             return Err(ZkpError::gadget_error("Cannot take inverse of zero."));
#         }
#         if self.field_modulus == BigInt::ZERO {
#             return Err(ZkpError::gadget_error(
#                 "Cannot have a finite field of zero size.",
#             ));
#         }
#     
#         // Note: BigInt::inverse_fp runs in constant time
#         let x_inv = x.inverse_fp(&self.field_modulus);
#     
#         Ok(vec![x_inv])
#     }
#     fn gen_circuit(
#         &self,
#         gadget_inputs: &[NodeIndex],
#         hidden_inputs: &[NodeIndex],
#     ) -> Vec<NodeIndex> {
#        let x = gadget_inputs[0];
#        let x_inv = hidden_inputs[0];
#     
#        with_zkp_ctx(|ctx| {
#            // Assert x * x^-1 == 1
#            let prod = ctx.add_multiplication(x, x_inv);
#            ctx.add_constraint(prod, &BigInt::ONE);
#        });
#     
#        vec![x_inv]
#     }
# }
pub fn inverse<F: FieldSpec>(
    x: ProgramNode<Field<F>>
) -> ProgramNode<Field<F>> {
    let gadget = Inverse { field_modulus: F::FIELD_MODULUS };
    let x_inv_ids = invoke_gadget(gadget, x.ids);
    ProgramNode::new(&x_inv_ids)
}

#[zkp_program]
fn use_inverse<F: FieldSpec>(a: Field<F>) {
    let a_inv = inverse(a);
    let one = zkp_var!(1);
    (a * a_inv).constrain_eq(one);
}
```

Gadgets are a very useful tool for building up functionality to be reused across
ZKPs. However, because hidden input calculations need to be constant time,
gadgets need to be written very carefully.

If you'd like to see a real example of the utility of gadgets, check out the
source of how [`Field::constrain_ge_bounded`][constrain] is implemented.


[^object-safe]: For those familiar with Rust, you might wonder why we're not
    using something like associated constants for the gadget and hidden input
    counts; the reason is that we need to ensure that your gadgets are [object
    safe](https://doc.rust-lang.org/reference/items/traits.html#object-safety).

[^example-output]: We mentioned above that gadget outputs are typically just the
    computed hidden inputs. For an example where this is not the case, suppose a
    gadget does integer division \\( \lfloor a / b \rfloor \\). The natural way to do this would be
    to compute hidden inputs \\(q\\) and \\(r\\) and generate a circuit proving that \\(a
    = qb + r\\) and \\(0 \le r < b\\). The gadget output, however, would just be
    the one hidden input quotient \\(q\\).

[constrain]: https://docs.rs/sunscreen/latest/sunscreen/types/zkp/struct.Field.html#method.constrain_ge_bounded
