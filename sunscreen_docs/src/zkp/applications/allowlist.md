# Private set inclusion

Let's look at how to prove that we have a number on a given list without revealing to anyone what our number is (aka private set inclusion).

Such a program might be interesting when thinking more generally about allowlists (e.g. proving you're on a given list without revealing your identity to others). While allowlists are beyond the scope of this document, there's plenty of applications of this idea in both web2 and web3.

In this example, we'll also see how proof serialization works.

## A brief diversion on file structure with serialization

In Sunscreen, you can serialize proofs. Usually, we'll define a ZKP program in
one place, and share that code between both the prover and verifier. This is
easily accomplished with a [Cargo
package](https://doc.rust-lang.org/book/ch07-01-packages-and-crates.html) with
multiple binaries, or [Cargo
workspace](https://doc.rust-lang.org/book/ch14-03-cargo-workspaces.html) if you
need more flexibility.
For example, the workspace might have a file structure like this: 

```text
.
├── Cargo.lock
├── Cargo.toml
├── prover
│   ├── Cargo.toml
│   └── src
│       └── main.rs
├── README.md
├── verifier
│   ├── Cargo.toml
│   └── src
│       └── main.rs
└── zkp
    ├── Cargo.toml
    └── src
        └── lib.rs
```

## How will our algorithm work?
We'll build off ideas from [My first ZKP program](../getting_started/example.md) (where we wanted to prove that our number was on a list with 2 public numbers) for this example.

Let's say we have the following list: [element<sub>0</sub>, element<sub>1</sub>, ... , element<sub>n</sub>]. If *s* is on the list, then that means there exists some element<sub>i</sub> such that *s* = element<sub>i</sub>. Then the equation (*s* - element<sub>0</sub>)(*s* - element<sub>1</sub>)...(*s* - element<sub>n</sub>) must equal 0 since one of these factors (*s* - element<sub>i</sub>) is 0. 

## Program Walkthrough

### Examining our ZKP program

The ZKP program is exported from `zkp/src/lib.rs`:

```rust
use std::array;
use sunscreen::{types::zkp::{Field, FieldSpec}, zkp_program, zkp_var};

/// A ZKP proving a private entry is equal to one of the values in a list
#[zkp_program]
pub fn allowlist<F: FieldSpec>(
    entry: Field<F>,
    #[public] list: [Field<F>; 100],
) {
    let zero = zkp_var!(0);
    let one = zkp_var!(1);
    let mut poly = one;
    for x in list {
        poly = poly * (x - entry);
    }
    poly.constrain_eq(zero);
}

/// A default list for the prover and verifier to use: [100, 199]
pub fn default_list<F: FieldSpec>() -> [Field<F>; 100] {
    array::from_fn(|i| Field::from(100 + i as u32))
}
```

Let's briefly walk though the ZKP program `allowlist` now. The prover will want to show that they have some `entry` on a given `list` without revealing what exactly their entry is. Accordingly, `entry` is private whereas the values on the `list` are public. We'll need to create two native field elements within `allowlist` (specifically 0 and 1) so we use `zkp_var` to get `zero` and `one`. Our program builds off ideas from [My first ZKP program](../getting_started/example.md) so we recommend reading that section first before proceeding. Recall that to require `poly` to be equal to `zero`, we'll need to use an equality constraint (`constrain_eq`).

In terms of the specific list we'll be looking at, this will be `default_list`, where we do the appropriate conversion to get native field elements.

### Prover

Let's look at how the prover would go about creating their proof and then serializing it.

The `prover` crate defines a binary that accepts a number on the command line
and prints the serialized proof to stdout:

```rust,no_run
# // Just squashed the zkp module above
# mod zkp { use std::array; use sunscreen::{types::zkp::{Field, FieldSpec}, zkp_program, zkp_var}; #[zkp_program] pub fn allowlist<F: FieldSpec>( entry: Field<F>, #[public] list: [Field<F>; 100],) { let zero = zkp_var!(0); let one = zkp_var!(1); let mut poly = one; for x in list { poly = poly * (x - entry); } poly.constrain_eq(zero); } pub fn default_list<F: FieldSpec>() -> [Field<F>; 100] { array::from_fn(|i| Field::from(100 + i as u32)) } }
use std::io;
use std::error::Error;

use sunscreen::{
    bulletproofs::BulletproofsBackend, types::zkp::BulletproofsField, 
    ZkpProgramFnExt,
};

use zkp::{default_list, allowlist};

fn main() -> Result<(), Box<dyn Error>> {
    let allowlist_zkp = allowlist.compile::<BulletproofsBackend>()?;
    let runtime = allowlist.runtime::<BulletproofsBackend>()?;

    // prover's witness is the value 101
    let entry: BulletproofsField = get_first_arg()?.unwrap_or(101).into();
    let list: [BulletproofsField; 100] = default_list();

    let proof = runtime.proof_builder(&allowlist_zkp)
        .private_input(entry)
        .public_input(list)
        .prove()?;

    bincode::serialize_into(io::stdout(), &proof)?;
    Ok(())
}

fn get_first_arg() -> Result<Option<u32>, Box<dyn Error>> {
    let arg = std::env::args().nth(1).map(|s| s.parse()).transpose()?;
    Ok(arg)
}
```

The Prover begins by importing the stuff they're going to use. 

Next, the Prover compiles the ZKP program, specifying that they'll be using
Bulletproofs as the backend proof system.

To prove things, they construct a runtime, again specifying Bulletproofs as the
backend proof system. Now, they're ready to create the proof!

As usual, elements need to be in the correct format (field
elements&mdash;specifically we're working over whatever field `Bulletproofs`
uses). 

Then, the Prover calls `runtime.proof_builder()`, passing in the compiled ZKP program, their private inputs (just `entry` here) and
any public inputs (just `list` here) to create a proof (using `prove`). Finally, the proof is serialized and printed to `stdout`.

### Verifier

Lastly, the verifier crate defines a binary that reads a proof from stdin and
exits with code `0` on success and `1` on error:

```rust,no_run
# // Just squashed the zkp module above
# mod zkp { use std::array; use sunscreen::{types::zkp::{Field, FieldSpec}, zkp_program, zkp_var}; #[zkp_program] pub fn allowlist<F: FieldSpec>( entry: Field<F>, #[public] list: [Field<F>; 100],) { let zero = zkp_var!(0); let one = zkp_var!(1); let mut poly = one; for x in list { poly = poly * (x - entry); } poly.constrain_eq(zero); } pub fn default_list<F: FieldSpec>() -> [Field<F>; 100] { array::from_fn(|i| Field::from(100 + i as u32)) } }
use std::io;
use std::error::Error;

use sunscreen::{
    bulletproofs::BulletproofsBackend, types::zkp::BulletproofsField,
    Proof, ZkpProgramFnExt, 
};

use zkp::{default_list, allowlist};

fn main() -> Result<(), Box<dyn Error>> {
    let allowlist_zkp = allowlist.compile::<BulletproofsBackend>()?;
    let runtime = allowlist.runtime::<BulletproofsBackend>()?;

    let proof: Proof = bincode::deserialize_from(io::stdin())?;

    let list: [BulletproofsField; 100] = default_list();
    runtime.verification_builder(&allowlist_zkp)
        .proof(&proof)
        .public_input(list)
        .verify()?;

    println!("Verified proof successfully!");
    Ok(())
}
```

Recall that the Verifier will have to compile the `allowlist` program and construct a `runtime` with the same backend proof system before verifying the proof.

The Verifier retrieves the serialized proof and deserializes it. They can then call `runtime.verification_builder()`, passing in the compiled ZKP program (`allowlist_zkp`), the proof received from the Prover (`proof`), and the public input (`list`) to verify the proof (using `verify`).

### Execution

With these pieces in place, we can see serialization and deserialization in
action! From the root directory:

```shell
$ cargo run -p prover 150 | cargo run -p verifier

Verified proof successfully!
```

The [full example](https://github.com/Sunscreen-tech/Sunscreen/tree/main/examples/allowlist_zkp)
is on GitHub for reference.
