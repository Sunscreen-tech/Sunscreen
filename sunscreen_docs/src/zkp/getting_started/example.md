# My first ZKP program

Now that we have installed the Sunscreen crate as a dependency, let's get
started writing our first ZKP! Writing our program will be a gradual process and
we'll add more code as we progress through this section.

In this example, we'll prove that one private number is equal to one of two
public numbers (i.e. we want to show our number is on a given list without revealing *which* number it is). Specifically, the Prover's private number will be 64 and the public list will contain the numbers 64 and 1000.

## A brief overview of the process
Before diving into the code, let's briefly outline how we'll use Sunscreen's ZKP compiler.

1. Create a ZKP program (via the [`#[zkp_program]` attribute](../zkp_programs/zkp_programs.md)).
    - Specify what inputs will be public vs. private (using [`#[public]` and `#[private]` attributes](../zkp_programs/attributes.md) respectively).
    - Specify the relation that the prover is trying to show/the verifier will need to check. As part of this process, you'll have access to two types of [constraints](../zkp_programs/constraints.md): equality (`.constrain_eq`) and comparisons (`.constrain_gt_bounded`, `.constrain_ge_bounded`, `.constrain_lt_bounded`, `.constrain_le_bounded` for `>`, `>=`, `<`, `<=` respectively).
2. Compile the ZKP program (via [`.compile`](../compiling/compiling.md)). You'll specify the proof backend (e.g. Bulletproofs) as part of this.
3. We can create a [runtime](../runtime/runtime.md) now! Using the runtime, a prover and verifier can interact with and use the compiled ZKP program.
4. Prover and verifier will need to agree on the public inputs. How this is done in practice is application-dependent (e.g. data comes from a previous block in the chain, system parameters).
5. Prover [creates a proof](../runtime/prove.md) using the compiled ZKP program, passing in public inputs, along with their private inputs (i.e. witness).
6. Verifier [can check](../runtime/verify.md) a given proof.


## Defining a ZKP program

```rust
use sunscreen::{
    bulletproofs::BulletproofsBackend,
    types::zkp::{BulletproofsField, Field, FieldSpec},
    zkp_program, zkp_var, Error, ZkpProgramFnExt
};

#[zkp_program]
fn either<F: FieldSpec>(
    #[private] x: Field<F>, // witness in ZKP terminology
    #[public] y: Field<F>,
    #[public] z: Field<F>,
) {
    let zero = zkp_var!(0);
    let poly = (y - x) * (z - x);
    poly.constrain_eq(zero); 
}
```
There are many different proof systems out there with various tradeoffs in terms of efficiency. How might we write our program generically so that we can compile it to various backend proof systems? We'll do this with the generic type parameter `F:FieldSpec` (which should be present on all ZKP programs).

There's a few things to explain from the above code but, first, notice that the function `either` looks just like any other Rust function, except for a few extra attributes:
- `#[zkp_program]`: This top level attribute is where the magic happens &mdash;
  this declares your function as a ZKP program that can be compiled.
- Argument attributes: Each argument is either private or public:
    - `#[private]`: This indicates that the argument is _private_ or _hidden_
      from the verifier (you can think of this as the _witness_ if you are familiar with that
    terminology). As we'll see below, it is only specified by
      the prover when generating a proof. Note that this is the default behavior for
      program arguments so omitting an attribute is the same as specifying
      `#[private]`.
    - `#[public]`: Some public information may be needed as part of proof generation and verification. This attribute indicates that the argument is _public_        to both the prover and verifier. As we'll see below, both parties must specify these inputs when proving and verifying.

To show that a private number is equal to one of two other numbers, we can translate it into the following simple mathematical relation \\(0 = (y - x) \cdot (z - x)\\) where \\(x\\) is our private number (i.e. witness) and \\(y, z\\) are the given public numbers. However, since we're in ZKP land, we're working with a special mathematical object called [fields](../intro/prereq.md) so \\(x, y, z,\\) and \\(0\\) are actually **field** elements. Specifically, they are integers modulo some prime number.

To specify that the program variables `x`, `y`, and `z` are field elements we use the type `Field<F>`. If we want to create field elements within a ZKP program function (here we want the number `0` as a field element), we need to use the `zkp_var` macro.

Finally, how do we specify that `poly` (i.e. `(y - x) * (z - x)`) is required to be equal to `zero` in our ZKP program for the provided arguments? We need to use an equality constraint (`constrain_eq`). You can think of constraints as a kind of mathematically verifiable assertion.

All of these things are explained in much greater detail in the [What's in a ZKP
program](../zkp_programs/zkp_programs.md) section.

## Compiling a ZKP program

Having specified our program, let's compile it.

```rust
# use sunscreen::{
#     bulletproofs::BulletproofsBackend,
#     types::zkp::{BulletproofsField, Field, FieldSpec},
#     zkp_program, zkp_var, Error, ZkpProgramFnExt
# };
# #[zkp_program]
# fn either<F: FieldSpec>(
#     #[private] x: Field<F>,
#     #[public] y: Field<F>,
#     #[public] z: Field<F>,
# ) {
#     let zero = zkp_var!(0);
#     let poly = (y - x) * (z - x);
#     poly.constrain_eq(zero);
# }
fn main() -> Result<(), Error> {
    let either_zkp = either.compile::<BulletproofsBackend>()?;
    Ok(())
}
```

