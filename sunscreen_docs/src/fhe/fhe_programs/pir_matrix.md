# A better PIR algorithm
In the previous PIR algorithm, the user had to send a query vector of the same size as the database itself. Can we do better than that? Yes!

Let's look at how to reduce the user's query size by making use of matrix-vector product *and* dot product.

## How will our improved algorithm work?
Instead of representing the database as a vector of length n, we'll represent it as a [matrix](https://en.wikipedia.org/wiki/Matrix_(mathematics)) of dimension sqrt(n) by sqrt(n). As prior, everything in the database is *un*encrypted.

Let's say Alice wants to retrieve item<sub>1,2</sub> from the database. This time, Alice will send *two* query vectors to the server; each query vector is of length sqrt(n) so Alice's communication cost will be reduced from n to 2 &middot; sqrt(n).

### Information retrieval (without privacy)
What goes in the query vectors?
- Query Vector #1: Used in the matrix-vector product. The query vector will have a 0 in every place, except for the column number Alice is interested in. Since Alice wants the 2nd column, the vector takes the following form: [0, 1, 0, ..., 0].
- Query Vector #2: Used in the dot product. This query vector will have a 0 in every place, except for the row number Alice is interested in. Since Alice wants the 1st row, the vector takes the following form: [1, 0, ..., 0].

When we take the matrix-vector product of the database with query vector #1, we get a vector back. What's in this vector?

[item<sub>1,2</sub>, item<sub>2,2</sub>, item<sub>3,2</sub>, ..., item<sub>sqrt(n),2</sub>]

When we take the dot product of the previous result with query vector #2, we get the item Alice is interested in. Why? Well:

[item<sub>1,2</sub>, item<sub>2,2</sub>, item<sub>3,2</sub>, ..., item<sub>sqrt(n),2</sub>] &middot; [1, 0, ..., 0]<sup>t</sup> = item<sub>1,2</sub>

### Making the query private
Since Alice doesn't want to reveal to the server which item she's interested in, she encrypts her two query vectors with respect to her FHE public key.

- Query Vector #1: [Enc(0), Enc(1), Enc(0), ..., Enc(0)]
- Query Vector #2: [Enc(1), Enc(0), ..., Enc(0)]

When the server takes the matrix-vector product of the database with encrypted query vector #1, we get:

[Enc(item<sub>1,2</sub>), Enc(item<sub>2,2</sub>), Enc(item<sub>3,2</sub>), ..., Enc(item<sub>sqrt(n),2</sub>)]

When the server takes the dot product of the above vector with encrypted query vector #2, voila, we get Alice's desired item:

[Enc(item<sub>1,2</sub>), Enc(item<sub>2,2</sub>), Enc(item<sub>3,2</sub>), ..., Enc(item<sub>sqrt(n),2</sub>)] &middot; [Enc(1), Enc(0), ..., Enc(0)]<sup>t</sup> = Enc(item<sub>1,2</sub>)

## Program walkthrough
Our database will have 100 items in it. We'll use an [array](./types/types.md#arrays) to represent our database.

### Setup
```rust
use sunscreen::{
    fhe_program,
    types::{bfv::Signed, Cipher},
};

const SQRT_DATABASE_SIZE: usize = 10;

#[fhe_program(scheme = "bfv")]
/// This program takes a user's query and looks up the entry in the database.
/// Queries are arrays containing a single 1 element at the
/// desired item's index and 0s elsewhere.
fn lookup(
    col_query: [Cipher<Signed>; SQRT_DATABASE_SIZE],
    row_query: [Cipher<Signed>; SQRT_DATABASE_SIZE],
    database: [[Signed; SQRT_DATABASE_SIZE]; SQRT_DATABASE_SIZE],
) -> Cipher<Signed> {
    // Copy col_query just so we get an initialized object of the right
    // type in col.
    let mut col = [col_query[0]; SQRT_DATABASE_SIZE];

    // Perform matrix-vector multiplication with col_query to extract
    // Alice's desired column
    for i in 0..SQRT_DATABASE_SIZE {
        for j in 0..SQRT_DATABASE_SIZE {
            if j == 0 {
                col[i] = database[i][j] * col_query[j];
            } else {
                col[i] = col[i] + database[i][j] * col_query[j];
            }
        }
    }

    let mut sum = col[0] * row_query[0];

    // Dot product the result with the row query to get the result
    for i in 1..SQRT_DATABASE_SIZE {
        sum = sum + col[i] * row_query[i];
    }

    sum
}
```

