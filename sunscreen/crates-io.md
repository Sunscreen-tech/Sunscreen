# Intro

Sunscreen is an ecosystem for building privacy-preserving applications using fully homomorphic encryption. While in private beta, documentation can be found [here](https://sunscreen-docs-preview-test-1.s3.us-west-2.amazonaws.com/intro/intro.html).

This project is licensed under the terms of the GNU AGPLv3 license. If you require a different license for your application, please reach out to us.

*WARNING!* This library is meant for experiments only. It has not been audited and is *not* intended for use in production. 

# Example
```rust
use sunscreen::{
    fhe_program,
    types::{bfv::Signed, Cipher},
    Compiler, Error, Runtime,
};

#[fhe_program(scheme = "bfv")]
fn simple_multiply(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
    a * b
}

fn main() -> Result<(), Error> {
    let fhe_program = Compiler::with_fhe_program(simple_multiply).compile()?;

    let runtime = Runtime::new(&fhe_program.metadata.params)?;

    let (public_key, private_key) = runtime.generate_keys()?;

    let a = runtime.encrypt(Signed::from(15), &public_key)?;
    let b = runtime.encrypt(Signed::from(5), &public_key)?;

    let results = runtime.run(&fhe_program, vec![a, b], &public_key)?;

    let c: Signed = runtime.decrypt(&results[0], &private_key)?;

    assert_eq!(c, 75.into());

    Ok(())
}
```

# Docs
*TODO*

# Getting help
*TODO*