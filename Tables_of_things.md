# Dungeon Master's tables of FHE things

## BFV notes

When using a plain modulus large enough for batching, generating relin keys fails at `N=1024,2048`.

### Noise budget impact at minimum plain modulus to support batching of a single operation

| n     | Add  | Mul+relin |
|-------|------|-----------|
| 1024  | N/A  | N/A       |
| 2048  | N/A  | N/A       |
| 4096  | ~0   | ~26       |
| 8192  | ~0   | ~28       |
| 16384 | ~0   | ~29       |
| 32768 | ~0   | ~30       |

### Noise budget at minimum plain modulus to support batching

| n    | 1024 | 2048 | 4096 | 8192 | 16384 | 32768 |
|------|------|------|------|------|-------|-------|
| bits | N/A  | N/A  | 49   | 149  | 365   | 800   |

### Key sizes

Precise sizes may vary with RNG. Some keys fail to generate for some poly degrees (marked as N/A).

| Poly degree         | 1024     | 2048      | 4096       | 8192       | 16384        | 32768      |
|---------------------|----------|-----------|------------|------------|--------------|------------|
| secret key          | 4.17 kiB | 15.15 kiB | 68.60 kiB  | 264.46 kiB | 1,004.55 kiB | 3.77 MiB   |
| public key          | 8.41 kiB | 30.19 kiB | 130.92 kiB | 529.19 kiB | 1.96 MiB     | 7.53 MiB   |
| compact public key  | 4.27 kiB | 15.22 kiB | 68.69 kiB  | 264.50 kiB | 1,004.58 kiB | 3.77 MiB   |
| relin keys          | N/A      | N/A       | 270.42 kiB | 2.07 MiB   | 15.69 MiB    | 113.02 MiB |
| compact relin keys  | N/A      | N/A       | 131.21 kiB | 1.03 MiB   | 7.85 MiB     | 56.51 MiB  |
| Galois keys         | N/A      | N/A       | 5.79 MiB   | 49.65 MiB  | 408.23 MiB   | 3.09 GiB   |
| compact Galois keys | N/A      | N/A       | N/A        | N/A        | N/A          | N/A        |