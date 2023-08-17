# Verifying

Once we receive [a proof](./prove.md), we can verify it!

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

// Verify the proof
runtime.verify(
    either_zkp, // compiled ZKP program
    &proof,     // the proof to verify
    vec![y, z],  // public inputs
    vec![],     // constant inputs
)?;

Ok(())
# }
```
Excluding the compiled ZKP program and proof, the remaining arguments must be passed in via a [Vec](https://doc.rust-lang.org/std/vec/struct.Vec.html).

Let's break down the arguments to `runtime.verify`:
1. The first argument will be the compiled ZKP program
2. The second argument is the proof that we receive from the prover
3. The third argument is any public inputs (viewable to both the prover and verifier)
4. The fourth argument is any constant inputs ([constant inputs are an advanced feature](../advanced/constant_inputs.md) so this will often be empty)

Notice that, like proof generation, verification is also a fallible operation.
An [`Err`](https://doc.rust-lang.org/std/result/enum.Result.html#variant.Err)
result indicates that verification of the proof failed and the verifier should
not trust the proof they were given.

## ZKP verification builder

The same limitations discussed in [the last chapter](./prove.md#zkp-proof-builder) apply to the `verify` method. If you have arguments of varying types, you will find the verification builder much more convenient to use:

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
    #[public] z: Field<F>,
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

# let proof = runtime.proof_builder(eval_zkp)
#     .public_input(z)
#     .public_input(ys)
#     .private_input(x)
#     .prove()?;
#
runtime.verification_builder(eval_zkp)
    .proof(&proof)
    .public_input(z)
    .public_input(ys)
    .verify()?;
#     Ok(())
# }
```
