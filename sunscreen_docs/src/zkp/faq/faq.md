# FAQ

### Why did you create your own ZKP compiler?
We created our own ZKP compiler mainly to ensure compatibility with our FHE compiler&mdash;existing ZKP compilers were not designed with FHE's needs in mind.

### How does this fit in with Sunscreen's FHE compiler?
While our ZKP compiler can be used as a standalone product, it is uniquely
useful when used in [conjunction with our FHE compiler](/linked/intro/intro.md) to prove statements about
FHE-encrypted inputs!

### Why Bulletproofs as the proof backend? Aren't there more performant proof systems?
As mentioned earlier, our ZKP compiler was designed with the end goal of it being used in conjunction with our FHE compiler.

Before we can prove arbitrary statements about our FHE-encrypted inputs, we need to prove our FHE ciphertext is well-formed. The proof system we use for this is [Short Discrete Log Proofs for FHE and Ring-LWE Ciphertexts](https://eprint.iacr.org/2019/057) (SDLP); you can track our implementation progress [here](https://github.com/Sunscreen-tech/Sunscreen/tree/main/logproof/src). Both Bulletproofs and SDLP use Pedersen commitments constructed of Ristretto group elements, which allows us to prove secret inputs to both proofs are the same. For this reason, we decided to first start with support of Bulletproofs in our ZKP compiler as it meant we could release something sooner for developers to try out. Additionally, while Bulletproofs is far from being the most performant SNARK, SDLP prover and verifier times dwarf that of Bulletproofs so we have chosen to focus our initial efforts on optimizations for SDLP.

### What are your future plans?
Beyond integration with our FHE compiler, we're considering adding support for other proof backends and arithmetizations.
