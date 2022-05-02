# Cipher

The `Cipher` type is special in that you don't directly create `Cipher` values. `Cipher<T>` should only appear in an FHE program's call signature and denotes that an argument or return value is an encrypted `T`. The absence of this wrapper indicates that `T` is unencrypted. 

While arguments may be unencrypted (i.e. of type `T`), return values must always be encrypted (i.e. of type `Cipher<T>`).

For example:
```rust,no_run
#[fhe_program(scheme = "bfv")]
fn my_program(a: Cipher<Signed>, b: Signed) -> (Cipher<Signed>, Cipher<Signed>) {
    // Do things
}
```

* Argument `a` is an encrypted `Signed` value.
* Argument `b` is an *un*encrypted `Signed` value.
* `my_program` returns 2 encrypted `Signed` values via a tuple.
