# Short discrete log proof

If you only have to prove that ciphertexts are well formed and within certain
noise bounds, and you don't have any arbitrary properties to prove about the
encrypted values, you can also use an `Sdlp` on its own, rather than a full
`LinkedProof` and ZKP program.

```rust
{{#rustdoc_include ../basic_prog.rs:none}}
# fn main() -> Result<(), Error> {
let app = Compiler::new()
    .fhe_program(increase_by_factor)
    .compile()?;
let runtime = FheRuntime::new(app.params())?;
let (public_key, private_key) = runtime.generate_keys()?;

let mut proof_builder = runtime.sdlp_builder();
let ct = proof_builder.encrypt(&Signed::from(2), &public_key)?;
let proof = proof_builder.build()?;

let mut verify_builder = runtime.sdlp_verification_builder();
verify_builder.encrypt(&ct, &public_key)?;
verify_builder.proof(proof).verify()?;

#     Ok(())
# }
```
