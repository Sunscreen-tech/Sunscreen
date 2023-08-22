# Runtime

To create a runtime, you simply call `ZkpRuntime::new`, passing a `ZkpBackend`
reference. Currently, we support Bulletproofs as the only proof backend.

```rust
# use sunscreen::{
#     bulletproofs::BulletproofsBackend,
#     types::zkp::{BulletproofsField, Field, FieldSpec},
#     zkp_program, zkp_var, Compiler, Error, ZkpRuntime,
# };
# fn main() -> Result<(), Error> {
let runtime = ZkpRuntime::new(BulletproofsBackend::new())?;
#     Ok(())
# }
```

Once you're created a runtime, you can:
* [make a proof](./prove.md)
* [verify a proof](./verify.md)