We begin by importing the stuff we're going to use.

We declare our `lookup` function as an FHE program with the appropriate attribute `(#[fhe_program(scheme = "bfv")])`.

We'll represent our database as an array of length `SQRT_DATABASE_SIZE` (in this case = 10) with entries that are arrays of length `SQRT_DATABASE_SIZE` (also = 10). Since we want to write into the database, we'll need to initialize the array in the FHE program's function body.

`lookup` implements the matrix-vector and dot product formulas explained above to retrieve Alice's item privately. It takes in an unencrypted `database` along with Alice's encrypted query "vectors" (actually arrays). Recall that we have two queries&mdash; `col_query` will be used to select the appropriate column of the database whereas `row_query` will be used to select the appropriate row of the database.

### Alice

```rust
# use sunscreen::{
#     FheRuntime, PrivateKey, PublicKey,
# };

/// Alice is a party that wants to look up a value in the database without
/// revealing what she looked up.
struct Alice {
    /// Alice's public key
    pub public_key: PublicKey,

    /// Alice's private key
    private_key: PrivateKey,

    /// Alice's runtime
    runtime: FheRuntime,
}
```

Alice wants to retrieve an item from the database privately. She'll need a public/private key pair to do this (since she needs to encrypt her query with respect to her public key).

```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
#     Ciphertext, CompiledFheProgram, Compiler, Error, FheProgramInput, FheRuntime,
#     Params, PrivateKey, PublicKey,
# };
#
# const SQRT_DATABASE_SIZE: usize = 10;
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
#     runtime: FheRuntime,
# }
#
impl Alice {
    pub fn setup(params: &Params) -> Result<Alice, Error> {
        let runtime = FheRuntime::new(params)?;

        let (public_key, private_key) = runtime.generate_keys()?;

        Ok(Alice {
            public_key,
            private_key,
            runtime,
        })
    }

    pub fn create_query(&self, index: usize) -> Result<(Ciphertext, Ciphertext), Error> {
        let col = index % SQRT_DATABASE_SIZE;
        let row = index / SQRT_DATABASE_SIZE;

        let mut col_query = [Signed::from(0); SQRT_DATABASE_SIZE];
        let mut row_query = [Signed::from(0); SQRT_DATABASE_SIZE];
        col_query[col] = Signed::from(1);
        row_query[row] = Signed::from(1);

        Ok((
            self.runtime.encrypt(col_query, &self.public_key)?,
            self.runtime.encrypt(row_query, &self.public_key)?,
        ))
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

`create_query` will allow Alice to create and encrypt her two query "vectors" (i.e. arrays). Alice will pass in an `index` which contains her desired column and row indices. Notice the 1's place of the `index` will allow Alice to select her desired column #, whereas the 10's place will allow Alice to select her desired row # (e.g. if `index` is 85, this denotes Alice is interested in entry located in the 5th column, 8th row).

We won't use this until the very end but `check_response` allows Alice to decrypt the server's response by passing in the ciphertext she received (`value`) along with her `private_key`.


### Server
Let's look at the server next.

```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
#     Ciphertext, CompiledFheProgram, Compiler, Error, FheProgramInput, FheRuntime,
#     Params, PrivateKey, PublicKey,
# };
#
/// This is the server that processes Alice's query.
struct Server {
    /// The compiled database query program
    pub compiled_lookup: CompiledFheProgram,

