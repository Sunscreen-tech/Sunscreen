# Private token swap (via automated market makers)

We'll now walk through a less trivial computation that can be done with FHE. Our program is inspired by computations used in [automated market makers](https://docs.uniswap.org/protocol/V2/concepts/protocol-overview/how-uniswap-works) (AMMs).
While some of the code and ideas presented here could be useful for constructing an automated market maker with swap privacy, many details have been omitted.

Alice would like to swap some NU tokens for some ETH tokens. She'd like to perform this token swap without revealing to anyone her order amount. This might be done to prevent malicious actors from [front-running](https://arxiv.org/pdf/1902.05164.pdf) her order.

To swap her tokens, she interacts with a "pool" that has reserves of both NU and ETH (implemented as a smart contract). For this example, we'll say the pool contains 100 ETH tokens and 1000 NU tokens. The reserve values here are public information. The exchange rate for NU ⇔ ETH [changes](https://docs.uniswap.org/protocol/V2/concepts/core-concepts/swaps) based on the pool's reserves of the two tokens. 

Alice will encrypt her order (i.e. the amount of NU tokens she wants to swap) and then submit it to the blockchain miner. The miner can then calculate how much *encrypted* ETH Alice should receive in exchange for her encrypted amount of NU tokens via FHE.

## An intro to AMMs for the uninitiated

If you're not familiar with AMMs, we suggest starting [here](https://www.coindesk.com/learn/2021/08/20/what-is-an-automated-market-maker/).

AMMs can be a great alternative to centralized exchanges since they allow you to exchange one type of a token for another with (generally) lower fees. Each token pair (in our example, we have NU and ETH) has its own "pool" which users interact with when performing a trade between those two particular tokens. You can also earn passive income from your tokens by providing liquidity (i.e. depositing two tokens) to a specific pool.

The exchange rate between the two tokens evolves automatically based on a known mathematical formula.

Unfortunately, the open and public nature of AMMs combined with the predictable behavior of the exchange rate allows for front-running attacks. Bad actors observe pending trades and then submit their own trades to "manipulate" the exchange rate in a way favorable to themselves. What does this mean for you as a potential AMM user? You may end up with a worse price than expected when your trade executes as these front-running attacks are fairly common and widespread. 

Privacy (specifically hiding trade values) is one solution to this front-running problem. 

## Program walkthrough

Let's look at how to implement this now.

### Setup

```rust
use sunscreen::{
    fhe_program,
    types::{bfv::Rational, Cipher},
    Ciphertext, CompiledFheProgram, Compiler, Params, PrivateKey, PublicKey,
    Runtime,
};

#[fhe_program(scheme = "bfv")]
/// This program swaps NU tokens for ETH.
fn swap_nu(
    nu_tokens_to_trade: Cipher<Rational>,
) -> Cipher<Rational> {
    let total_eth = 100.0;
    let total_nu = 1_000.0;

    -(total_eth * total_nu / (total_nu + nu_tokens_to_trade) - total_eth)
}
```
We begin by importing the stuff we're going to use.

We declare our `swap_nu` function as an FHE program with the appropriate attribute (`#[fhe_program(scheme = "bfv")]`).

`swap_nu` computes how much encrypted ETH a user will receive in exchange for `nu_tokens_to_trade` some amount of encrypted NU . Since we'll need to divide by a ciphertext, we'll have to use the `Rational` type here. Thus, notice that `swap_nu` takes in a `Cipher<Rational>` and returns a `Cipher<Rational>`. If you're wondering where the formula for `swap_nu` came from, it's from the constant product formula used by some automated market makers.
    
Notice that the other values in `swap_nu` (i.e. the pool reserves for ETH `total_eth` and NU `total_nu`) are in the clear.  

### Alice
```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Rational, Cipher},
#     Ciphertext, CompiledFheProgram, Compiler, Params, PrivateKey, 
#     Error,
#     PublicKey,
#     Runtime,
# };
# 
/// Alice is a party that would like to trade some NU for ETH.
struct Alice {
    /// Alice's public key
    pub public_key: PublicKey,

    /// Alice's private key
    private_key: PrivateKey,

    /// Alice's runtime
    runtime: Runtime,
}
```
Alice wants to swap some encrypted (i.e. hidden) amount of NU for an encrypted (i.e. hidden) amount of ETH. She'll need a public/private key pair to do this (since she needs to encrypt her order with respect to her public key).

