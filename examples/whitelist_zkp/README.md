# whitelist

This example shows a possible project layout using cargo workspaces. The
`prover` and `verifier` are separate crates and refer to the common `zkp` crate
for the ZKP program definition.

When the prover and verifier live on different machines, they'll probably
communicate by sending the serialized proof over a network call. However, we can
demonstrate a similar scenario by having them communicate as separate processes,
piping a serialized proof from `prover` stdout to `verifier` stdin.

In this whitelist zkp, the verifier verifies that the prover has an entry on its
public whitelist, without revealing which entry. The whitelist is hardcoded to
the numbers 100 to 199 inclusive.

```shell
cargo run -p prover -- 101 | cargo run -p verifier
```
