# Custom bounds

If you are comfortable with the math behind the [SDLP](/linked/intro.how.md),
advanced users may wish to customize certain bounds in the secret `S`. Note that
the correctness of linking types relies on the bounds we've used in our
implementation (which varies among the FHE types but generally looks like a
bound up to the plaintext modulus for coefficients under degree 256, and zero
for greater coefficients). For this reason, we expressly discourage changing the
bounds for any messages that are linked to ZKP programs. However, you may wish
to change the bound on noise terms for computed ciphertexts; we use a liberal
bound of $\Delta/2$ for each coefficient in the noise polynomial, which is the
maximum noise permitted for a valid decryption. If you want to ensure that a
computed ciphertext has much less noise, perhaps to use it as an input for
further computation, you can lower this bound.

To do this, first familiarize yourself with the [documentation](https://docs.rs/logproof/latest/logproof/bfv_statement/fn.generate_prover_knowledge.html) concerning the shape of `S`.
Then you can modify its bounds with the code below.


```rust,no_run
{{#rustdoc_include ../basic_prog.rs:none}}
use sunscreen::linked::Bounds;

# fn main() -> Result<(), Error> {
let app = Compiler::new()
    .fhe_program(increase_by_factor)
    .zkp_backend::<BulletproofsBackend>()
    .zkp_program(is_greater_than_one)
    .compile()?;
let runtime = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new())?;
let (public_key, private_key) = runtime.generate_keys()?;
# let existing_ct = runtime.encrypt(Signed::from(2), &public_key)?;

let mut proof_builder = runtime.linkedproof_builder();

// Assume existing ciphertext comes out of a computation
let (pt, link) = proof_builder.decrypt_returning_link::<Signed>(&existing_ct, &private_key)?;

// For a single decryption statement, S will have one column and four rows, with
// the last entry containing the noise. Let's lower the bound on each
// coefficient in the noise polynomial to 32 bits.
let degree = app.params().lattice_dimension as usize;
let proof = proof_builder
    .add_custom_bounds(3, 0, Bounds(vec![32; degree]))
    .zkp_program(app.get_zkp_program(is_greater_than_one).unwrap())?
    .linked_input(link)
    .build()?;

let mut verify_builder = runtime.linkedproof_verification_builder();
verify_builder.decrypt_returning_link::<Signed>(&existing_ct)?;
// The verifier must specify the same bounds!
verify_builder
    .add_custom_bounds(3, 0, Bounds(vec![32; degree]))
    .proof(proof)
    .zkp_program(app.get_zkp_program(is_greater_than_one).unwrap())?
    .verify()?;
#     Ok(())
# }
```
