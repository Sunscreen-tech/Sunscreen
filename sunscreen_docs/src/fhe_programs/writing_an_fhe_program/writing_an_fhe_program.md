# Writing an FHE program

An FHE program is simply a Rust function with an annotation and a few restrictions. However, unlike standard Rust functions, FHE programs work with encrypted data!

## The `#[fhe_program(...)]` attribute
To indicate that a function is an FHE program, simply add the `#[fhe_program()]` attribute to an `fn` function:

```rust,no_run
# use sunscreen::{
#    fhe_program,
# };

#[fhe_program(scheme = "bfv")]
fn my_fhe_program() {
}
```

This attribute takes a single `scheme` argument. Currently, this argument value should always be `"bfv"`, our supported FHE scheme.

## FHE program interface requirements

FHE programs implement their logic in the `fn` function beneath the `#[fhe_program()]` attribute. The function you write must satisfy some conditions:

* Your `fn` function must be non-generic and stand-alone (i.e. not a `struct` method, closure, `trait` method, etc).
* Your `fn` function may take any number of arguments.
* Each argument must be of either type `T` (i.e. plaintext) or `Cipher<T>` (i.e. ciphertext), where `T` is a type [supported](/fhe_programs/types/types.md) in FHE programs. Every argument need not be the same `T`.
* Your `fn` function must return either a `Cipher<T>` or a tuple of `(Cipher<T1>, Cipher<T2>, ...)` values (i.e. return values are always encrypted). As with arguments, types must be supported in FHE programs.

Here's an example of an FHE program that returns a tuple containing two encrypted values: `a * b` and `a + c`.

```rust,no_run
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
# };
#
#[fhe_program(scheme = "bfv")]
fn multiple_returns(a: Cipher<Signed>, b: Cipher<Signed>, c: Signed) -> (Cipher<Signed>, Cipher<Signed>) {
    (a * b, a + c)
}
```

## Operations
In FHE programs, you can:
* Perform basic operations (`+`, `-`, `*`, `/`, `<<`, `>>`). The supported set of operations vary from type to [type](/fhe_programs/types/types.md). Note that at least one of the operands must be a ciphertext.
* Call functions.
* Use any Rust construct (e.g. `match`, `for i in ...`, `if...else`) on data *not* derived from any argument. We walk through a number of examples in the [limitations](/fhe_programs/writing_an_fhe_program/limitations.md#branching-restricted-to-constant-expressions) chapter.
