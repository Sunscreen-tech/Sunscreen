# What features does our compiler offer?

This list isn't comprehensive. These are just the main features we'd like to call attention to:
- Type support for fractions, rationals, and signed integers (even 64-bit integers!)
- Ability to perform computations on combinations of plaintexts and ciphertexts (e.g. you can multiply a ciphertext and plaintext together)
- Can run computations without FHE (useful for testing purposes)
- Private computation with literals
- Automated parameter and key selection (including parameter selection based on a user-defined set of programs)
- Ciphertext maintenance operations inserted automatically (these operations need to be done for optimal performance)
- Compiler generates FHE programs for you (no need to work with circuits)
- Compiler automatically parallelizes program (i.e. circuit) execution for you
- Support for serialization
- Can compile natively to Apple's M1 

## Limitations

We don't take advantage of all possible compiler transforms so performance isn't as good as it could be (yet!).

Additionally, we do not currently allow users to author their own types.
