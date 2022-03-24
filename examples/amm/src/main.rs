use sunscreen::{
    fhe_program,
    types::{bfv::Rational, Cipher},
    Ciphertext, CompiledFheProgram, Compiler, FheProgramInput, Params, PrivateKey, PublicKey,
    Runtime,
};

#[fhe_program(scheme = "bfv")]
/// This program swaps NU tokens to receive ETH.
fn swap_nu(
    nu_tokens_to_trade: Cipher<Rational>,
    total_eth: Rational,
    total_nu: Rational,
    total_tokens: Rational,
) -> Cipher<Rational> {
    // RS: I would call trade_nu something else. I can see it as being confusing having "trade_nu" and "swap_nu"
    // total_tokens should equal total_eth * total_nu. Sunscreen doesn't
    // currently support plaintext-plaintext multiply, so this needs to
    // be computed outside of FHE.
    -(total_tokens / (total_nu + nu_tokens_to_trade) - total_eth)
}

/// Imagine this is a miner in a blockchain application. They're responsible
/// for processing transactions
struct Miner {
    // RS: I would probably clarify what swap_fhe is (i.e. the compiled swap_nu program)
    /// The compiled FHE swap program
    pub swap_fhe: CompiledFheProgram,
    /// The total ETH in the liquidity pool
    pub total_eth: f64,
    /// The total NU in the liquidity pool
    pub total_nu: f64,

    /// The Miner's runtime
    runtime: Runtime,
}

impl Miner {
    pub fn setup(initial_eth: f64, initial_nu: f64) -> Miner {
        let swap_fhe = Compiler::with_fhe_program(swap_nu).compile().unwrap();

        let runtime = Runtime::new(&swap_fhe.metadata.params).unwrap();

        Miner {
            swap_fhe,
            total_eth: initial_eth,
            total_nu: initial_nu,
            runtime,
        }
    }

    pub fn run_contract(
        &self,
        nu_tokens_to_trade: Ciphertext,
        public_key: &PublicKey,
    ) -> Ciphertext {
        // RS: will need to clarify what's going on here...
        let args: Vec<FheProgramInput> = vec![
            nu_tokens_to_trade.into(),
            Rational::try_from(self.total_eth).unwrap().into(),
            Rational::try_from(self.total_nu).unwrap().into(),
            Rational::try_from(self.total_eth * self.total_nu)
                .unwrap()
                .into(),
        ];

        let results = self.runtime.run(&self.swap_fhe, args, public_key).unwrap();

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
    // Set up the miner with some NU and ETH tokens.
    let miner = Miner::setup(100.0, 1000.0);

    // Alice sets herself up. The FHE scheme parameters are public to the
    // protocol, so Alice has them.
    let alice = Alice::setup(&miner.swap_fhe.metadata.params);

    let encrypted_received_eth =
        miner.run_contract(alice.create_transaction(20.0), &alice.public_key);

    alice.check_received_eth(encrypted_received_eth);
}
