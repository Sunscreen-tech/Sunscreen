# Key Generation
Once you've created a runtime, generating keys is simple:

```rust
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
#    let app = Compiler::new()
#        .fhe_program(noop)
#        .compile()
#        .unwrap();
#
#    let runtime = Runtime::new(app.params()).unwrap();
#
    let (public_key, private_key) = runtime.generate_keys().unwrap();
# }
```

This produces a public key (which allows you to encrypt data and run FHE programs) and a private key (which allows you to decrypt).
