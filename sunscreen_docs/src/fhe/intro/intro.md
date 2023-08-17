# Introduction to FHE and our compiler

Fully homomorphic encryption (FHE) is the next generation of public key encryption schemes. Standard public key encryption allows anyone to share data in a secure way. However, you can't really *do* anything with this encrypted data, apart from decrypting it. That's where FHE comes in! 

Using FHE, anyone can perform computations directly on private (i.e. encrypted) data&mdash;no need to decrypt.

We recommend starting with [this article](https://blog.nucypher.com/an-engineers-guide-to-fully-homomorphic-encryption/) if you're new to FHE.


### Why should I care about FHE?

FHE has applications to a variety of fields. We'll briefly consider two applications of FHE in the blockchain and machine learning space.

In blockchain, FHE enables [privacy-preserving smart contracts](https://eprint.iacr.org/2021/727). We have two parties in this setting: users and miners. Users can share their private data to the chain in the form of transactions. Miners can then run computations (encoded as smart contracts) directly on users' private data.

In machine learning, FHE allows for private inference. We have two parties in this setting: the user (who owns the data) and the server (who owns the trained machine learning model). The user can share her private data with the server. The server can then run the model on the user's encrypted data to give her a private prediction (which only she knows!). 

### Why haven't I already used FHE?

FHE used to be incredibly slow. Performance has come a long way in the past few years; operations that used to take seconds (or even minutes) now take milliseconds (if not microseconds). 

As magical as FHE is, it's actually [very hard](./why.md) to write FHE programs unless you're a cryptography expert (even then it's pretty hard).
Researchers built various FHE compilers in an attempt to improve usability. Unfortunately, these compilers failed for one of the following reasons: they introduced a [huge performance overhead](../compiler/performance.md), expected the user to know quite a bit about how FHE works, or were poorly designed for the target applications.

For FHE to see widespread adoption, we need usability *and* great performance.

