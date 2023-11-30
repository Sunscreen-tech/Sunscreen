# Troubleshooting
## How do I debug my algorithm?
You can write your algorithm [in a generic way](./factoring_fhe_programs.md), run it without FHE, and single step through it.
You can also compare results executing with and without FHE.

Another technique that can be helpful is to call the `render()` method on your compiled `FheProgram`. This returns a `String` containing the compiled execution graph in [DOT](https://www.graphviz.org/doc/info/lang.html) format. You can write this to a file and render it with [Graphviz](https://graphviz.org/), a standard graph rendering library.

## My FHE program yields the wrong answer. I'm certain the algorithm is correct.
Your issue might be one of 2 things:
1. You exceeded the [noise budget](../advanced/noise_margin.md). You can check the noise budget remaining on a ciphertext (this requires the private key) by calling (`runtime.measure_noise_budget(&ciphertext, &private_key)`). If this value is `0`, you exceeded the noise budget and your value is corrupted. The most common scenario where you will encounter this issue is when [chaining](#i-need-to-use-the-output-of-one-fhe-program-as-the-input-to-another-ie-chain-program-executions) multiple FHE program executions.
2. Overflow. [Try increasing the plaintext modulus](../advanced/plain_modulus/plain_modulus.md). Due to [carryless arithmetic](../advanced/carryless_arithmetic.md), understanding overflow can be a bit tricky. Usually, overflow occurs when your plaintext modulus is too small and a digit wraps. Values can also overflow during multiplication due to running out of digits. However, this is very rare in FHE.

## I need to use the output of one FHE program as the input to another (i.e. chain program executions).
We will likely improve the experience in the future, but you can do this today as follows:

1. Compile all your FHE programs with an increased [`noise_margin`](../advanced/noise_margin.md#changing-the-noise-margin) and look at their `metadata.params.lattice_dimension` values.
2. Change your application so the that the program with the largest lattice dimension (program `x`) compiles as it does in step 1, while the remaining programs call `.with_params(&x.metadata.params)` during compilation. This causes the remaining programs to use the same parameters verbatim.

The `noise_margin` you chose in step 1 determines how many times you can chain together program executions.

## What the heck is an `FheProgramNode`?
It's a type wrapper needed to compile your FHE program. Internally, the `#[fhe_program]` macro turns all your program inputs and outputs into graph nodes &mdash; i.e. `FheProgramNodes`. Operator inputs and outputs are actually `FheProgramNodes`, which build up the execution graph during compilation. Unfortunately, they tend to be a leaky abstraction that wind up in error messages.

Usually, these errors tell you an `FheProgramNode`'s inner type doesn't
support an operation you're trying to perform. In the example below, the compiler is saying you can't divide `Signed` values:

```ignore
error[E0369]: cannot divide `FheProgramNode<Cipher<Signed>>` by `FheProgramNode<Cipher<Signed>>`
  --> examples/simple_multiply/src/main.rs:22:7
   |
22 |     a / b
   |     - ^ - FheProgramNode<Cipher<Signed>>
   |     |
   |     FheProgramNode<Cipher<Signed>>

For more information about this error, try `rustc --explain E0369`.
```

This can also crop up when using explicit annotations. For example, the following will fail to compile:

```rust,no_run,compile_fail
#[fhe_program(scheme = "bfv")]
fn simple_multiply(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
    // This assignment will fail because a * b results in an
    // `FheProgramNode<Cipher<Signed>>`, not a Cipher<Signed>
    let c: Cipher<Signed>  = a * b;

    c
}
```

Unnecessary type annotations are unidiomatic and thus we advise against them. Usually, type inference is sufficient, but if you really need one you can import and use `sunscreen::types::intern::FheProgramNode`.