```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Rational, Cipher},
#     Ciphertext, CompiledFheProgram, Compiler, Params, PrivateKey, 
#     Error,
#     PublicKey,
#     Runtime,
# };
# 
# /// Alice is a party that would like to trade some NU for ETH.
# struct Alice {
#     /// Alice's public key
#     pub public_key: PublicKey,
# 
#     /// Alice's private key
#     private_key: PrivateKey,
# 
#     /// Alice's runtime
#     runtime: Runtime,
# }
# 
impl Alice {
    pub fn setup(params: &Params) -> Result<Alice, Error> {
        let runtime = Runtime::new(params)?;

        let (public_key, private_key) = runtime.generate_keys()?;

        Ok(Alice {
            public_key,
            private_key,
            runtime,
        })
    }

    pub fn create_transaction(&self, amount: f64) -> Result<Ciphertext, Error> {
        Ok(self.runtime
            .encrypt(Rational::try_from(amount)?, &self.public_key)?
        )
    }

    pub fn check_received_eth(&self, received_eth: Ciphertext) -> Result<(), Error> {
        let received_eth: Rational = self
            .runtime
            .decrypt(&received_eth, &self.private_key)?;

        let received_eth: f64 = received_eth.into();

        println!("Alice received {}ETH", received_eth);

        Ok(())
    }
}
```
Alice first constructs a runtime and then can generate her public/private key pair.

To encrypt her order amount, she'll call `create_transaction` passing in the `amount` of NU she wants to trade and her`public_key`. We need `try_from` here to help us perform the appropriate type conversion.

We won't use this until the very end but `check_received_eth` will allow Alice to see how many ETH tokens she's received after performing the swap. Recall that Alice will receive an encrypted amount of ETH tokens, so in `check_received_eth` Alice will decrypt this value by passing in her `private_key` and `received_eth` the encrypted amount of ETH she received.



### Miner
Let's look at the miner next.

```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Rational, Cipher},
#     Ciphertext, CompiledFheProgram, Compiler, Params, PrivateKey, 
#     Error,
#     PublicKey,
#     Runtime,
# };
/// Imagine this is a miner in a blockchain application. They're responsible
/// for processing transactions
struct Miner {
    /// The compiled swap_nu program
    pub compiled_swap_nu: CompiledFheProgram,

    /// The Miner's runtime
    runtime: Runtime,
}
```
 Recall that the miner is responsible for processing Alice's order; thus, he'll have to run the compiled `swap_nu` program (`compiled_swap_nu`).

```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Rational, Cipher},
#     Ciphertext, CompiledFheProgram, Compiler, Params, PrivateKey, 
#     Error,
#     PublicKey,
#     Runtime,
# };
# 
# #[fhe_program(scheme = "bfv")]
# /// This program swaps NU tokens for ETH.
# fn swap_nu(
#     nu_tokens_to_trade: Cipher<Rational>,
# ) -> Cipher<Rational> {
#     let total_eth = 100.0;
#     let total_nu = 1_000.0;
# 
#     -(total_eth * total_nu / (total_nu + nu_tokens_to_trade) - total_eth)
# }
#
# /// Imagine this is a miner in a blockchain application. They're responsible
# /// for processing transactions
# struct Miner {
#     /// The compiled FHE swap program
#     pub compiled_swap_nu: CompiledFheProgram,
# 
#     /// The Miner's runtime
#     runtime: Runtime,
# }
#
impl Miner {
    pub fn setup() -> Result<Miner, Error> {
        let compiled_swap_nu = Compiler::with_fhe_program(swap_nu).compile()?;

        let runtime = Runtime::new(&compiled_swap_nu.metadata.params)?;

        Ok(Miner {
            compiled_swap_nu,
            runtime,
        })
    }

    pub fn run_contract(
        &self,
        nu_tokens_to_trade: Ciphertext,
        public_key: &PublicKey,
    ) -> Result<Ciphertext, Error> {
        let results = self.runtime.run(&self.compiled_swap_nu, vec![nu_tokens_to_trade], public_key)?;

        Ok(results[0].clone())
    }
}
```

In `setup`, we compile `swap_nu` and save the runnable program as `compiled_swap_nu`.
We also construct and save a `Runtime` for our miner to allow him to run it.

The miner can run the token swap contract (see `run_contract`) by calling `runtime.run` with the `compiled_swap_nu` program, Alice's encrypted order amount (`nu_tokens_to_trade`), and Alice's `public_key`. Recall that we must pass in arguments to an FHE program (such as `compiled_swap_nu`) via a `Vec`.

### Swapping the tokens privately

