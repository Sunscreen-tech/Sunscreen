# Serialization
While most examples compute everything in one place, in practice, data will be split amongst multiple machines. You can serialize many things in Sunscreen:
* Ciphertexts
* Keys
* Scheme parameters
* FHE programs

Sunscreen uses [`serde`](https://serde.rs/) for serialization and can serialize data in a number of formats including JSON and bincode. Since most data in Sunscreen is high entropy byte arrays, we recommend using [bincode](https://docs.rs/bincode/1.3.3/bincode/) since it reduces storage and network requirements by efficiently packing byte arrays.

The process to serialize and deserialize any type is the same, but this example shows how to do it with a ciphertext:
```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
#     Compiler, Runtime, PublicKey, Ciphertext
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
#    let (public_key, _) = runtime.generate_keys().unwrap();
    let c = runtime
        .encrypt(Signed::from(20), &public_key)
        .unwrap();

    // ser is now a Vec<u8> that can be written to disk, socket, etc.
    let ser = bincode::serialize(&c).unwrap();

    // Upon receiving a serialized byte array, deserialize it
    // back into a Ciphertext. You may now use it normally.
    let c: Ciphertext = bincode::deserialize(&ser).unwrap();
# }
```

As with any dependency, you'll need to add `bincode` as a dependency in your `Cargo.toml`.
