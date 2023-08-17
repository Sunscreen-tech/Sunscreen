# Preliminary knowledge
To effectively use our library, we assume some basic knowledge of public key cryptography as well as Rust.

## Cryptography and math
- **Plaintext vs. ciphertext**: Plaintext refers to *un*encrypted data (i.e. data in the clear) whereas ciphertext refers to *encrypted* data.
- **Public key vs. private key**: In public key cryptography, there are two types of keys. The *public* key (aka the encryption key) can be shared with others. Using the public key, people can send encrypted messages. The *private* key (aka the decryption key) should *not* be shared.  Whoever holds the private key can decrypt the messages addressed to them (which are encrypted under the corresponding public key). Usually, each person has their own public/private key pair. 
- **"Homomorphic"**: We use this term to denote computations performed directly on encrypted data. For example, if we say "homomorphic addition," we are referring to addition of two *ciphertexts*. 
- **Modulus**: We use this term in the context of discussing modular arithmetic (aka clock arithmetic). Under modular arithmetic, values "wrap around" when they exceed the *modulus*. In the example `7 mod 4 = 3`, `4` is the modulus. 

## Rust and programming
- Rust basics (e.g. [rust types](https://doc.rust-lang.org/book/ch03-02-data-types.html), [traits](https://doc.rust-lang.org/book/ch10-02-traits.html), [`.unwrap()`](https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html) and other error handling techniques)
- [Generic types](https://doc.rust-lang.org/book/ch10-01-syntax.html)
- [Generic functions](https://doc.rust-lang.org/book/ch10-00-generics.html)
