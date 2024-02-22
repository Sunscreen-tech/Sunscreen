# Compiling

Compiling a ZKP program with linked inputs differs slightly from [compiling a normal ZKP program](/zkp/compiling/compiling.md). This is because the inputs that get linked depend on the FHE parameters used in their creation. For this reason, it's not possible to just call `zkp_progam.compile()?`, because there's not enough context to know what these FHE parameters are.

Instead, you'll need to invoke a full `Compiler` and specify an `fhe_program` so
that we know what FHE parameters to use when compiling the `zkp_program`. Don't
worry &mdash; our types are defined so that you won't even be able to specify the
linked ZKP program unless you've already passed an `fhe_program` &mdash; doing
otherwise will result in a Rust compile-time error.

This will not compile:
```rust,no_run,compile_fail
# use sunscreen::{
#     bulletproofs::BulletproofsBackend,
#     fhe_program, zkp_program, zkp_var,
#     types::{bfv::Signed, Cipher, zkp::{Field, FieldSpec, BfvSigned}},
#     Compiler, Error, FheZkpRuntime,
# };
# fn main() -> Result<(), Error> {
#[zkp_program]
fn is_greater_than_one<F: FieldSpec>(scale: BfvSigned<F>) {
    scale.into_field_elem().constrain_gt_bounded(zkp_var!(1), 64);
}

let app = Compiler::new()
    .zkp_backend::<BulletproofsBackend>()
    .zkp_program(is_greater_than_one) // This is a (rust) compile-time error!
    .compile()?;
#     Ok(())
# }
```

but this will:

```rust
# use sunscreen::{
#     bulletproofs::BulletproofsBackend,
#     fhe_program, zkp_program, zkp_var,
#     types::{bfv::Signed, Cipher, zkp::{Field, FieldSpec, BfvSigned}},
#     Compiler, Error, FheZkpRuntime,
# };
# fn main() -> Result<(), Error> {
#[fhe_program]
fn increase_by_factor(x: Signed, scale: Cipher<Signed>) -> Cipher<Signed> {
    x * scale
}

#[zkp_program]
fn is_greater_than_one<F: FieldSpec>(scale: BfvSigned<F>) {
    scale.into_field_elem().constrain_gt_bounded(zkp_var!(1), 64);
}

let app = Compiler::new()
    .fhe_program(increase_by_factor)
    .zkp_backend::<BulletproofsBackend>()
    .zkp_program(is_greater_than_one)
    .compile()?;
#     Ok(())
# }
```
