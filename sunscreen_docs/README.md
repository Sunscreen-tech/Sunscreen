# What is fully homomorphic encryption (FHE)? 

*[RS: need to add disclaimer about FHE not supporting computation on encrypted inputs belonging to different keys]*

You can think of FHE as the next generation of public key encryption schemes. Standard public key encryption allows anyone to send you data in a secure way; your friend encrypts her message (with respect to your public key) and sends the encrypted message to you. However, you can't really do anything with this encrypted message, apart from decrypting it. That's where FHE comes in! 

Using FHE, anyone can perform computations directly on private (i.e. encrypted) data&mdash;no need to decrypt.

We highly recommend starting with [this article](https://blog.nucypher.com/an-engineers-guide-to-fully-homomorphic-encryption/) first if you're new to FHE.

## Why should I care about FHE?

FHE is particularly interesting for applications in blockchain and machine learning.

In blockchain, FHE could be used to create privacy-preserving smart contracts. We have two parties in this setting: users and miners. Users can share their private data to the chain in the form of transactions. Miners can then run computations (encoded as smart contracts) directly on users' private data. Another emerging use case in blockchain is private information retrieval and oblivious message retrieval. Here, the user would like to retrieve some information&mdash;we'll say messages addressed to her&mdash;without revealing to the miner/server which messages she's interested in.

In machine learning, FHE could be used for private inference. We have two parties in this setting: the client (who the data belongs to) and the server (who owns the trained machine learning model). The client can share her private data with the server. The server can then run the model on the client's encrypted data to give her a private prediction (only she knows!). 

Note that in both cases there are two separate parties: one party is the data owner (e.g. user/client) vs. another party runs the private computation (e.g. miner/server).

## What *can't* FHE do?
- You can't loop or branch on private data. Imagine this were possible: that would suggest your data isn't actually private! There are techniques to get around this problem such as making the condition public, setting an upper bound for loops, evaluating both cases for an if/else statement.
- FHE does *not* guarantee that the miner/server performed the computation correctly/faithfully. This isn't a problem in the blockchain setting since we rely on the assumption that there are an honest majority of miners/validators. For machine learning use-cases, we'd have to rely on the reputation of the ML company/model owner (i.e. we trust that company A actually did run the model on our encrypted data). However, this is true even outside of FHE; company A could just give us a bogus prediction.

# Our compiler
As magical as FHE is, it's very hard to write FHE programs unless you're a cryptography expert (even then it's pretty hard). That's where our compiler comes in.

Our goal is to make it easy for *any engineer* to write an FHE program. To accomplish this, we've spent a lot of time working to get the API just right (we're always excited to hear feedback from users!). A large part of this was choosing the right language for our compiler. We chose [Rust](https://www.rust-lang.org/) as we believe Rust will become the defacto language of choice for cryptography libraries in the future. In addition to having a powerful and expressive type system, Rust is very well suited to cryptography. It's highly performant (like C/C++) *and* safe by design (unlike C/C++). 

There are many different FHE schemes out there. Our compiler relies on Microsoft SEAL's [implementation](https://github.com/microsoft/SEAL) of the BFV scheme.

 *Note:* As our initial focus has been on the API, we haven't performed all possible optimizations for optimal performance yet.
 
 ## Our chosen FHE scheme: BFV

### Why did we choose the BFV scheme?

The BFV scheme provides the following nice features:
- Exact integer arithmetic (it may surprise you but a lot of FHE schemes can't support exact integer arithmetic)
- "Fast" integer arithmetic[^1]
- "Small" public key sizes[^1]
- Potential for "batching" (aka "SIMD"-like) operation for improved performance
- Compatibility with fairly efficient [zero-knowledge proof](https://www.wired.com/story/zero-knowledge-proofs/) systems

[^1]: in comparison to other FHE schemes (e.g. TFHE)

### What are some of the drawbacks to BFV?
No FHE scheme is perfect. Some drawbacks to working with BFV include:
- Certain operations are "difficult" (i.e. more expensive) to perform. This notably includes comparisons of two private values.
- You can't perform private computations *indefinitely* on data. What that means for you is that you'll need to choose an upper bound (ahead of time) for how many private computations you'd like to perform. There is an advanced technique called bootstrapping to get around this issue but we do not currently support it.


## Why is a compiler needed? (feel free to skip unless you'd like to geek out with us)

> Why is it so hard to write FHE programs?

*Note:* This is not a *precise description* of the math behind FHE. Our goal is to give you a high level idea as to why it's hard to work with FHE directly. 

FHE makes use of some pretty [fancy math](https://en.wikipedia.org/wiki/Ring_learning_with_errors). You're very likely familiar with [matrices](https://en.wikipedia.org/wiki/Matrix_(mathematics)) and vectors. Imagine that instead of having *numbers* as the entries in a matrix or vector, we replace them with *polynomials* (e.g. 8x<sup>5</sup> + 5x<sup>2</sup> + x + 13). Recall that polynomials consist of coefficients (these would be 8, 5, 1, 13 in our example) and a degree/order (this is 5 in our example). However, these polynomials behave a bit differently than what you've seen in grade school. 

Let's take a brief detour and discuss modular arithmetic (aka clock arithmetic). Modular arithmetic is just integer arithmetic that "wraps" around. Alternatively, you can think of it as division with remainder. For example, 13 mod 12 = 1. 

The polynomials in FHE make use of modular arithmetic. The degree is actually mod some value; we'll say degree mod N. The coefficients are also mod some value; we'll say coefficient mod P. 

So if I tell you to take the degree mod 3 and the coefficients mod 7, 8x<sup>5</sup> + 5x<sup>2</sup> + x + 13 would turn into 1x<sup>2</sup> + 5x<sup>2</sup> + x + 6. 

To get good performance in FHE, you need to know how to set these parameters (N, P) *just right*. If the parameters are too small, you'll be very limited in terms of the computations you can do. Alternatively, if you make the paramters too big, you'll end with poor performance and large ciphertext sizes. Even worse, you need to base your parameter choices off the maximum sequence of multiplications you plan on doing along with the desired security level. It's also not clear how to efficiently translate integer math to polynomial math.

I've neglected to mention how FHE programs actually work. Under the hood, FHE uses circuits. For the BFV scheme, we have [arithmetic circuits](https://en.wikipedia.org/wiki/Arithmetic_circuit_complexity#:~:text=In%20computational%20complexity%20theory%2C%20arithmetic,expressions%20it%20has%20already%20computed.) (some other FHE schemes use binary circuits). When was the last time you tried to work directly with circuits (if ever)? 

Our compiler handles picking all parameters and the appropriate keys for you. We abstract away the polynomials and circuits too. 


## What does our compiler offer?

This list isn't comprehensive. These are just the main features we'd like to call attention to.

- Type support for fractions, rationals, and signed integers (even 64-bit ints!)
- Ability to perform computations on combinations of plaintexts and ciphertexts (e.g. you can multiply a ciphertext and plaintext together)
- Private computation with literals
- Fully automated parameter and key selection
- Ciphertext maintenance operations inserted automatically (these operations need to be done for optimal performance)
- Compiler generates FHE programs for you (no need to work with circuits)
- Compiler automatically parallelizes program (i.e. circuit) execution for you
- Support for serialization
- Can compile natively to Apple's M1
- Can run computations on plaintext (useful for testing/debugging purposes)

## Limitations

We don't take advantage of all possible compiler transforms so performance isn't as good as it could be (yet!).

Additionally, we do not currently allow users to author their own types.

## Performance considerations
[To do for us:]
- Short discussion around multi-threading maybe?

# Performance

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
| Zama Numpy  | N/A[^2]  |

[^2]: Zama's compiler could not support the program (only computation on values <256 is supported). If coded and optimized manually using the underlying Concrete library, Sunscreen would still run at least a full order of magnitude faster.

Our compiler is built on SEAL's implementation of the BFV scheme. For reference, if coded directly in SEAL and optimized manually by an expert, the chi-squared test can run in 0.053 s.


# Future offerings
For v0.1, our focus was primarily on getting the API right. Improved performance coming soon!

Planned improvements for our compiler (v0.2+):
- Additional examples of how our compiler can be used in practice (let us know if there's anything you'd really like to see!)
- WASM support
- Automating plaintext modulus constraint selection (if desired)

We are considering offering the following (but no promises yet!):
- Support for other FHE schemes (e.g. CKKS, BGV)
- Bootstrapping (so you wouldn't have to know a priori an upper bound on the number of private operations)

In terms of what's next for Sunscreen, we plan to provide:
- A complementary zero-knowledge proof library (that's compatible with our FHE compiler)
- A grants program (for engineers to write FHE programs using our compiler and contribute to FHE tooling)