    /// The server's runtime
    runtime: FheRuntime,
}
```

Recall that the server is responsible for retrieving Alice's item from the database; thus, it will have to run the compiled lookup program (`compiled_lookup`).

```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
#     Ciphertext, CompiledFheProgram, Compiler, Error, FheProgramInput, FheRuntime,
#     Params, PrivateKey, PublicKey,
# };
#
# #[fhe_program(scheme = "bfv")]
# /// This program takes a user's query and looks up the entry in the database.
# /// Queries are arrays containing a single 1 element at the
# /// desired item's index and 0s elsewhere.
# fn lookup(
#     col_query: [Cipher<Signed>; SQRT_DATABASE_SIZE],
#     row_query: [Cipher<Signed>; SQRT_DATABASE_SIZE],
#     database: [[Signed; SQRT_DATABASE_SIZE]; SQRT_DATABASE_SIZE],
# ) -> Cipher<Signed> {
#     // Copy col_query just so we get an initialized object of the right
#     // type in col.
#     let mut col = [col_query[0]; SQRT_DATABASE_SIZE];
#
#     // Perform matrix-vector multiplication with col_query to extract
#     // Alice's desired column
#     for i in 0..SQRT_DATABASE_SIZE {
#         for j in 0..SQRT_DATABASE_SIZE {
#             if j == 0 {
#                 col[i] = database[i][j] * col_query[j];
#             } else {
#                 col[i] = col[i] + database[i][j] * col_query[j];
#             }
#         }
#     }
#
#     let mut sum = col[0] * row_query[0];
#
#     // Dot product the result with the row query to get the result
#     for i in 1..SQRT_DATABASE_SIZE {
#         sum = sum + col[i] * row_query[i];
#     }
#
#     sum
# }
#
# const SQRT_DATABASE_SIZE: usize = 10;
#
# /// This is the server that processes Alice's query.
# struct Server {
#     /// The compiled database query program
#     pub compiled_lookup: CompiledFheProgram,
#
#     /// The server's runtime
#     runtime: FheRuntime,
# }
#
impl Server {
    pub fn setup() -> Result<Server, Error> {
        let app = Compiler::new()
            .fhe_program(lookup)
            .compile()?;

        let runtime = FheRuntime::new(app.params())?;

        Ok(Server {
            compiled_lookup: app.get_fhe_program(lookup).unwrap().clone(),
            runtime,
        })
    }