```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Rational, Cipher},
#     Ciphertext, CompiledFheProgram, Compiler, Params, PrivateKey, 
#     Error,
#     PublicKey,
#     Runtime,
# };
# 
#  #[fhe_program(scheme = "bfv")]
# /// This program swaps NU tokens to receive ETH.
# fn swap_nu(
#     nu_tokens_to_trade: Cipher<Rational>,
# ) -> Cipher<Rational> {
#     let total_eth = 100.0;
#     let total_nu = 1_000.0;
# 
#     -(total_eth * total_nu / (total_nu + nu_tokens_to_trade) - total_eth)
# }
# 
# /// Imagine this is a miner in a blockchain application. They're responsible
# /// for processing transactions
# struct Miner {
#     /// The compiled swap_nu program
#     pub compiled_swap_nu: CompiledFheProgram,
# 
#     /// The Miner's runtime
#     runtime: Runtime,
# }
# 
# impl Miner {
#     pub fn setup() -> Result<Miner, Error> {
#         let compiled_swap_nu = Compiler::with_fhe_program(swap_nu).compile()?;
# 
#         let runtime = Runtime::new(&compiled_swap_nu.metadata.params)?;
# 
#         Ok(Miner {
#             compiled_swap_nu,
#             runtime,
#         })
#     }
# 
#     pub fn run_contract(
#         &self,
#         nu_tokens_to_trade: Ciphertext,
#         public_key: &PublicKey,
#     ) -> Result<Ciphertext, Error> {
#         let results = self.runtime.run(&self.compiled_swap_nu, vec![nu_tokens_to_trade], public_key)?;
# 
#         Ok(results[0].clone())
#     }
# }
# 
# /// Alice is a party that would like to trade some NU for ETH.
# struct Alice {
#     /// Alice's public key
#     pub public_key: PublicKey,
# 
#     /// Alice's private key
#     private_key: PrivateKey,
# 
#     /// Alice's runtime
#     runtime: Runtime,
# }
# 
# impl Alice {
#     pub fn setup(params: &Params) -> Result<Alice, Error> {
#         let runtime = Runtime::new(params)?;
# 
#         let (public_key, private_key) = runtime.generate_keys()?;
# 
#         Ok(Alice {
#             public_key,
#             private_key,
#             runtime,
#         })
#     }
# 
#     pub fn create_transaction(&self, amount: f64) -> Result<Ciphertext, Error> {
#         Ok(self.runtime
#             .encrypt(Rational::try_from(amount)?, &self.public_key)?
#         )
#     }
# 
#     pub fn check_received_eth(&self, received_eth: Ciphertext) -> Result<(), Error> {
#         let received_eth: Rational = self
#             .runtime
#             .decrypt(&received_eth, &self.private_key)?;
# 
#         let received_eth: f64 = received_eth.into();
# 
#         println!("Alice received {}ETH", received_eth);
# 
#         Ok(())
#     }
# }
# 
fn main() -> Result<(), Error> {
    // Set up the miner with some NU and ETH tokens.
    let miner = Miner::setup()?;

    // Alice sets herself up. The FHE scheme parameters are public to the
    // protocol, so Alice has them.
    let alice = Alice::setup(&miner.compiled_swap_nu.metadata.params)?;

    let transaction = alice.create_transaction(20.0)?;

    let encrypted_received_eth =
        miner.run_contract(transaction, &alice.public_key)?;

    alice.check_received_eth(encrypted_received_eth)?;

    Ok(())
}
```

We set up the miner and then Alice (notice that Alice relies on parameters generated from the Miner's setup). Both of them must use the same set of FHE scheme parameters for compatibility. In deployment, these values would likely be fixed at the protocol level.

Alice calls `create_transaction` to encrypt her trade amount of `20.0` NU tokens.

The miner calls `run_contract` to calculate how much encrypted ETH Alice will receive for her encrypted NU (based on the formula from `swap_nu`). The miner passes in Alice's encrypted trade amount (the result of `alice.create_transaction(20.0)` which is a ciphertext) along with Alice's public key (`alice.public_key`).

Finally, Alice can determine how much ETH she actually received from the swap via `check_received_eth`.

### Performance
The entire program (not including compilation time) takes ~25 ms on an Intel Xeon @ 3.0 GHz (with 8 cores and 16 GB RAM) and ~100 ms on a Macbook Air M1.

## What's missing?
For simplicity, we've omitted many details that are needed to actually execute a private token swap in real life. You may have noticed we mentioned nothing about Alice's account balance (deducting the amount of NU she wants to swap or adding the amount of ETH she receives), ensuring that Alice is behaving honestly (e.g. she actually has enough NU in her account to make the swap, she isn't creating tokens out of thin air), or how to determine the new reserve values of the pool (i.e. how much NU and ETH are in the pool after Alice has made her swap).

If you're curious about the answers:
- we've omitted account balances for simplicity (but such account balances would be encrypted as well)
- to ensure Alice is behaving honestly, we would need additional cryptographic tools such as zero-knowledge proofs
- the primary goal of private token swaps would be to prevent [front-running](https://ethereum.org/en/developers/docs/mev/#mev-examples-sandwich-trading), thus there would be some additional step to "reveal" the new reserve values 






