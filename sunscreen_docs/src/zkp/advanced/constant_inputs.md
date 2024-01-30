# Constant inputs

In general, we recommend sticking with `#[private]` and `#[public]` argument
types. 

## Why you might want to use constant inputs

However, if you find that you're using a fixed public value as a ZKP program input, you might want to consider using the `#[constant]` argument type instead of `#[public]`. Often times, this will give you a performance boost (you'll see why below).

However, there is a trade-off in that constant inputs must always be encoded.
Currently, our `ZkpRuntime` only offers `prove()` and `verify()` methods, but in the
future we may offer a `jit()` method, with all public inputs already encoded.
In this scenario, constant inputs would still have to be encoded on every
`jitted.verify()` call.

Furthermore, constant inputs are fundamentally incompatible with any proof
system requiring a trusted setup (as in you would have to re-run the trusted setup process). 

## How to use constant inputs

It's pretty straightforward to use constant inputs, simply use the `#[constant]` attribute for the relevant arguments you want to be treated as constants.

## An example

For example, let's say you've written the following ZKP to evaluate a polynomial
on private/secret coefficients:

```rust
# use sunscreen::{
#     bulletproofs::BulletproofsBackend,
#     types::zkp::{BulletproofsField, Field, FieldSpec},
#     zkp_program, zkp_var, Compiler, Error, ZkpProgramInput, ZkpRuntime,
# };
#[zkp_program]
fn evaluate_polynomial<F: FieldSpec>(
    coefficients: [Field<F>; 100], // private
    #[public] point: Field<F>,
    #[public] expected: Field<F>,
) {
    let mut evaluation = zkp_var!(0);
    let mut power = zkp_var!(1);
    for coeff in coefficients {
        evaluation = evaluation + coeff * power;
        power = power * point;
    }

    evaluation.constrain_eq(expected);
}
```

### Tracing

Let's further suppose that your program works correctly but that you are not
happy with the performance. The first thing you can do to troubleshoot your ZKP
performance is to enable tracing[^trace].

If you run this ZKP program on the polynomial with coefficients `1,...,100`
evaluated at the point `2`, you'll see a trace like the following:

```text
[TRACE sunscreen_runtime::runtime] Starting JIT (prover)...
[TRACE sunscreen_runtime::runtime] Prover JIT time 0.002542035s
[TRACE sunscreen_runtime::runtime] Starting backend prove...
[TRACE sunscreen_zkp_backend::bulletproofs] Bulletproofs encode time 0.002508913s
[TRACE sunscreen_zkp_backend::bulletproofs] Metrics {
        multipliers: 249,
        constraints: 399,
        phase_one_constraints: 399,
        phase_two_constraints: 0,
    }
[TRACE sunscreen_zkp_backend::bulletproofs] Bulletproofs prover time 0.254062677s
[TRACE sunscreen_runtime::runtime] Starting JIT (verifier)
[TRACE sunscreen_runtime::runtime] Verifier JIT time 0.001074441s
[TRACE sunscreen_runtime::runtime] Starting backend verify...
[TRACE sunscreen_zkp_backend::bulletproofs] Starting backend verify...
[TRACE sunscreen_zkp_backend::bulletproofs] Bulletproofs encode time 0.001557964s
[TRACE sunscreen_zkp_backend::bulletproofs] Bulletproofs verify time 0.022426849s
```

That's weird; we only have one `constrain_eq` call, but there are 399
constraints in the proof. What's up with that?

### Constant inputs

When we arithmetize your program, there's actually a lot of extra constraints
that get added to the low level R1CS representation.

Normally, the number of constraints \\(n\\) increase linearly with the number of
multiplication operations, as multiplication is essentially represented as a
[dot product][multiplication-gate] where the vectors contain the inputs to _all_
multiplication gates in the constraint system.

Constant inputs are instead placed directly into a [weights
matrix][linear-constraints], and these factors can be applied directly to
variables, rather than requiring additional multiplication gates that increase
the factor \\(n\\).

If we change the argument types from `#[public]` to `#[constant]` and rerun the
trace, we'll see a big improvement:

```text
[TRACE sunscreen_runtime::runtime] Starting JIT (prover)...
[TRACE sunscreen_runtime::runtime] Prover JIT time 0.002529488s
[TRACE sunscreen_runtime::runtime] Starting backend prove...
[TRACE sunscreen_zkp_backend::bulletproofs] Bulletproofs encode time 0.001372845s
[TRACE sunscreen_zkp_backend::bulletproofs] Metrics {
        multipliers: 50,
        constraints: 1,
        phase_one_constraints: 1,
        phase_two_constraints: 0,
    }
[TRACE sunscreen_zkp_backend::bulletproofs] Bulletproofs prover time 0.057199442s
[TRACE sunscreen_runtime::runtime] Starting JIT (verifier)
[TRACE sunscreen_runtime::runtime] Verifier JIT time 0.001072157s
[TRACE sunscreen_runtime::runtime] Starting backend verify...
[TRACE sunscreen_zkp_backend::bulletproofs] Starting backend verify...
[TRACE sunscreen_zkp_backend::bulletproofs] Bulletproofs encode time 0.001272397s
[TRACE sunscreen_zkp_backend::bulletproofs] Bulletproofs verify time 0.007118962s
```

Because the only multiplications happen with _constants_, the only constraint in
the R1CS circuit is the `constrain_eq` call. Also notice both the prover and
verifier times have gone down dramatically.

[multiplication-gate]: https://doc-internal.dalek.rs/bulletproofs/notes/r1cs_proof/index.html#multiplication-gates

[linear-constraints]: https://doc-internal.dalek.rs/bulletproofs/notes/r1cs_proof/index.html#linear-constraints

[^trace]: You can enable tracing by using the [`env_logger`](https://docs.rs/env_logger/latest/env_logger/) crate, calling `env_logger::init()` somewhere in your `main` function, and setting the environment variable `RUST_LOG=trace`.
