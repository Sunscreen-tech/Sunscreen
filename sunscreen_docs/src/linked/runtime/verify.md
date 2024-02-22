# Verifying

Fortunately, verifying a linked proof is a much simpler process than building
one! You'll just need to supply the ZKP program and any public or constant inputs:

```rust
# use sunscreen::{
#     bulletproofs::BulletproofsBackend,
#     fhe_program, zkp_program, zkp_var,
#     types::{bfv::Signed, Cipher, zkp::{Field, FieldSpec, BfvSigned}},
#     Compiler, Error, FheZkpRuntime,
#     linked::{LinkedProofBuilder},
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
let runtime = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new())?;
let (public_key, private_key) = runtime.generate_keys();

let mut builder = LinkedProofBuilder::new(&runtime);

let (ct, link) = builder.encrypt_returning_link(&Signed::from(2), &public_key)?;
let proof = builder
    .zkp_program(is_greater_than_one)?
    .linked_input(link)
    .build()?;

proof.verify(
    app.get_zkp_program(is_greater_than_one).unwrap(),
    vec![],
    vec![],
    )?;
#     Ok(())
# }
```

<!-- ST: Glossing over the fact that the verifier is blindly assuming the
ciphertexts and public keys within the SDLP are in fact the correct ones! We
need a way to parameterize the verifier knowledge over such items, this is TBD. -->
