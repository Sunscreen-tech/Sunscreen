# Proving

To make a proof, you must supply all of the arguments defined in your ZKP
program function.

```rust
# use sunscreen::{
#     bulletproofs::BulletproofsBackend,
#     types::zkp::{BulletproofsField, Field, FieldSpec},
#     zkp_program, zkp_var, Compiler, Error, ZkpRuntime,
# };
#[zkp_program]
fn either<F: FieldSpec>(
    #[private] x: Field<F>,
    #[public] y: Field<F>,
    #[public] z: Field<F>,
) {
    let zero = zkp_var!(0);
    let poly = (y - x) * (z - x);
    poly.constrain_eq(zero);
}
# fn main() -> Result<(), Error> {
#     let app = Compiler::new()
#         .zkp_backend::<BulletproofsBackend>()
#         .zkp_program(either)
#         .compile()?;
# 
#     let either_zkp = app.get_zkp_program(either).unwrap();
# 

// ...

let runtime = ZkpRuntime::new(BulletproofsBackend::new())?;
 
let x = BulletproofsField::from(64);
let y = BulletproofsField::from(64);
let z = BulletproofsField::from(1000);

let proof = runtime.prove(
    either_zkp, // compiled ZKP program
    vec![x],    // private inputs
    vec![y, z], // public inputs
    vec![],     // constant inputs
)?;
# 
#     Ok(())
# }
```

Recall that `zkp_program` arguments should appear in order private, public,
constant to match the `prove` call.

Excluding the compiled ZKP program, all other arguments must be passed in via a [Vec](https://doc.rust-lang.org/std/vec/struct.Vec.html).

Let's break down the arguments to `runtime.prove`:
1. The first argument must be the compiled ZKP program
2. The second argument must be private inputs (only viewable by the prover)
3. The third argument must be be any public inputs (which are viewable by both the prover and verifier)
4. The fourth argument must be any constant inputs ([constant inputs are an advanced feature](../advanced/constant_inputs.md) so this will often be empty!)

Notice that proof generation is a fallible operation. If you try to construct an
invalid proof, the runtime will return an error, so that you don't end up trying
to send an invalid proof to a verifier, only to be rejected later. This is for
developer convenience; please note that security does **not** rely on this API
decision.

## ZKP proof builder

One issue you may run into is that `prove` accepts vectors of type `I:
Into<ZkpProgramInput>`. In Rust, elements in a `Vec` must all have the same
type. Consequently, if you have arguments with varying types, you'd have to
convert them all to `ZkpProgramInput`.

However, we offer a convenient builder method for precisely this reason:

```rust
# use sunscreen::{
#     bulletproofs::BulletproofsBackend,
#     types::zkp::{BulletproofsField, Field, FieldSpec},
#     zkp_program, zkp_var, Compiler, Error, ZkpRuntime,
#     ZkpProgramInput,
# };
#[zkp_program]
fn eval<F: FieldSpec>(
    #[private] x: Field<F>,
    #[private] z: Field<F>,
    #[public] ys: [Field<F>; 2],
) {
    let poly = (ys[0] - x) * (ys[1] - x);
    poly.constrain_eq(z);
}
# fn main() -> Result<(), Error> {
#     let app = Compiler::new()
#         .zkp_backend::<BulletproofsBackend>()
#         .zkp_program(eval)
#         .compile()?;
# 
#     let eval_zkp = app.get_zkp_program(eval).unwrap();
# 
#     let runtime = ZkpRuntime::new(BulletproofsBackend::new())?;
# 
# 

// ...

let x = BulletproofsField::from(64);
let z = BulletproofsField::from(0);
let ys = [BulletproofsField::from(64), BulletproofsField::from(1000)];

let proof = runtime.proof_builder(eval_zkp)
    .private_input(x)
    .private_input(z)
    .public_input(ys)
    .prove()?;
# 
#     Ok(())
# }
```
