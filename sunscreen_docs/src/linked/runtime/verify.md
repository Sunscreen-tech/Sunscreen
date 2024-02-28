# Verifying

Verifying a linked proof looks just like proving one. You'll call the same
methods on the `LinkedProofVerificationBuilder` that you did on the
`LinkedProofBuilder`, in the same order, but instead of supplying the private
values, you'll supply the public ones. Then you'll specify the proof, ZKP
program, and any public or constant inputs, as we did for the [unlinked ZKP
programs](/zkp/runtime/verify.md).

```rust,no_run
{{#rustdoc_include ../basic_prog.rs:none}}
# fn main() -> Result<(), Error> {
let app = Compiler::new()
    .fhe_program(increase_by_factor)
    .zkp_backend::<BulletproofsBackend>()
    .zkp_program(is_greater_than_one)
    .compile()?;
let runtime = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new())?;
let (public_key, private_key) = runtime.generate_keys()?;

let mut proof_builder = runtime.linkedproof_builder();

let (ct, link) = builder.encrypt_returning_link(&Signed::from(2), &public_key)?;
let proof = builder
    .zkp_program(app.get_zkp_program(is_greater_than_one).unwrap())?
    .linked_input(link)
    .build()?;

let mut verify_builder = runtime.linkedproof_verification_builder();
verify_builder.encrypt_returning_link(&ct, &public_key)?;
verify_builder
    .proof(proof)
    .zkp_program(app.get_zkp_program(is_greater_than_one).unwrap())?
    .prove()?;
#     Ok(())
# }
```
