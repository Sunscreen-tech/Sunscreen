# Running FHE Programs


In our simple example, we called `runtime.run` to execute our FHE program
```rust
# use sunscreen::{*, types::{{bfv::Signed}, Cipher}};
#
# fn main() { 
#   #[fhe_program(scheme = "bfv")]
#   fn multiply(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
#   a * b
#   }
#
#   let app = Compiler::new()
#       .fhe_program(multiply)
#       .plain_modulus_constraint(PlainModulusConstraint::Raw(64))
#       .compile()
#       .unwrap();
#
#   let runtime = Runtime::new(app.params()).unwrap();
#   let (public_key, _) = runtime.generate_keys().unwrap();
    let a_enc = runtime.encrypt(Signed::from(5), &public_key).unwrap();
    let b_enc = runtime.encrypt(Signed::from(15), &public_key).unwrap();

    let results = runtime.run(app.get_program(multiply).unwrap(), vec![a_enc, b_enc], &public_key).unwrap();
# }
```

Let's break down the arguments to `runtime.run`:
1. The first `fhe_program` argument is the compiled program you wish to run.
2. The second `vec![a, b]` argument contains the input arguments to the program in a [`Vec`](https://doc.rust-lang.org/std/vec/struct.Vec.html).
3. The final `public_key` argument is the public key used to generate the encrypted program inputs (i.e. `a_enc` and `b_enc`).

## FHE program inputs
Rust requires collections be homogenous (i.e. each item is the same type). However, program arguments may not be always be of the same type! 

Our `FheProgramInput` wrapper enum solves this problem; it wraps values so they can exist in a homogeneous collection. The run function's second argument is a `Vec<T>` where `T` readily converts into an `FheProgramInput` (i.e. `T impl` [`Into<FheProgramInput>`](https://doc.rust-lang.org/std/convert/trait.Into.html)[^1]). `Ciphertext` and all types under `sunscreen::bfv::types::*` do this.

If your FHE program only accepts ciphertexts (a common scenario), it's sufficient to simply pass a `Vec<Ciphertext>` as we did in the above example. However, if you want to mix `Ciphertext` and unencrypted values, you'll need to make a `Vec<FheProgramInput>` manually, converting each argument yourself:

```rust
# use sunscreen::{*, types::{{bfv::Signed}, Cipher}};
#
# fn main() {
#     // Note the lack of the `Cipher` type on b. This declares
#     // it as a unencrypted.
#     #[fhe_program(scheme = "bfv")]
#     fn multiply(a: Cipher<Signed>, b: Signed) -> Cipher<Signed> {
#         a * b
#     }
#
#     let app = Compiler::new()
#         .fhe_program(multiply)
#         .compile()
#         .unwrap();
#
#     let runtime = Runtime::new(app.params()).unwrap();
#     let (public_key, _) = runtime.generate_keys().unwrap();

    let a_enc = runtime.encrypt(Signed::from(5), &public_key).unwrap();

    // a is encrypted, but the second argument, b, is not.
    // We make a Vec<FheProgramInput> by calling `.into()`
    // on each value.
    let args: Vec<FheProgramInput> = vec![a_enc.into(), Signed::from(15).into()];
    let results = runtime.run(app.get_program(multiply).unwrap(), args, &public_key).unwrap();
# }
```

[^1]: `FheProgramInput` itself meets this requirement because every type in Rust is reflexive.

### Validation
When you compile your FHE program, the compiler marks down the call signature (argument and return types). The `run` function validates that the inputs you gave are appropriately encrypted/unencrypted and are of the correct type.

## Return value
On success, the `run` method returns a `Vec<Ciphertext>` containing each output of the FHE program.
* If the underlying FHE program returns a tuple, the entries of the `Vec` are each of the tuple's entries.
* If the underlying FHE program returns a single value, the `Vec` contains a single entry.
* If the underlying FHE program doesn't return anything, you should write more useful programs. The `Vec` will be empty.
