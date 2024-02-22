# Serialization

Serializing works just like [unlinked proofs](/zkp/runtime/serialization.md),
but for the sake of completeness, below is an example of serialization and
deserialization of a linked proof:

```rust
# use sunscreen::{
#     bulletproofs::BulletproofsBackend,
#     fhe_program, zkp_program, zkp_var,
#     types::{bfv::Signed, Cipher, zkp::{Field, FieldSpec, BfvSigned}},
#     Compiler, Error, FheZkpRuntime,
#     linked::{LinkedProofBuilder},
# };
# fn main() -> Result<(), Error> {
# #[fhe_program]
# fn increase_by_factor(x: Signed, scale: Cipher<Signed>) -> Cipher<Signed> {
#     x * scale
# }
# 
# #[zkp_program]
# fn is_greater_than_one<F: FieldSpec>(scale: BfvSigned<F>) {
#     scale.into_field_elem().constrain_gt_bounded(zkp_var!(1), 64);
# }
# 
# let app = Compiler::new()
#     .fhe_program(increase_by_factor)
#     .zkp_backend::<BulletproofsBackend>()
#     .zkp_program(is_greater_than_one)
#     .compile()?;
# let runtime = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new())?;
# let (public_key, private_key) = runtime.generate_keys();
# 
# let mut builder = LinkedProofBuilder::new(&runtime);
# 
# let (ct, link) = builder.encrypt_returning_link(&Signed::from(2), &public_key)?;
// continuing from our previous examples
let proof = builder
    .zkp_program(is_greater_than_one)?
    .linked_input(link)
    .build()?;
let serialized_proof = bincode::serialize(&proof)?;
let deserialized_proof: LinkedProof = bincode::deserialize(&serialized_proof)?;
#     Ok(())
# }
```
