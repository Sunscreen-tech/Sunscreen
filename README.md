# Intro

Sunscreen is an ecosystem for building privacy-preserving applications using fully homomorphic encryption and zero-knowlege proofs.

# Set-up
## Instal Rust
Install [Rustup](https://rustup.rs/). This will install the Rust toolchain.

## Initialize submodules
```
git submodule init
git submodule update
```

## Linux
### Install prereqs
Using yum:
```sudo yum install gcc gcc-c++ cmake3 openssl-devel clang```

Using apt:
```sudo apt install build-essential clang cmake3 libssl-dev```

After installing prereqs, make a link to `cmake3` named `cmake`
```sudo ln /usr/bin/cmake3 <somwhere/under/$PATH/>cmake```

# Running tests
Cargo test --release
