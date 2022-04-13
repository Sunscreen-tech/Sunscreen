use sunscreen::{
    fhe_program,
    types::{bfv::Signed, Cipher},
    Ciphertext, CompiledFheProgram, Compiler, Error, FheProgramInput, Params, PrivateKey,
    PublicKey, Runtime,
};

#[fhe_program(scheme = "bfv")]
/// This program swaps NU tokens to receive ETH.
fn lookup(query: [Cipher<Signed>; 10], database: [Signed; 10]) -> Cipher<Signed> {
    let mut sum = query[0] * database[0];

    for i in 1..10 {
        sum = sum + query[i] * database[i]
    }

    sum
}

/// Imagine this is a miner in a blockchain application. They're responsible
/// for processing transactions
struct Bob {
    /// The compiled FHE swap program
    pub compiled_query: CompiledFheProgram,

    /// The Miner's runtime
    runtime: Runtime,
}

impl Bob {
    pub fn setup() -> Result<Bob, Error> {
        let compiled_query = Compiler::with_fhe_program(lookup).compile()?;

        let runtime = Runtime::new(&compiled_query.metadata.params)?;

        Ok(Bob {
            compiled_query,
            runtime,
        })
    }

    pub fn run_query(
        &self,
        query: Ciphertext,
        public_key: &PublicKey,
    ) -> Result<Ciphertext, Error> {
        // Our database will consist of values between 400 and 410.
        let database: [Signed; 10] = (400..410)
            .map(|x| Signed::from(x))
            .collect::<Vec<Signed>>()
            .try_into()
            .unwrap();

        let args: Vec<FheProgramInput> = vec![query.into(), database.into()];

        let results = self.runtime.run(&self.compiled_query, args, public_key)?;

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

    /// To look up the item at `entry` location, construct an
    /// array containing 0s except for a single 1 at `entry`'s
    /// location.
    pub fn create_query(&self, entry: usize) -> Result<Ciphertext, Error> {
        let mut query = <[Signed; 10]>::default();
        query[entry] = Signed::from(1);

        Ok(self.runtime.encrypt(query, &self.public_key)?)
    }

    pub fn check_response(&self, value: Ciphertext) -> Result<(), Error> {
        let value: Signed = self.runtime.decrypt(&value, &self.private_key)?;

        let value: i64 = value.into();

        println!("Alice received {}", value);

        Ok(())
    }
}

fn main() -> Result<(), Error> {
    // Set up the miner with some NU and ETH tokens.
    let bob = Bob::setup()?;

    // Alice sets herself up. The FHE scheme parameters are public to the
    // protocol, so Alice has them.
    let alice = Alice::setup(&bob.compiled_query.metadata.params)?;

    // Alice w
    let query = alice.create_query(6)?;

    let response = bob.run_query(query, &alice.public_key)?;

    alice.check_response(response)?;

    Ok(())
}
