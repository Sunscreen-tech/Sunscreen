# Pruning public keys
For convenience, the `generate_keys` function creates several keys in the returned `PublicKey` object. 

## Why you might want to prune `PublicKey`
Some of these keys can be fairly large, the size of which is determined by scheme parameters. However, they may or may not be needed in your application:

* Galois keys (`galois_key`) are needed to run FHE programs that perform batching rotations or row swapping.
* Relinearization keys (`relin_key`) are needed to run FHE programs that multiply ciphertexts.


## How to prune `PublicKey`

You can `compile()` an FHE program and look at `fhe_program.metadata.required_keys` to get a list of required keys for your specific program.

You can then remove unneeded keys. For example:
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
#    let fhe_program = Compiler::with_fhe_program(noop)
#        .compile()
#        .unwrap();
#
#    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();
let (public_key, private_key) = runtime.generate_keys().unwrap();

// Shadow and overwrite the public_key, removing the galois_key and relin_key
let public_key = PublicKey {
    galois_key: None, // only do this if not using batching
    relin_key: None, // only do this if your FHE program never multiplies ciphertexts
    ..public_key
};
# }
```

