# Decryption
To decrypt, simply call `decrypt()` using your private key and the data you want to decrypt

```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
#     Compiler, Runtime, PublicKey, PlainModulusConstraint
# };
#
# #[fhe_program(scheme = "bfv")]
# fn noop() {
# }
#
# fn main() {
#    let fhe_program = Compiler::with_fhe_program(noop)
#        .plain_modulus_constraint(PlainModulusConstraint::Raw(5))
#        .compile()
#        .unwrap();
#
#    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();
#    let (public_key, private_key) = runtime.generate_keys().unwrap();
#
#    let val = Signed::from(15);
#    let val_enc = runtime.encrypt(val, &public_key).unwrap();
#
    // val_enc is an encrypted `Signed` value coming from an FHE program
    // or just directly encrypted.
    let a: Signed = runtime.decrypt(&val_enc, &private_key).unwrap();
# }
```

## Validation
Unlike with `encrypt`, you must specify the unencrypted data type (either on the left-hand side as above or using [turbofish](https://techblog.tonsser.com/posts/what-is-rusts-turbofish)). The encrypted value's type must match the assigned type; if the specified data type doesn't match that on the [ciphertext](./encryption.html#type-annotation), `decrypt` will return an error. In the above example, decrypt will fail if the encrypted value is not a `Signed` type.
