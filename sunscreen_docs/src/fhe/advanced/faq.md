# FAQ

### I've worked with FHE libraries before. What does your compiler actually *do*?
A challenge in working with the BFV scheme is having to set polynomial modulus degree, coefficient modulus, as well as the plaintext modulus for your specific application to ensure good performance. Additionally, bootstrapping is not supported so you need to be careful in choosing the correct parameters for your application so that you don't run out of noise budget before you finish your computation. Our compiler chooses the best polynomial modulus degree and coefficient modulus for your particular program, ensuring you’ll have enough noise budget to perform the entire computation. We do not yet choose the best plaintext modulus for your specific program (this will likely be implemented in the next release). Right now, we simply hard code a value for the plaintext modulus that works for almost any computation you'd likely do. Advanced users can go in and [change this value](./plain_modulus/plain_modulus.md) manually if they'd like though.

You’ll also notice there’s no encoding process to do before encryption (we’ve abstracted that away). You also don’t have to worry about inserting relinearizations in manually (done for ciphertext maintenance purposes).

### Can I perform computations on private data belonging to *different* parties?
Our compiler currently only supports a single-key FHE scheme, meaning that all data needs to be encrypted with respect to the same key if you want to perform computations on it. There *are* certainly [ways](https://eprint.iacr.org/2021/133) to get around the single key limitation to enable computation on private data belonging to different parties. However, it's highly application dependent and often requires the use of additional tools (e.g. zero-knowledge proofs).

There are also variants of FHE&mdash;multi-party FHE and multi-key FHE&mdash; that support computation on private data belonging to different parties out of the box.

### What are your future plans?
In terms of plans for our compiler specifically, we'd like to add support for:
- batching
- choosing scheme parameters based on multiple FHE programs as inputs (multi-program parameter sharing)
- using the outputs of one FHE program as the inputs to another FHE program (chaining)
- providing rigorous analysis of noise growth

In terms of broader plans for Sunscreen, some of our next milestones include:
- helping users manage large FHE ciphertexts
- providing a complementary zero-knowledge proof library for our FHE compiler 


