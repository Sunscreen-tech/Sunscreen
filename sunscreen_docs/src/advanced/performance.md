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
| Zama Concrete Numpy  | N/A[^1]  |

[^1]: Zama's compiler could not support the program (only computation on values <256 is supported).

Our compiler is built on SEAL's implementation of the BFV scheme. For reference, if coded directly in SEAL and optimized manually by an expert, the chi-squared test can run in 0.053 s.
