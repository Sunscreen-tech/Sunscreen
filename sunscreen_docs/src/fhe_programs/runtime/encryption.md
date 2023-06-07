# Encryption
To encrypt data, simply call `encrypt()` on `FheRuntime`:
```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
#     Compiler, FheRuntime, PublicKey
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
#    let runtime = FheRuntime::new(app.params()).unwrap();
#    let (public_key, private_key) = runtime.generate_keys().unwrap();
#
    let val = Signed::from(15);
    let val_enc = runtime.encrypt(val, &public_key).unwrap();
# }
```

This produces a `Ciphertext` value suitable for use in `run()`. Be careful not to confuse the `Ciphertext` type, which represents an actual encrypted value, with [`Cipher`](/fhe_programs/types/types.md#cipher), which is a marker type to indicate a value in an FHE program is encrypted! Sunscreen can encrypt any of its provided [types](/fhe_programs/types/types.md) or fixed-length arrays[^1] of them. Note that arrays encrypt as multiple values in a single large `Ciphertext`.

[^1]: Fixed-length arrays have the type `[T; N]` where `N` is a the number `T`s. Don't confuse these with `Vec<T>`, which does not encode the length in its type! Sunscreen does not support `Vecs`.

## Cleartext metadata
Sunscreen attaches scheme parameters and the underlying datatype metadata to each `Ciphertext`. The former aids in serialization, while the latter [prevents honest mistakes](/fhe_programs/runtime/running_fhe_programs.md#validation) and improves the developer experience. When you serialize `Ciphertext` values to send over the network, this metadata appears in the clear. For most applications, this will be public information and part of the protocol. If, for some reason, you need the data type or scheme parameters to also be encrypted, you should encrypt the serialized ciphertext (e.g. use TLS for communication).
