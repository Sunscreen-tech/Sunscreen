# Serialization

So far, our examples have computed everything in one place. In practice, writing a ZKP program, proving, and verifying are often split among multiple machines.

In Sunscreen, you can serialize proofs. 

Sunscreen uses [`serde`](https://serde.rs/) for serialization and can serialize data in a
number of formats including JSON and bincode. Since most data in Sunscreen is
high entropy byte arrays, we recommend using
[bincode](https://docs.rs/bincode/latest/bincode/) since it reduces storage and
network requirements by efficiently packing byte arrays.

Below is an example of serialization and deserialization of a proof:

```rust
# use std::io;
# 
# use sunscreen::{
#     bulletproofs::BulletproofsBackend, types::zkp::{BulletproofsField, Field, FieldSpec},
#     Compiler, ZkpProgramInput, ZkpRuntime, Proof, zkp_var, zkp_program
# };
# 
# #[zkp_program]
# fn zkp<F: FieldSpec>(x: Field<F>, #[public] y: Field<F>) {
#     x.constrain_eq(y + zkp_var!(1));
# }
# 
# fn main() -> Result<(), Box<dyn std::error::Error>> {
#     let app = Compiler::new()
#         .zkp_backend::<BulletproofsBackend>()
#         .zkp_program(zkp)
#         .compile()?;
#     let prog = app.get_zkp_program(zkp).unwrap();
#     let runtime = ZkpRuntime::new(BulletproofsBackend::new())?;
# 
#     let x: BulletproofsField = BulletproofsField::from(1);
#     let y: BulletproofsField = BulletproofsField::from(2);
let proof: Proof = runtime.prove(prog, vec![y], vec![x], vec![])?;
let serialized_proof = bincode::serialize(&proof)?;
let deserialized_proof: Proof = bincode::deserialize(&serialized_proof)?;
#     Ok(())
# }
```

As with any dependency, you'll need to add `bincode` as a dependency in your `Cargo.toml`.

To see how serialization works in practice, check out our [set inclusion
application](../applications/allowlist.md).
