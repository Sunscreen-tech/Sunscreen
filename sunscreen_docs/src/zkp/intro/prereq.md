# Prerequisites
To effectively use our library, we assume some basic knowledge of cryptography as well as Rust.

## Cryptography
- **Curve**: An *[elliptic curve](https://blog.cloudflare.com/a-relatively-easy-to-understand-primer-on-elliptic-curve-cryptography/)* is a type of mathematical object that forms the basis of most modern-day cryptographic systems. There are many different types of elliptic curves with various properties (e.g. pairing friendly curves, curves that offer very fast operations). The ZKP system we use as the proof backend in our compiler relies on elliptic curve-based cryptography, so we must specify the elliptic curve we want to work with.
- **Field**: When working with elliptic curves, we also need to specify a *[field](https://en.wikipedia.org/wiki/Field_(mathematics))* where the points on the curve come from. Fields are a type of mathematical structure that support addition, subtraction, multiplication, and division. The set of real numbers is a common example of a field. However, you can also have finite fields (via modular/clock arithmetic). Finite fields are what we'll be interested in when we're looking at ZKPs.
- **Circuits**: When we mention circuits in our ZKP compiler docs, we're referring to [arithmetic circuits](https://en.wikipedia.org/wiki/Arithmetic_circuit_complexity) that break everything down into addition and multiplication gates. Programs for ZKP systems are actually circuits; however, you can imagine that writing circuits directly can be tedious and unpleasant.
- **Constraints**: You can think of constraints as the lower level language of ZKPs, essentially a way to allow the developer to specify the program/computation they're interested in via some mathematical relations. We rely on Rank 1 Constraint Systems, a particular way of translating a program into a set of mathematical relations. In terms of our compiler, you'll be able to work with equality and comparisons (i.e. greater than/less than).
- **Witness**: A witness is the "secret" that the prover wants to conceal from the verifier. Say for example Alice wants to convince Bob the bartender she's over 21 without revealing to Bob what exactly her age is (she's 27). The witness in this case would be Alice's age (27). When working with our compiler, witnesses will be denoted with the [`#[private]` attribute](../zkp_programs/attributes.md).


## Rust
- Rust basics (e.g. [rust types](https://doc.rust-lang.org/book/ch03-02-data-types.html), [traits](https://doc.rust-lang.org/book/ch10-02-traits.html), [.unwrap()](https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html) and other error handling techniques)
- [Generic types](https://doc.rust-lang.org/book/ch10-01-syntax.html)
- [Generic functions](https://doc.rust-lang.org/book/ch10-00-generics.html)
