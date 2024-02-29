# Introduction

As we've alluded to, the power of our FHE and ZKP compilers is fully realized when we link them together.

## Trust and Validation

*RS: likely need to rework the "trust in trustless settings" piece to better capture the spirit of how fhe+zkp combine. may want to remove the part that alludes to verifiable fhe since we don't support that*

Our main motivation for linking these concepts together is to allow trust in trustless settings. We've already seen how FHE enables private computation; that is, how one party can encrypt their private data, and how another party can compute on those encrypted inputs and return an encrypted result, with only a public key, and no knowledge of the underlying private data.

However, without ZKPs, this model of private computation implicitly relies on _trust_ between those two parties. The computing party trusts that the inputs are valid encryptions and that the underlying values are valid for the given computation. The other party has to trust that the computation took place correctly.

We previously discussed the [inability to perform comparisons](/fhe/fhe_programs/writing_an_fhe_program/limitations.md#comparisons-not-supported) on encrypted data, which are necessary for many input validations, and [how ZKPs could fill this gap](/zkp/compiler/compiler.md#how-do-zkps-and-fhe-fit-together) &mdash; in this section, we'll show how to do this in practice.

## Prerequisites

The functionality described in this section is gated behind the `linkedproofs` feature flag, so make sure you've enabled it:

```toml
sunscreen = { version = "*", features = ["linkedproofs"] }
```

If you are reading this section, we assume you have also read through the FHE and ZKP sections above. If you have any questions, remember we're available on [Discord](https://discord.com/invite/sunscreen?ref=docs.sunscreen.tech) to chat all things FHE and ZKP!
