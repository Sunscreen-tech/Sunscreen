use std::time::Instant;

use sunscreen::{
    fhe_program,
    types::{bfv::Rational, Cipher},
    Ciphertext, CompiledFheProgram, Compiler, Error, FheRuntime, Params, PrivateKey, PublicKey,
    Runtime, InnerCiphertext,
};

#[fhe_program(scheme = "bfv")]
/// This program swaps NU tokens to receive ETH.
fn swap_nu(nu_tokens_to_trade: Cipher<Rational>) -> Cipher<Rational> {
    let total_eth = 100.0;
    let total_nu = 1_000.0;

    -(total_eth * total_nu / (total_nu + nu_tokens_to_trade) - total_eth)
}

/// Imagine this is a miner in a blockchain application. They're responsible
/// for processing transactions
struct Miner {
    /// The compiled FHE swap program
    pub compiled_swap_nu: CompiledFheProgram,

    /// The Miner's runtime
    runtime: FheRuntime,
}

impl Miner {
    pub fn setup() -> Result<Miner, Error> {
        let now = Instant::now();

        let app = Compiler::new().fhe_program(swap_nu).additional_noise_budget(40).compile()?;

        println!("{:#?}", app.params());
        println!("compile time {}s", now.elapsed().as_secs_f64());

        let runtime = Runtime::new_fhe(app.params())?;

        Ok(Miner {
            compiled_swap_nu: app.get_fhe_program(swap_nu).unwrap().clone(),
            runtime,
        })
    }

    pub fn run_contract(
        &self,
        nu_tokens_to_trade: Ciphertext,
        public_key: &PublicKey,
    ) -> Result<Ciphertext, Error> {
        let now = Instant::now();

        let results =
            self.runtime
                .run(&self.compiled_swap_nu, vec![nu_tokens_to_trade], public_key)?;

        println!("Run circuit in {}s", now.elapsed().as_secs_f64());

        Ok(results[0].clone())
    }
}

/// Alice is a party that would like to trade some NU for ETH.
struct Alice {
    /// Alice's public key
    pub public_key: PublicKey,

    /// Alice's private key
    private_key: PrivateKey,

    /// Alice's runtime
    runtime: FheRuntime,
}

impl Alice {
    pub fn setup(params: &Params) -> Result<Alice, Error> {
        let runtime = Runtime::new_fhe(params)?;

        let now = Instant::now();

        let (public_key, private_key) = runtime.generate_keys()?;

        println!("Keygen {}s", now.elapsed().as_secs_f64());

        Ok(Alice {
            public_key,
            private_key,
            runtime,
        })
    }

    pub fn create_transaction(&self, amount: f64) -> Result<Ciphertext, Error> {
        let now = Instant::now();

        let res = Ok(self
            .runtime
            .encrypt(Rational::try_from(amount)?, &self.public_key)?);

        println!("Encrypt time {}s", now.elapsed().as_secs_f64());

        match &res.clone().unwrap().inner {
            InnerCiphertext::Seal(x) => {
                let x = bincode::serialize(&x[0]).unwrap();

                println!("CT = {}B", x.len());

            }
        };

        res
    }

    pub fn check_received_eth(&self, received_eth: Ciphertext) -> Result<(), Error> {
        let received_eth: Rational = self.runtime.decrypt(&received_eth, &self.private_key)?;

        let received_eth: f64 = received_eth.into();

        println!("Alice received {received_eth}ETH");

        Ok(())
    }
}

fn main() -> Result<(), Error> {
    // Set up the miner with some NU and ETH tokens.
    let miner = Miner::setup()?;

    // Alice sets herself up. The FHE scheme parameters are public to the
    // protocol, so Alice has them.
    let alice = Alice::setup(&miner.compiled_swap_nu.metadata.params)?;

    let transaction = alice.create_transaction(20.0)?;

    let encrypted_received_eth = miner.run_contract(transaction, &alice.public_key)?;

    alice.check_received_eth(encrypted_received_eth)?;

    Ok(())
}
