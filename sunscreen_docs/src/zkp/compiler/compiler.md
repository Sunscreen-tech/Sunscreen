# Sunscreen's ZKP compiler

Our goal is to make it easier for engineers to write ZKP programs.

One aspect of this was deciding whether we should develop an entirely new language (with its own syntax and grammar) or create a DSL embedded within an existing programming language. We've chosen to go with a Rust-based DSL. In addition to having a powerful and expressive type system, Rust is very well suited to cryptography. It's highly performant *and* safe by design. Another important aspect was ensuring compatibility with our FHE compiler (i.e. ability to prove things about FHE-encrypted inputs and providing a consistent experience in terms of API with our FHE compiler).

In ZKP land, the engineer needs to translate their higher level program into a format that ZKPs can understand (arithmetic circuits/constraint systems). This process is called arithmetization and there are a few different ways to specify constraints. Our compiler currently uses R1CS (Rank 1 Constraint System) and helps automate this process for you.

We currently support [Bulletproofs](https://github.com/zkcrypto/bulletproofs) as the proof backend though we will add support for other proof backends in the future. Bulletproofs allow you to prove general relations (using arithmetic circuits) and does not require a trusted setup. The main reason for targeting Bulletproofs was speed to launch (as Bulletproofs will most easily link with FHE even though it's by no means the most efficient proof system).

## What features does our compiler offer?
This list isn't comprehensive (and may not mean much to you unless you've worked with ZKPs previously). These are just the main features we'd like to call attention to:
- Support for other proof backends!
- Basic field operations (specifically, access to +, -, * when creating `zkp_program`s)
- Support for equality and comparison constraints
- Public, private, and constant inputs (to easily specify the role of program arguments within ZKPs)
- Create gadgets (e.g. to perform additional operations such as division, re-use across programs)
- User definable types


## How do ZKPs and FHE fit together?

ZKPs are useful (and often necessary) when building general purpose FHE-enabled applications in a trustless environment. By trustless, we mean an environment in which we either (1) can't fully trust the user encrypting their data or (2) can't fully trust the party responsible for performing the computation on the encrypted data.

What are some examples of the former situation? Let's suppose you've used our [FHE compiler](https://github.com/Sunscreen-tech/Sunscreen) to implement private transactions. If a user wants to withdraw some encrypted amount `enc(amt)` from their encrypted balance `enc(bal)`, how can the implementation enforce that `amt <= bal` while allowing `amt` and `bal` to stay private? Enter ZKPs! Additionally, validating that the user-provided ciphertext is "well-formed" (and not just some random garbage) might be important. In this scenario, the user can send a ZKP along with their ciphertexts, proving the ciphertexts' validity without revealing the underlying values.

With regards to the latter situation, let's take a step back and think about how things work in web2. Maybe you've used AWS to run a benchmark or you've experimented with ChatGPT. How do we know that Amazon has actually run the computation you asked them to? How do we know that OpenAI has actually used their most advanced learning model? The answer is we don't. We're *trusting* these organizations to have done what we asked them to based on their reputation. If we ask AWS to run an FHE computation for us, we likely trust that they've run it correctly. However, in web3, random parties may be tasked with running FHE computations. If we're assuming a large number of parties are all running the same FHE computation, it may be sufficient to assume there is an honest majority of them (no ZKP required). On the other hand, if a single party is tasked with running an FHE computation (say a rollup provider), that party will need to *prove* that they've run the computation correctly.  

For more examples of using FHE and ZKPs together, take a look at our [private transactions example](/linked/examples/private_tx.md).
