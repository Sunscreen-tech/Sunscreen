use sunscreen::{
    fhe_program,
    types::{bfv::Rational, Cipher},
    Ciphertext,
    Compiler,
    CompiledFheProgram,
    FheProgramInput,
    PublicKey,
    Runtime,
};

#[fhe_program(scheme = "bfv")]
/**
 * This program swaps NU tokens to receive ETH.
 */
fn swap_nu(trade_nu: Cipher<Rational>, total_eth: Rational, total_nu: Rational, total_tokens: Rational) -> Cipher<Rational> {
    // RS: I would call trade_nu something else. I can see it as being confusing having "trade_nu" and "swap_nu"
    // total_tokens should equal total_eth * total_nu. Sunscreen doesn't
    // currently support plaintext-plaintext multiply, so this needs to
    // be computed outside of FHE.
    -(total_tokens / (total_nu + trade_nu) - total_eth)
}

struct Miner {
    // RS: I would probably clarify what swap_fhe is (i.e. the compiled swap_nu program)
    pub swap_fhe: CompiledFheProgram,
    pub total_eth: f64,
    pub total_nu: f64,
}

impl Miner {
    pub fn setup(initial_eth: f64, initial_nu: f64) -> Miner {
        let swap_fhe = Compiler::with_fhe_program(swap_nu)
            .compile()
            .unwrap();

        Miner {
            swap_fhe,
            total_eth: initial_eth,
            total_nu: initial_nu,
        }
    }

    pub fn run_contract(&self, trade_nu: Ciphertext, public_key: &PublicKey) -> Ciphertext {
        let runtime = Runtime::new(&self.swap_fhe.metadata.params).unwrap();
        
        // RS: will need to clarify what's going on here...
        let args: Vec<FheProgramInput> = vec![
            trade_nu.into(),
            Rational::try_from(self.total_eth).unwrap().into(),
            Rational::try_from(self.total_nu).unwrap().into(),
            Rational::try_from(self.total_eth * self.total_nu).unwrap().into()
        ];

        let results = runtime.run(&self.swap_fhe, args, public_key).unwrap();

        results[0].clone()
    }
}

fn main() {
    let miner = Miner::setup(100.0, 1000.0);

    let runtime = Runtime::new(&miner.swap_fhe.metadata.params).unwrap();
    
    // RS: whose public/private key is this? the reader does not know. no division of parties here.
    let (public_key, private_key) = runtime.generate_keys().unwrap();

    // RS: would call trade_nu something else...
    let trade_nu = runtime.encrypt(Rational::try_from(20.0).unwrap(), &public_key).unwrap();

    // RS: would prefer if this had a different name so it's clear to the reader the amount is encrypted
    let received_eth = miner.run_contract(trade_nu, &public_key);

    // RS: unclear who is doing this? need the division of parties or just to omit it.
    let received_eth: Rational = runtime.decrypt(&received_eth, &private_key).unwrap();

    let received_eth: f64 = received_eth.into();

    println!("Alice received {}ETH", received_eth);
}
