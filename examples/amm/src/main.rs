use sunscreen::{
    fhe_program,
    types::{bfv::Rational, Cipher},
    Ciphertext, CompiledFheProgram, Compiler, Params, PrivateKey, PublicKey,
    Runtime,
};
use std::time::Instant;

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
    pub fn setup() -> Miner {
        let swap_fhe = Compiler::with_fhe_program(swap_nu).compile().unwrap();

        let runtime = Runtime::new(&swap_fhe.metadata.params).unwrap();

        Miner {
            swap_fhe,
            runtime,
        }
    }

    pub fn run_contract(
        &self,
        nu_tokens_to_trade: Ciphertext,
        public_key: &PublicKey,
    ) -> Ciphertext {
        let results = self.runtime.run(&self.swap_fhe, vec![nu_tokens_to_trade], public_key).unwrap();

        results[0].clone()
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
    pub fn setup(params: &Params) -> Alice {
        let runtime = Runtime::new(params).unwrap();

        let (public_key, private_key) = runtime.generate_keys().unwrap();

        Alice {
            public_key,
            private_key,
            runtime,
        }
    }

    pub fn create_transaction(&self, amount: f64) -> Ciphertext {
        self.runtime
            .encrypt(Rational::try_from(amount).unwrap(), &self.public_key)
            .unwrap()
    }

    pub fn check_received_eth(&self, received_eth: Ciphertext) {
        let received_eth: Rational = self
            .runtime
            .decrypt(&received_eth, &self.private_key)
            .unwrap();

        let received_eth: f64 = received_eth.into();

        println!("Alice received {}ETH", received_eth);
    }
}

fn main() {
    let comp_time = Instant::now();
    // Set up the miner with some NU and ETH tokens.
    let miner = Miner::setup();
    println!("{}", comp_time.elapsed().as_secs_f64());

    let run_time = Instant::now();
    // Alice sets herself up. The FHE scheme parameters are public to the
    // protocol, so Alice has them.
    let alice = Alice::setup(&miner.swap_fhe.metadata.params);

    let encrypted_received_eth =
        miner.run_contract(alice.create_transaction(20.0), &alice.public_key);

    println!("{}", run_time.elapsed().as_secs_f64());
    alice.check_received_eth(encrypted_received_eth);
}
