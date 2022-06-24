# Sunscreen's compiler

Our goal is to make it easy for *any engineer* to write an FHE program. To accomplish this, we've been working to get the API just right (we're always excited to hear feedback from users!). A large part of this was choosing the right language for our compiler&mdash; we chose [Rust](https://www.rust-lang.org/). In addition to having a powerful and expressive type system, Rust is very well suited to cryptography. It's highly performant (like C/C++) *and* safe by design (unlike C/C++). 

Our compiler relies on Microsoft's [SEAL](https://github.com/microsoft/SEAL) library. There are many different types of FHE schemes out there; we've chosen to use the BFV fully homomorphic encryption scheme&mdash;named for the authors (Brakerski-Fan-Vercauteren) who came up with the scheme.
 
 ## What features does our compiler offer?

This list isn't comprehensive. These are just the main features we'd like to call attention to:
- Type support for fractions, rationals, and signed integers (even 64-bit integers!)
- Ability to perform computations on combinations of plaintexts and ciphertexts (e.g. you can multiply a ciphertext and plaintext together)
- Can run computations without FHE (useful for testing purposes)
- Private computation with literals
- Automated parameter and key selection
- Ciphertext maintenance operations inserted automatically (these operations need to be done for optimal performance)
- Compiler generates FHE programs for you (no need to work with circuits)
- Compiler automatically parallelizes program (i.e. circuit) execution for you
- Support for WASM
- Support for serialization
- Can compile natively to Apple's M1 

*Note:* Although we have performed a number of optimizations, we don't take advantage of all possible compiler transforms (yet!). Additionally, we do not currently allow users to author their own types.
 
## Who should use our compiler?
You're building an application that operates on user data *but* you want to ensure all user data remains private.

### You're a web3 engineer.
Our compiler was primarily designed with your web3 needs in mind!

You likely need all of the following features:
- Exact computation (since you're working with account balances and currency transfer)
- Compatibility with efficient ZKP schemes for trustless decentralized applications (we plan to provide the appropriate libraries for this)
- Support for fractions/rationals/big integers
- Fast arithmetic
- Exceptional performance overall

You may notice that FHE ciphertexts can sometimes be quite large. In the future, we'll help you manage this issue. 

### You're a web2 engineer.
Performance is very important to you; more importantly, the code needs to be easy to understand and write since you don't have the time to learn the intricacies of FHE or (god forbid) an entirely new language. You may need to perform 32 or even 64 bit computation.

Our compiler is great for many web2 applications (e.g. data analysis on private data). Comparisons on encrypted data are not currently supported; please keep this in mind when deciding if our compiler is best suited to your application. We will likely expand support to other FHE schemes in the future. The CKKS scheme, for example, is often better suited to privacy-preserving machine learning applications than the BFV scheme.

### You're a researcher.
You want to quickly prototype FHE applications without fussing over the optimal parameter choice. However, performance is very important and you don't want to introduce a significant slowdown by working with an FHE compiler (over the FHE scheme directly).

We also provide advanced features that allow you to fine tune the [plaintext modulus](./../advanced/plain_modulus/plain_modulus.md) choice and [noise margin](./../advanced/noise_margin.md) if desired.

## Compiler performance

We've benchmarked Sunscreen's compiler against existing FHE compilers (that support exact computation). We run a chi-squared test according to the criteria set out in [this](https://arxiv.org/pdf/2101.07078.pdf) SoK paper on FHE compilers.

Time includes key generation + encryption + (homomorphic) computation + decryption.

Experiments were performed on an Intel Xeon @ 3.00 GHz with 8 cores and 16 GB RAM.

| Compiler  | Time (seconds) |
| ------------- | ------------- |
| Sunscreen | 0.072 |
| Microsoft EVA  | 0.328  |
| Cingulata-BFV  | 492.109  |
| Cingulata-TFHE  | 62.118  |
| E<sup>3</sup>-BFV  | 11.319  |
| E<sup>3</sup>-TFHE  | 1934.663 |
| Concrete Numpy  | N/A[^1]  |

[^1]: This compiler could not support the program. Concrete Numpy only allows for 256 unique values (e.g. can only represent integer values in the range [0, 255]).

Our compiler is built on SEAL's implementation of the BFV scheme. For reference, if coded directly in SEAL and optimized manually by an expert, the chi-squared test can run in 0.053 s.
