# Intro

Sunscreen is an ecosystem for building privacy-preserving applications using fully homomorphic encryption.

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
    let app = Compiler::new()
        .fhe_program(simple_multiply)
        .compile()?;

    let runtime = Runtime::new(app.params())?;

    let (public_key, private_key) = runtime.generate_keys()?;

    let a = runtime.encrypt(Signed::from(15), &public_key)?;
    let b = runtime.encrypt(Signed::from(5), &public_key)?;

    let results = runtime.run(app.get_program(simple_multiply).unwrap(), vec![a, b], &public_key)?;

    let c: Signed = runtime.decrypt(&results[0], &private_key)?;

    assert_eq!(c, 75.into());

    Ok(())
}
```

# Docs
* [User guide](https://docs.sunscreen.tech)
* [API docs](https://docs.rs/sunscreen)

# Getting help
For questions about Sunscreen, join our [Discord](https://discord.gg/WHCs6jNNDS)!