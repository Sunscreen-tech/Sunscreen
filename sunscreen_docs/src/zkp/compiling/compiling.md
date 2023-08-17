# Compiling

After you've defined a ZKP program, you'll need to compile it. The simplest way,
as we saw in the [first example](/getting_started/example.md), is to just call
`.compile()` on the program:

```rust
use sunscreen::{
    bulletproofs::BulletproofsBackend,
    types::zkp::{Field, FieldSpec},
    zkp_program, Error, ZkpProgramFnExt
};

#[zkp_program]
fn tautology<F: FieldSpec>(x: Field<F>) {
    x.constrain_eq(x);
}

fn main() -> Result<(), Error> {
    let tautology_compiled = tautology.compile::<BulletproofsBackend>()?;
    Ok(())
}
```

Remember that you'll need to specify the proof system being used in the backend (e.g. `BulletproofsBackend`).

However, if you have multiple ZKP programs to compile, you may find it easier to
invoke a full [`Compiler`][compiler-docs] and get back an
[`Application`][application-docs] holding multiple programs.

```rust
use sunscreen::{
    bulletproofs::BulletproofsBackend,
    types::zkp::{Field, FieldSpec},
    zkp_program, zkp_var, Error, Compiler
};

#[zkp_program]
fn tautology<F: FieldSpec>(x: Field<F>) {
    x.constrain_eq(x);
}

#[zkp_program]
fn contradiction<F: FieldSpec>(x: Field<F>) {
    x.constrain_eq(x + zkp_var!(1));
}

fn main() -> Result<(), Error> {
    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(tautology)
        .zkp_program(contradiction)
        .compile()?;

    let tautology_compiled = app.get_zkp_program(tautology);
    let contradiction_compiled = app.get_zkp_program(contradiction);
    Ok(())
}
```

To actually run your compiled ZKP programs, you'll need a runtime! This is
covered in the next chapter.

[compiler-docs]: https://docs.rs/sunscreen/latest/sunscreen/type.Compiler.html
[application-docs]: https://docs.rs/sunscreen/latest/sunscreen/struct.Application.html
