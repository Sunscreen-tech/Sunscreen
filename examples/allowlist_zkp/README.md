# allowlist

This example shows a possible project layout of a [cargo package](pkg-docs) with a `lib`
crate containing the ZKP program definition, and two binary crates `prover` and
`verifier`. 

When the prover and verifier live on different machines, they'll probably
communicate by sending the serialized proof over a network call. However, we can
demonstrate a similar scenario by having them communicate as separate processes,
piping a serialized proof from `prover` stdout to `verifier` stdin.

In this allowlist zkp, the verifier verifies that the prover has an entry on its
public allowlist, without revealing which entry. The allowlist is hardcoded to
the numbers 100 to 199 inclusive.

```shell
cargo run --bin prover -- 101 | cargo run --bin verifier
```

[pkg-docs]: https://rustwiki.org/en/book/ch07-01-packages-and-crates.html
