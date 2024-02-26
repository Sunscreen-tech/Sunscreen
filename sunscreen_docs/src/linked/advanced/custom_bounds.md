# Custom bounds

If you are comfortable with the math behind the [SDLP](/linked/intro.how.md),
advanced users may wish to customize certain bounds in the secret `S`. Note that
the correctness of linking types relies on the bounds we've used in our
implementation (which varies among the FHE types but generally looks like a
bound up to the plaintext modulus for coefficients under degree 256, and zero
for greater coefficients). For this reason, we expressly discourage changing the
bounds for any messages that are linked to ZKP programs. However, you may wish
to change the bound on noise terms for computed ciphertexts; we use a liberal
bound of $\Delta/2$, which is the maximum noise permitted for a valid
decryption. If you want to ensure that a computed ciphertext has much less noise,
perhaps to use it as an input for further computation, you can lower this bound.

To do this, first familiarize yourself with the [documentation](https://docs.rs/logproof/latest/logproof/bfv_statement/fn.generate_prover_knowledge.html) concerning the shape of `S`.
Then you can modify its bounds with the code below.


```rust,no_run,no_playground
# let linkedproof: sunscreen::linked::LinkedProof = todo!();
bounds = linkedproof.sdlp_mut().vk_mut().bounds_mut();
// For a single decryption statement, S will have one column and four rows, with
// the last entry containing the noise. Let's lower the bound to 32 bits.
*bounds[(3, 0)] = 32;
```

