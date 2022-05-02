# Noise

Every FHE operation introduces *noise* into ciphertexts.[^1] If too much noise accrues, then the message becomes garbled and cannot be decrypted. The total amount of allowed noise before this problem occurs is referred to as the *noise budget*.

Fortunately, our compiler handles this noise issue for you. It uses a value known as the `noise_margin` that influences how conservative it needs to be in parameter selection. So long as `noise_budget >= noise_margin`, we're good to go. Sunscreen's default noise margin prevents garbled ciphertexts coming from a *single* FHE program.

[^1]: Multiplying ciphertexts is one of the largest contributors to noise growth.


## Why you might want to change the default noise margin
There are a few reasons you may wish to change the noise margin:
* If you wish to use an output of one FHE program as an input to another FHE program, you need to allow for additional noise growth in subsequent programs. See our [calculator](https://github.com/Sunscreen-tech/Sunscreen/blob/main/examples/calculator_rational/src/main.rs#L221) for a complete example of this scenario.
* Decreasing the noise margin can result in improved performance if your application can tolerate a higher rate of faults.

## How to change the noise margin
To change the noise margin, simply call `.additional_noise_budget()` when compiling your program. For example:

```rust,no_run
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
#     Compiler, Runtime, PublicKey
# };
#
# #[fhe_program(scheme = "bfv")]
# fn my_program() {
# }
#
# fn main() {
    let fhe_program = Compiler::with_fhe_program(my_program)
        .additional_noise_budget(60)
        .compile()
        .unwrap();
# }
```
