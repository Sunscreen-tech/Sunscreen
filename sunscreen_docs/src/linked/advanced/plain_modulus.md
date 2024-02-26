# Plaintext modulus

First, make sure you've read through the [previous chapter describing the
plaintext modulus](/fhe/advanced/plain_modulus/plain_modulus.md). We mentioned
that our decreasing our default plaintext modulus can increase performance in
FHE programs, and the same is true of linked ZKP programs. In fact, the size of
the linked proof will also decrease with a lower plaintext modulus. If you are
an advanced user looking to tune the proof size and prover/verifier times, you
ought to consider whether or not your application can support a lower plaintext
modulus.
