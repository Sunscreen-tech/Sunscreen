# Key Generation
Once you've created a runtime, generating keys is simple:

```rust,no_run
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
#     Compiler, Runtime, PublicKey
# };
#
# #[fhe_program(scheme = "bfv")]
# fn noop() {
# }
#
# fn main() {
#    let fhe_program = Compiler::with_fhe_program(noop)
#        .compile()
#        .unwrap();
#
#    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();
#
    let (public_key, private_key) = runtime.generate_keys().unwrap();
# }
```

This produces a public key (which allows you to encrypt data and run FHE programs) and a private key (which allows you to decrypt).
