# Warm up: a very simple PIR algorithm
We'll start with a very simple algorithm that uses a dot product to return an item privately. 

## How will our algorithm work?
Everything in the database will be *un*encrypted. We'll represent our database as a [vector](https://en.wikipedia.org/wiki/Euclidean_vector) of `n` items.

Let's say that Alice wants to retrieve the 2nd item from the database. Alice will send a query to the server; we'll represent this query as a vector of length `n` as well.

### Information retrieval (**without privacy**)
 Every element of this query vector, *except* the one Alice is interested in, will have a 0 in its place. Alice will place a 1 in the 2nd entry (since she's interested in the 2nd item). When the server take the dot product of these two vectors, Alice will get back the item she wanted to retrieve:
 
 [item<sub>1</sub>, item<sub>2</sub>, item<sub>3</sub>, ... , item<sub>n</sub>] &middot; [0, 1, 0, ... , 0]<sup>t</sup> 

= item<sub>1</sub> &middot; 0 + item<sub>2</sub> &middot; 1 + item<sub>3</sub> &middot; 0 + ... + item<sub>n</sub> &middot; 0 

= item<sub>2</sub>

Of course, the server can observe that Alice is interested in retrieving the 2nd item. How do we make this query private?

### Making the query private

For simplicity, let Enc(x) denote that we encrypt x.[^1]

Since Alice doesn't want to reveal to the server *which* item she's interested in, she encrypts each of the elements in her query vector with respect to her FHE public key. Voila! We can now retrieve the information privately:

[item<sub>1</sub>, item<sub>2</sub>, item<sub>3</sub>, ... , item<sub>n</sub>] &middot; [Enc(0), Enc(1), Enc(0), ... , Enc(0)]<sup>t</sup> 

 = item<sub>1</sub> &middot; Enc(0) + item<sub>2</sub> &middot; Enc(1) + item<sub>3</sub> &middot; Enc(0) + ... + item<sub>n</sub> &middot; Enc(0) 

= Enc(item<sub>2</sub>)

[^1]: The encryption scheme must be [probabilistic](https://en.wikipedia.org/wiki/Probabilistic_encryption) (such that different randomness is used for encrypting each element in the query vector). Otherwise, the server *would* be able to tell apart Enc(1) from Enc(0) and deduce what Alice wants to retrieve. You don't have to worry about this issue when using Sunscreen's compiler.

## Program walkthrough
Our database will have 100 items in it. We'll represent the vectors from earlier as [arrays](./types/types.md/#arrays), one of Sunscreen's supported types.

### Setup

```rust
use sunscreen::{
    fhe_program,
    types::{bfv::Signed, Cipher},
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
```

We begin by importing the stuff we're going to use.

We declare our `lookup` function as an FHE program with the appropriate attribute (`#[fhe_program(scheme = "bfv")]`).

`lookup` implements the dot product formula discussed above. It takes in the unencrypted `database` and the encrypted `query` from the user to retrieve an item privately. The database is an array of length `DATABASE_SIZE` where each item in the database is a signed integer (`Signed`). Hence, the user's `query` is an array of length `DATABASE_SIZE` as well, where each entry is of type `Cipher<Signed>`.

### Alice
```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
#     Ciphertext, CompiledFheProgram, Compiler, Error, FheProgramInput, Params, PrivateKey,
#     PublicKey, Runtime,
# };
#
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
```

Alice wants to retrieve an item from the database privately. She'll need a public/private key pair to do this (since she needs to encrypt her query with respect to her public key).

```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
#     Ciphertext, CompiledFheProgram, Compiler, Error, FheProgramInput, Params, PrivateKey,
#     PublicKey, Runtime,
# };
#
# const DATABASE_SIZE: usize = 100;
#
# /// Alice is a party that wants to look up a value in the database without
# /// revealing what she looked up.
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
```

Alice will need to construct a runtime. Once that's done, she can generate her public/private key pair. 

Alice can create her unencrypted query "vector" (actually an [array](./types/types.md/#array)) of 0's and 1's by calling `create_query`. Recall that the we'll have a 1 in the place of her desired item's index and a 0 elsewhere. Since she wants her query to be private, she'll `encrypt` her `query`, passing in her `public_key` as necessary.

We won't use this until the very end but `check_response` allows Alice to decrypt the server's response by passing in the ciphertext she received (`value`) along with her `private_key`.


### Server
Let's look at the server next.

```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
#     Ciphertext, CompiledFheProgram, Compiler, Error, FheProgramInput, Params, PrivateKey,
#     PublicKey, Runtime,
# };
/// This is the server that processes Alice's query.
struct Server {
    /// The compiled database lookup program
    pub compiled_lookup: CompiledFheProgram,

    /// The server's runtime
    runtime: Runtime,
}
```

Recall that the server is responsible for retrieving Alice's item from the database; thus, it will have to run the compiled `lookup` program (`compiled_lookup`).

```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
#     Ciphertext, CompiledFheProgram, Compiler, Error, FheProgramInput, Params, PrivateKey,
#     PublicKey, Runtime,
# };
#
# const DATABASE_SIZE: usize = 100;
#
# #[fhe_program(scheme = "bfv")]
# /// This program takes a user's query and looks up the entry in the database.
# /// Queries are arrays containing a single 1 element at the
# /// desired item's index and 0s elsewhere.
# fn lookup(query: [Cipher<Signed>; DATABASE_SIZE], database: [Signed; DATABASE_SIZE]) -> Cipher<Signed> {
#     let mut sum = query[0] * database[0];
# 
#     for i in 1..DATABASE_SIZE {
#         sum = sum + query[i] * database[i]
#     }
# 
#     sum
# }
#
# /// This is the server that processes Alice's query.
# struct Server {
#     /// The compiled database lookup program
#     pub compiled_lookup: CompiledFheProgram,
#
#     /// The server's runtime
#     runtime: Runtime,
# }
#
impl Server {
    pub fn setup() -> Result<Server, Error> {
        let app = Compiler::new()
            .fhe_program(lookup)
            .compile()?;

        let runtime = Runtime::new(app.params())?;

        Ok(Server {
            compiled_lookup: app.get_program(lookup).unwrap().clone(),
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

        let results = self.runtime.run(&self.compiled_lookup, args, public_key)?;

        Ok(results[0].clone())
    }
}
```

The server constructs a runtime so that it can run the compiled FHE program `compiled_lookup`.

Using `run_query`, the server can return an (encrypted) response to Alice's query.

The items in the database will be the integers from 400 to 499, stored in ascending order. Recall that `lookup` takes in two arguments---the encrypted query and the unencrypted database. Unfortunately, we'll need to do some type conversion for the `database` as Sunscreen's compiler needs the `Signed` type *not* `i64` for its programs.

Additionally, to `run` FHE programs, we need to pass in arguments as a `vec`. Thus, we create a `vec` called `args` that contains our encrypted `query` and unencrypted `database` (which now has `Signed` entries rather than `i64` entries in it). 

Once all that's done, the server can `run` the FHE program by passing in the `compiled_lookup` program, the arguments to the program `args` (now contained in a `vec`), and Alice's `public_key`. 


### Retrieving the item privately
```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
#     Ciphertext, CompiledFheProgram, Compiler, Error, FheProgramInput, Params, PrivateKey,
#     PublicKey, Runtime,
# };
#
# const DATABASE_SIZE: usize = 100;
#
# #[fhe_program(scheme = "bfv")]
# /// This program takes a user's query and looks up the entry in the database.
# /// Queries are arrays containing a single 1 element at the
# /// desired item's index and 0s elsewhere.
# fn lookup(query: [Cipher<Signed>; DATABASE_SIZE], database: [Signed; DATABASE_SIZE]) -> Cipher<Signed> {
#     let mut sum = query[0] * database[0];
# 
#     for i in 1..DATABASE_SIZE {
#         sum = sum + query[i] * database[i]
#     }
# 
#     sum
# }
#
# /// Alice is a party that wants to look up a value in the database without
# /// revealing what she looked up.
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
#     pub fn create_query(&self, index: usize) -> Result<Ciphertext, Error> {
#         let mut query = [Signed::from(0); DATABASE_SIZE];
#         query[index] = Signed::from(1);
#
#         Ok(self.runtime.encrypt(query, &self.public_key)?)
#     }
#
#     pub fn check_response(&self, value: Ciphertext) -> Result<(), Error> {
#         let value: Signed = self.runtime.decrypt(&value, &self.private_key)?;
#
#         let value: i64 = value.into();
#
#         println!("Alice received {}", value);
#
#         Ok(())
#     }
# }
#
# /// This is the server that processes Alice's query.
# struct Server {
#     /// The compiled database lookup program
#     pub compiled_lookup: CompiledFheProgram,
#
#     /// The server's runtime
#     runtime: Runtime,
# }
#
# impl Server {
#     pub fn setup() -> Result<Server, Error> {
#         let app = Compiler::new()
#             .fhe_program(lookup)
#             .compile()?;
# 
#         let runtime = Runtime::new(app.params())?;
# 
#         Ok(Server {
#             compiled_lookup: app.get_program(lookup).unwrap().clone(),
#             runtime,
#         })
#     }
#
#     pub fn run_query(
#         &self,
#         query: Ciphertext,
#         public_key: &PublicKey,
#     ) -> Result<Ciphertext, Error> {
#         // Our database will consist of values between 400 and 500.
#         let database: [Signed; DATABASE_SIZE] = (400..(400 + DATABASE_SIZE))
#             .map(|x| Signed::from(x as i64))
#             .collect::<Vec<Signed>>()
#             .try_into()
#             .unwrap();
#
#         let args: Vec<FheProgramInput> = vec![query.into(), database.into()];
#
#         let results = self.runtime.run(&self.compiled_lookup, args, public_key)?;
#
#         Ok(results[0].clone())
#     }
# }
#
fn main() -> Result<(), Error> {
    // Set up the database
    let server = Server::setup()?;

    // Alice sets herself up. The FHE scheme parameters are public to the
    // protocol, so Alice has them.
    let alice = Alice::setup(&server.compiled_lookup.metadata.params)?;

    let query = alice.create_query(94)?;

    let response = server.run_query(query, &alice.public_key)?;

    alice.check_response(response)?;

    Ok(())
}
```
We set up the server first and then Alice (notice that Alice relies on parameters generated from the server's setup). Both of them must use the same set of FHE scheme parameters for compatibility. In deployment, these values would likely be fixed at the protocol level.

Alice would like to privately retrieve the item at the 94th position from the database so she calls `create_query` which encrypts her query value of `94` (i.e. we get an array that has encryptions of `0` in all positions except the 94th position which contains an encryption of `1`).

The server calls `run_query` to privately retrieve Alice's desired item to her. It passes in Alice's encrypted `query` along with Alice's public key (`alice.public_key`).

Finally, Alice can decrypt to check what item she received via `check_response`.


### Performance
The entire program (not including compilation time) takes ~5 ms on an Intel Xeon @ 3.0 GHz (with 8 cores and 16 GB RAM) and ~42 ms on a Macbook Air M1.
