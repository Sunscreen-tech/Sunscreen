# Serialization

Serializing works just like [unlinked proofs](/zkp/runtime/serialization.md),
but for the sake of completeness, below is an example of serialization and
deserialization of a linked proof:

```rust,no_run
{{#rustdoc_include ../basic_prog.rs:none}}
# fn main() -> Result<(), Box<dyn std::error::Error>> {
# let app = Compiler::new()
#     .fhe_program(increase_by_factor)
#     .zkp_backend::<BulletproofsBackend>()
#     .zkp_program(is_greater_than_one)
#     .compile()?;
# 
# let runtime = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new())?;
# let (public_key, private_key) = runtime.generate_keys()?;
# let mut builder = runtime.linkedproof_builder();
let (ct, link) = builder.encrypt_returning_link(&Signed::from(2), &public_key)?;
let proof = builder
    .zkp_program(app.get_zkp_program(is_greater_than_one).unwrap())?
    .linked_input(link)
    .build()?;
let serialized_proof = bincode::serialize(&proof)?;
let deserialized_proof: LinkedProof = bincode::deserialize(&serialized_proof)?;
#     Ok(())
# }
```
