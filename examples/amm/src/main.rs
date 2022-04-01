use sunscreen::{
    fhe_program,
    types::{bfv::Rational, Cipher},
    Ciphertext, CompiledFheProgram, Compiler, Params, PrivateKey, 
    Error,
    PublicKey,
    Runtime,
};

#[fhe_program(scheme = "bfv")]
/// This program swaps NU tokens to receive ETH.
fn swap_nu(
    nu_tokens_to_trade: Cipher<Rational>,
) -> Cipher<Rational> {
    let total_eth = 100.0;
    let total_nu = 1_000.0;

    // RS: I would call trade_nu something else. I can see it as being confusing having "trade_nu" and "swap_nu"
    -(total_eth * total_nu / (total_nu + nu_tokens_to_trade) - total_eth)
}

/// Imagine this is a miner in a blockchain application. They're responsible
/// for processing transactions
struct Miner {
    // RS: I would probably clarify what swap_fhe is (i.e. the compiled swap_nu program)
    /// The compiled FHE swap program
    pub swap_fhe: CompiledFheProgram,

    /// The Miner's runtime
    runtime: Runtime,
}

impl Miner {
    pub fn setup() -> Result<Miner, Error> {
        let swap_fhe = Compiler::with_fhe_program(swap_nu).compile()?;

        let runtime = Runtime::new(&swap_fhe.metadata.params)?;

        Ok(Miner {
            swap_fhe,
            runtime,
        })
    }

    pub fn run_contract(
        &self,
        nu_tokens_to_trade: Ciphertext,
        public_key: &PublicKey,
    ) -> Result<Ciphertext, Error> {
        let results = self.runtime.run(&self.swap_fhe, vec![nu_tokens_to_trade], public_key)?;

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
    runtime: Runtime,
}

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

fn main() -> Result<(), Error> {
    // Set up the miner with some NU and ETH tokens.
    let miner = Miner::setup()?;

    // Alice sets herself up. The FHE scheme parameters are public to the
    // protocol, so Alice has them.
    let alice = Alice::setup(&miner.swap_fhe.metadata.params)?;

    let transaction = alice.create_transaction(20.0)?;

    let encrypted_received_eth =
        miner.run_contract(transaction, &alice.public_key)?;

    alice.check_received_eth(encrypted_received_eth)?;

    Ok(())
}