    pub fn run_query(
        &self,
        col_query: Ciphertext,
        row_query: Ciphertext,
        public_key: &PublicKey,
    ) -> Result<Ciphertext, Error> {
        // Our database will consist of values between 400 and 500.
        let mut database = [[Signed::from(0); SQRT_DATABASE_SIZE]; SQRT_DATABASE_SIZE];
        let mut val = Signed::from(400);

        for i in 0..SQRT_DATABASE_SIZE {
            for j in 0..SQRT_DATABASE_SIZE {
                database[i][j] = val;
                val = val + 1;
            }
        }

        let args: Vec<FheProgramInput> = vec![col_query.into(), row_query.into(), database.into()];

        let results = self.runtime.run(&self.compiled_lookup, args, public_key)?;

        Ok(results[0].clone())
    }
}
```

The server constructs a runtime so that it can run the compiled FHE program `compiled_lookup`.

Using `run_query`, the server can return an (encrypted) response to Alice's query.

The items in the database will be the integers from 400 to 499, stored in ascending order. Recall that `lookup` takes in three arguments---the encrypted query for the column index (`col_query`), the encrypted query for the row index (`row_query`), and the unencrypted database. Unfortunately, we'll need to do some type conversion for the database as Sunscreen's compiler needs entries of the `Signed` type not `i64` for its programs.

Additionally, to run FHE programs, we need to pass in arguments as a `vec`. Thus, we create a `vec` called `args` that contains our encrypted queries and unencrypted database (which now has `Signed` entries rather than `i64` entries in it).

Once all that's done, the server can `run` the FHE program by passing in the `compiled_lookup` program, the arguments to the program `args` (now contained in a `vec`), and Alice's `public_key`.


### Retrieving the item privately

```rust
# use sunscreen::{
#     fhe_program,
#     types::{bfv::Signed, Cipher},
#     Ciphertext, CompiledFheProgram, Compiler, Error, FheProgramInput, FheRuntime,
#     Params, PrivateKey, PublicKey,
# };
#
# const SQRT_DATABASE_SIZE: usize = 10;
#
# #[fhe_program(scheme = "bfv")]
# /// This program takes a user's query and looks up the entry in the database.
# /// Queries are arrays containing a single 1 element at the
# /// desired item's index and 0s elsewhere.
# fn lookup(
#     col_query: [Cipher<Signed>; SQRT_DATABASE_SIZE],
#     row_query: [Cipher<Signed>; SQRT_DATABASE_SIZE],
#     database: [[Signed; SQRT_DATABASE_SIZE]; SQRT_DATABASE_SIZE],
# ) -> Cipher<Signed> {
#     // Copy col_query just so we get an initialized object of the right
#     // type in col.
#     let mut col = [col_query[0]; SQRT_DATABASE_SIZE];
#
#     // Perform matrix-vector multiplication with col_query to extract
#     // Alice's desired column
#     for i in 0..SQRT_DATABASE_SIZE {
#         for j in 0..SQRT_DATABASE_SIZE {
#             if j == 0 {
#                 col[i] = database[i][j] * col_query[j];
#             } else {
#                 col[i] = col[i] + database[i][j] * col_query[j];
#             }
#         }
#     }
#
#     let mut sum = col[0] * row_query[0];
#
#     // Dot product the result with the row query to get the result
#     for i in 1..SQRT_DATABASE_SIZE {
#         sum = sum + col[i] * row_query[i];
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
#     runtime: FheRuntime,
# }
#
# impl Alice {
#     pub fn setup(params: &Params) -> Result<Alice, Error> {
#         let runtime = FheRuntime::new(params)?;
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
#     pub fn create_query(&self, index: usize) -> Result<(Ciphertext, Ciphertext), Error> {
#         let col = index % SQRT_DATABASE_SIZE;
#         let row = index / SQRT_DATABASE_SIZE;
#
#         let mut col_query = [Signed::from(0); SQRT_DATABASE_SIZE];
#         let mut row_query = [Signed::from(0); SQRT_DATABASE_SIZE];
#         col_query[col] = Signed::from(1);
#         row_query[row] = Signed::from(1);
#
#         Ok((
#             self.runtime.encrypt(col_query, &self.public_key)?,
#             self.runtime.encrypt(row_query, &self.public_key)?,
#         ))
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
#     /// The compiled database query program
#     pub compiled_lookup: CompiledFheProgram,
#
#     /// The server's runtime
#     runtime: FheRuntime,
# }
#
# impl Server {
#     pub fn setup() -> Result<Server, Error> {
#         let app = Compiler::new()
#             .fhe_program(lookup)
#             .compile()?;
#
#         let runtime = FheRuntime::new(app.params())?;
#
#         Ok(Server {
#             compiled_lookup: app.get_fhe_program(lookup).unwrap().clone(),
#             runtime,
#         })
#     }
#
#     pub fn run_query(
#         &self,
#         col_query: Ciphertext,
#         row_query: Ciphertext,
#         public_key: &PublicKey,
#     ) -> Result<Ciphertext, Error> {
#         // Our database will consist of values between 400 and 500.
#         let mut database = [[Signed::from(0); SQRT_DATABASE_SIZE]; SQRT_DATABASE_SIZE];
#         let mut val = Signed::from(400);
#
#         for i in 0..SQRT_DATABASE_SIZE {
#             for j in 0..SQRT_DATABASE_SIZE {
#                 database[i][j] = val;
#                 val = val + 1;
#             }
#         }
#
#         let args: Vec<FheProgramInput> = vec![col_query.into(), row_query.into(), database.into()];
#
#         let results = self.runtime.run(&self.compiled_lookup, args, public_key)?;
#
#         Ok(results[0].clone())
#     }
# }
fn main() -> Result<(), Error> {
    // Set up the database
    let server = Server::setup()?;

    // Alice sets herself up. The FHE scheme parameters are public to the
    // protocol, so Alice has them.
    let alice = Alice::setup(&server.compiled_lookup.metadata.params)?;

    let (col_query, row_query) = alice.create_query(94)?;

    let response = server.run_query(col_query, row_query, &alice.public_key)?;

    alice.check_response(response)?;

    Ok(())
}
```

We set up the server first and then Alice (notice that Alice relies on parameters generated from the server's setup). Both of them must use the same set of FHE scheme parameters for compatibility. In deployment, these values would likely be fixed at the protocol level.

Alice would like to privately retrieve the item at the 94th "position" (this will mean the entry located in the 4th row, 9th column) from the database so she calls `create_query`. `create_query` encrypts her query value of 94 properly (i.e. creates `col_query` and `row_query` which has encryptions of 0s and 1s in the appropriate places).

The server calls `run_query` to privately retrieve Alice's desired item to her. It passes in Alice's encrypted queries along with Alice's public key (`alice.public_key`).

Finally, Alice can decrypt to check what item she received via `check_response`.

### Performance
The entire program (not including compilation time) takes ~376 ms on an Intel Xeon @ 3.0 GHz (with 8 cores and 16 GB RAM) and ~716 ms on a Macbook Air M1.

# What's missing?
If you're interested in using PIR in a real application, there are much better PIR algorithms out there (e.g. [SealPIR](https://eprint.iacr.org/2017/1142.pdf), [Spiral](https://eprint.iacr.org/2022/368.pdf)) that are faster and compress the query vector further.

Additionally, in PIR, we assume that the user knows the index of the item she wants to retrieve. For many applications though, this might not be the case. [Oblivious message detection](https://eprint.iacr.org/2021/1256.pdf) allows the user to detect *which* item she's interested in and can be combined with PIR.

