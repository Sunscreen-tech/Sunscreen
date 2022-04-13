use sunscreen::{
    fhe_program,
    types::{bfv::Signed, Cipher},
    Ciphertext, CompiledFheProgram, Compiler, Error, FheProgramInput, Params, PrivateKey,
    PublicKey, Runtime,
};

const DATABASE_SIZE: usize = 100;

#[fhe_program(scheme = "bfv")]
/// This program takes a user's query and looks up the entry in the database.
/// Queries are arrays containing a single 1 element at the
/// desired item's index and 0s elsewhere.
fn lookup(query: [Cipher<Signed>; DATABASE_SIZE], database: [Signed; DATABASE_SIZE]) -> Cipher<Signed> {
    let mut sum = query[0] * database[0];

    for i in 1..DATABASE_SIZE {
        sum = sum + query[i] * database[i]
    }

    sum
}

/// This is the server that processes Alice's query.
struct Server {
    /// The compiled database query program
    pub compiled_query: CompiledFheProgram,

    /// The server's runtime
    runtime: Runtime,
}

impl Server {
    pub fn setup() -> Result<Server, Error> {
        let compiled_query = Compiler::with_fhe_program(lookup).compile()?;

        let runtime = Runtime::new(&compiled_query.metadata.params)?;

        Ok(Server {
            compiled_query,
            runtime,
        })
    }

    pub fn run_query(
        &self,
        query: Ciphertext,
        public_key: &PublicKey,
    ) -> Result<Ciphertext, Error> {
        // Our database will consist of values between 400 and 500.
        let database: [Signed; DATABASE_SIZE] = (400..(400 + DATABASE_SIZE))
            .map(|x| Signed::from(x as i64))
            .collect::<Vec<Signed>>()
            .try_into()
            .unwrap();

        let args: Vec<FheProgramInput> = vec![query.into(), database.into()];

        let results = self.runtime.run(&self.compiled_query, args, public_key)?;

        Ok(results[0].clone())
    }
}

/// Alice is a party that wants to look up a value in the database without
/// revealing what she looked up.
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

    pub fn create_query(&self, index: usize) -> Result<Ciphertext, Error> {
        let mut query = [Signed::from(0); DATABASE_SIZE];
        query[index] = Signed::from(1);

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
    // Set up the database
    let server = Server::setup()?;

    // Alice sets herself up. The FHE scheme parameters are public to the
    // protocol, so Alice has them.
    let alice = Alice::setup(&server.compiled_query.metadata.params)?;

    let query = alice.create_query(94)?;

    let response = server.run_query(query, &alice.public_key)?;

    alice.check_response(response)?;

    Ok(())
}
