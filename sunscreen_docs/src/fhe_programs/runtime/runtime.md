# Runtime
To create a runtime, you simply call `Runtime::new`, passing a `Params` object. You get a params object from compiling an FHE program as we did in our example.

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
    let runtime = Runtime::new(&fhe_program.metadata.params).unwrap();
# }
```

Once you're created a runtime, you can:
* [generate public/private keys](./key_generation.md)
* [encrypt plaintexts](./encryption.md)
* [run FHE programs](./running_fhe_programs.md)
* [decrypt ciphertexts](./decryption.md)

## Parameter compatibility
Note that to use artifacts produced by a runtime (e.g. ciphertexts, keys), they must have been produced under a runtime using *exactly the same parameters*. This situation may have ramifications if you're attempting to re-use ciphertexts across multiple FHE programs; those programs must be compiled with the *same* set of parameters.