This is pretty straightforward; we invoke the `.compile()` method that exists on
our ZKP program and specify the bulletproofs backend proof system (more about this later).

What's the `?` after at the end of `.compile()`? For the uninitiated, the
[`?`](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html)
operator propagates errors. Fallible expressions in Rust emit
[`Results`](https://doc.rust-lang.org/std/result/enum.Result.html), which can
contain either a value or an error. Using `?` unwraps the value in a successful
result or immediately returns the error from a failed one, letting the caller of
the current function deal with it.

If you need to compile more than one program, you can also invoke a new
[`Compiler`][compiler-rust-doc] and specify multiple ZKP programs. We'll see how
to do this later on.

## Constructing a runtime

We'll need a [`ZkpRuntime`][runtime-rust-doc] to interact with compiled ZKP programs.

```rust
# use sunscreen::{
#     bulletproofs::BulletproofsBackend,
#     types::zkp::{BulletproofsField, Field, FieldSpec},
#     zkp_program, zkp_var, Error, ZkpProgramFnExt
# };
# #[zkp_program]
# fn either<F: FieldSpec>(
#     #[private] x: Field<F>,
#     #[public] y: Field<F>,
#     #[public] z: Field<F>,
# ) {
#     let zero = zkp_var!(0);
#     let poly = (y - x) * (z - x);
#     poly.constrain_eq(zero);
# }
fn main() -> Result<(), Error> {
    let either_zkp = either.compile::<BulletproofsBackend>()?;
    let runtime = either.runtime::<BulletproofsBackend>()?;

    let x = BulletproofsField::from(64);
    let y = BulletproofsField::from(64); 
    let z = BulletproofsField::from(1000); 

    Ok(())
}
```

To construct a `ZkpRuntime`, we need to specify which proof system we're
interested in using. Currently, the only supported backend is the [Bulletproofs
proof system](https://github.com/zkcrypto/bulletproofs) so we use
`BulletproofsBackend`.

As mentioned earlier, in ZKP land, we're working with field elements (specifically whatever field we've chosen to use in the corresponding ZKP system). For this example, we're using `BulletproofsBackend` so we'll want to specify that `x`, `y`, and `z` need to be field elements from whatever field is being utilized there. We do this via `BulletproofsField::from`.

`BulletproofsField` is the scalar field of the group used in our curve (Curve25519). Specifically, this will be integers mod 2^252 + 27742317777372353535851937790883648493. 

## Proving and verifying

Finally, let's see the runtime in action.

```rust
# use sunscreen::{
#     bulletproofs::BulletproofsBackend,
#     types::zkp::{BulletproofsField, Field, FieldSpec},
#     zkp_program, zkp_var, Error, ZkpProgramFnExt
# };
# #[zkp_program]
# fn either<F: FieldSpec>(
#     #[private] x: Field<F>,
#     #[public] y: Field<F>,
#     #[public] z: Field<F>,
# ) {
#     let zero = zkp_var!(0);
#     let poly = (y - x) * (z - x);
#     poly.constrain_eq(zero);
# }
fn main() -> Result<(), Error> {
    let either_zkp = either.compile::<BulletproofsBackend>()?;
    let runtime = either.runtime::<BulletproofsBackend>()?;

    let x = BulletproofsField::from(64);
    let y = BulletproofsField::from(64);
    let z = BulletproofsField::from(1000);

    // Generate a proof that x is equal to either y or z
    let proof = runtime
        .proof_builder(&either_zkp) // compiled ZKP program
        .private_input(x)           // private inputs
        .public_input(y)            // public inputs
        .public_input(z)
        .prove()?;

    // Verify the proof
    runtime
        .verification_builder(&either_zkp) // compiled ZKP program
        .proof(&proof)                     // proof created by prover
        .public_input(y)                   // public inputs
        .public_input(z)
        .verify()?;

    Ok(())
}
```

As you can see, for both proving and verifying, the first thing we do is specify
the compiled ZKP program. The `proof_builder` method returns a builder which
takes the public and private inputs to produce a `proof` that will then be
passed to the verifier. Accordingly, the `verification_builder` method returns a
builder which takes in the proof and public inputs.

Notice that both proof generation and verification are fallible operations. If
you try to construct an invalid proof, the runtime will return an error. This
prevents you the prover from trying to send an invalid proof to a verifier, only
to be rejected later. Lastly, verification will return an error if the proof is
invalid. Also notice that because we are propagating errors with `?`, as long as
this program exits with code `0`, then proof generation and verification have
succeeded!

In practice, the prover and verifier are separate entities so
`ZkpRuntime::prove` and `ZkpRuntime::verify` will happen on different machines
but both must have access to the ZKP program `either_zkp`. They can import it
from a common Rust library. Finally, the `proof` is [serializable](../runtime/serialization.md) and can be sent
from the prover to the verifier. A realistic example of this multi-machine
setting can be found in [Applications](../applications/sudoku.md).

[compiler-rust-doc]: https://docs.rs/sunscreen/latest/sunscreen/type.Compiler.html
[runtime-rust-doc]: https://docs.rs/sunscreen/latest/sunscreen/type.ZkpRuntime.html

