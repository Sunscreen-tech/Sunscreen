# BFV scheme

There are many different FHE schemes out there. Our compiler uses the [BFV scheme](http://homomorphicencryption.org/wp-content/uploads/2018/11/HomomorphicEncryptionStandardv1.1.pdf).

### Why did we choose the BFV scheme?

The BFV scheme provides the following nice features:
- Exact integer arithmetic (it may surprise you but some FHE schemes can't support exact integer arithmetic)
- "Fast" integer arithmetic[^1]
- "Small" public key sizes[^1]
- Potential for "batching" (aka "SIMD"-like) operation for improved performance
- Compatibility with fairly efficient [zero-knowledge proof](https://www.wired.com/story/zero-knowledge-proofs/) systems

[^1]: in comparison to other FHE schemes (e.g. TFHE)

### What are some of the drawbacks to the BFV scheme?

No FHE scheme is perfect. Some drawbacks to working with BFV include:
- Certain operations are difficult (i.e. more expensive) to perform. This notably includes comparisons of two private values.
- You can't perform private computations *indefinitely* on data. What that means for you is that you'll need to choose an upper bound (ahead of time) for how many private computations you'd like to perform. There is an advanced technique called bootstrapping to get around this issue but we do not currently support it.
