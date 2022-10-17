# Who should use our compiler?
You're building an application that operates on user data *but* you want to ensure all user data remains private.

## You're a web3 engineer.
Our compiler was primarily designed with your web3 needs in mind!

You likely need all of the following features:
- Exact computation (since you're working with account balances and currency transfer)
- Compatibility with efficient ZKP schemes for trustless decentralized applications (we plan to provide the appropriate libraries for this)
- Program chaining (helpful for smart contract composability)
- Support for fractions/rationals/big integers
- Fast arithmetic
- Exceptional performance overall

You may notice that FHE ciphertexts can sometimes be quite large. In the future, we'll help you manage this issue. 

## You're a web2 engineer.
Performance is very important to you; more importantly, the code needs to be easy to understand and write since you don't have the time to learn the intricacies of FHE or (god forbid) an entirely new language. You may need to perform 32 or even 64 bit computation.

Our compiler is great for many web2 applications (e.g. data analysis on private data). Comparisons on encrypted data are not currently supported; please keep this in mind when deciding if our compiler is best suited to your application. We will likely expand support to other FHE schemes in the future. The CKKS scheme, for example, is often better suited to privacy-preserving machine learning applications than the BFV scheme.

## You're a researcher.
You want to quickly prototype FHE applications without fussing over the optimal parameter choice. However, performance is very important and you don't want to introduce a significant slowdown by working with an FHE compiler (over the FHE scheme directly).

We also provide advanced features that allow you to fine tune the [plaintext modulus](./../advanced/plain_modulus/plain_modulus.md) choice and [noise margin](./../advanced/noise_margin.md) if desired.
