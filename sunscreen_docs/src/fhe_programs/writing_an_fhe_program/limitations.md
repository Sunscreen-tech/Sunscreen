# Limitations
FHE programs have some limitations you'll need to keep in mind.

## Comparisons not supported
Performing comparisons on encrypted data is complex. Thus, we do not currently support comparisons. 

The following is *not* allowed:

```rust,no_run,compile_fail
# use sunscreen::types::{bfv::Signed, Cipher};

#[fhe_program(scheme = "bfv")]
fn invalid(a: Cipher<Signed>) -> Cipher<Signed> {
    // Return value mismatch aside, comparisons
    // are not supported
    a == 42
}
```

## Branching restricted to constant expressions
Branches (i.e. `for`, `if/else`, `match`) cannot depend on function arguments, encrypted[^1] or otherwise.

For example, you *cannot* do the following:

```rust,no_run,compile_fail
# use sunscreen::types::{bfv::Signed, Cipher};

#[fhe_program(scheme = "bfv")]
fn invalid(a: Cipher<Signed>, b: Signed) -> Cipher<Signed> {
    let mut c = a;

    // For loop runs during compilation, but b isn't known until
    // you call `run`.
    for i in 0..b {
        c = c + a;
    }

    c
}
```

You *can*, however, use loops and if statements so long as their conditions don't depend on FHE program arguments. The examples below show **allowed loop and if statements**:

```rust,no_run
# use sunscreen::{
#    types::{bfv::{Fractional, Signed}, Cipher},
#    fhe_program
# };

#[fhe_program(scheme = "bfv")]
fn loopy(x: Cipher<Fractional<64>>) -> Cipher<Fractional<64>> {
    let mut y = x;

    for _ in 0..5 {
        y = y + x;
    }

    y
}

#[fhe_program(scheme = "bfv")]
fn iffy(x: Cipher<Signed>) -> Cipher<Signed> {
    let mut ans = x;

    for i in 1..5 {
        if i % 2 == 0 {
            ans = ans + i * x;
        } else {
            ans = ans - i * x;
        }
    }

    ans
}
```

Notice that their conditions don't depend on their argument `x`, so they're legal.

[^1]: This is not merely a Sunscreen limitation; if an FHE scheme supported traditional branching, it would be fundamentally insecure.

## Bounded computation
You currently cannot perform computations *indefinitely* on ciphertexts. See [here](./advanced/noise_margin.md) for a more in-depth discussion of this.

## Avoid "transparent" ciphertexts
Some trivial operations destroy the randomness essential to the security of the resultant ciphertext &mdash; an outside observer can trivially decode them! Sunscreen will detect this and cause `run()` to fail to prevent data from leaking. Fortunately, such operations are not particularly useful in the first place. 

Avoid doing the following:
* Subtracting a ciphertext from itself. However, it's fine to subtract 2 *different* ciphertexts that happen to contain the same value (i.e. the ciphertexts encrypt the same data but using *different randomness*).
* Multiplying a ciphertext by the plaintext or literal value 0. However, if a *ciphertext* encrypts 0, that's totally fine.
