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

| Poly degree         | 1024    | 2048     | 4096      | 8192      | 16384       | 32768     |
|---------------------|---------|----------|-----------|-----------|-------------|-----------|
| secret key          | 4.2 kiB | 15.1 kiB | 68.6 kiB  | 264.4 kiB | 1_004.5 kiB | 3.8 MiB   |
| public key          | 8.4 kiB | 30.2 kiB | 131.0 kiB | 529.1 kiB | 2.0 MiB     | 7.5 MiB   |
| compact public key  | 4.3 kiB | 15.2 kiB | 68.7 kiB  | 264.4 kiB | 1_004.5 kiB | 3.8 MiB   |
| relin keys          | N/A     | N/A      | 270.3 kiB | 2.1 MiB   | 15.7 MiB    | 113.0 MiB |
| compact relin keys  | N/A     | N/A      | 131.1 kiB | 1.0 MiB   | 7.8 MiB     | 56.5 MiB  |
| Galois keys         | N/A     | N/A      | 5.8 MiB   | 49.6 MiB  | 408.2 MiB   | 3.1 GiB   |
| compact Galois keys | N/A     | N/A      | N/A       | N/A       | N/A         | N/A       |