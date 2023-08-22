# Private information retrieval
With private information retrieval (PIR), a user can retrieve an item from a database without *revealing* to the server which item she's interested in. PIR is useful for both web2 and web3 applications. In web2, for example, PIR can be used to [help detect harmful images](https://www.usenix.org/system/files/sec21summer_kulshrestha.pdf) in end-to-end encrypted messaging. For private cryptocurrencies, PIR can help light clients [retrieve relevant transactions](https://eprint.iacr.org/2021/1256.pdf).

To make this section easy to understand, we'll implement two simple PIR algorithms with our compiler.

The [first algorithm](./pir_simple.md) does not require the full power of FHE since we only perform ciphertext-plaintext multiplication via a vector dot product; thus, an additively homomorphic encryption scheme would actually suffice.

The [second algorithm](./pir_matrix.md) *does* require the full power of FHE as we'll perform both ciphertext-ciphertext multiplication and ciphertext-plaintext multiplication via a matrix-vector product and vector dot product.

