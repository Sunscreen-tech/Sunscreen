# Statistics on encrypted data
Let's look at how to compute various statistics over an encrypted data set. You can imagine more exciting applications such as a private version of 23andme where the testing provider runs various tests on your encrypted genetic data so that only you know the results!

For this example, we'll demonstrate some basic statistical computations (mean and variance) over a small encrypted data set. The computations presented here are so trivial that the user is better off calculating the results themselves on their own plaintext data; FHE isn't really needed. A more realistic scenario would involve computations that are too intensive for the user to compute herself (i.e. you need a lot of computational power) and/or the test provider holding proprietary tests that they don't wish to share directly with the user. 


## Program Walkthrough
Our data set will consist of 15 points.

We'll take advantage of unified parameters as well as see how to factor FHE programs and use serialization. 

### Setup
```rust
use bincode::Error as BincodeError;
use std::ops::{Add, Div, Mul, Sub};
use sunscreen::{
    fhe_program,
    types::{bfv::Fractional, Cipher},
    Ciphertext, CompiledFheProgram, Compiler, Error as SunscreenError, Params, PrivateKey,
    PublicKey, Runtime, RuntimeError,
};

const DATA_POINTS: usize = 15;

fn mean<T, const COUNT: usize>(data: &[T; COUNT]) -> T
where
    T: Add<Output = T> + Div<f64, Output = T> + Copy,
{
    let mut sum = data[0];

    for i in 1..data.len() {
        sum = sum + data[i];
    }

    sum / (data.len() as f64)
}

fn variance<T, const COUNT: usize>(data: &[T; COUNT]) -> T
where
    T: Add<Output = T> + Sub<Output = T> + Mul<Output = T> + Div<f64, Output = T> + Copy,
{
    let mean_data = mean(data);
    let mut variance = data.clone();

    for i in 0..data.len() {
        let tmp = mean_data - data[i];

        variance[i] = tmp * tmp;
    }

    mean(&variance)
}

#[derive(Debug)]
pub enum Error {
    SunscreenError(SunscreenError),
    BincodeError(BincodeError),
}

impl From<SunscreenError> for Error {
    fn from(e: SunscreenError) -> Self {
        Self::SunscreenError(e)
    }
}

impl From<RuntimeError> for Error {
    fn from(e: RuntimeError) -> Self {
        Self::SunscreenError(SunscreenError::RuntimeError(e))
    }
}

impl From<BincodeError> for Error {
    fn from(e: BincodeError) -> Self {
        Self::BincodeError(e)
    }
}
```

We begin by importing the stuff we're going to use. For this example, we'll need to use the `Fractional` type since we'll have to divide a ciphertext by plaintext (as a sanity check, you should convince yourself why).

We factor our programs&mdash;namely the `mean` function and `variance` function. Recall that factoring allows us to run these programs without FHE if desired.

### Testing Provider

```rust
pub struct Bob {
    params: Params,
    mean_fhe: CompiledFheProgram,
    variance_fhe: CompiledFheProgram,
    runtime: Runtime,
}
```

The testing provider (Bob) will compute the mean and variance of a user's encrypted data set; thus, he'll have to run the compiled versions of these FHE programs.

```rust
impl Bob {
    pub fn new() -> Result<Self, Error> {
        #[fhe_program(scheme = "bfv")]
        fn mean_fhe(data: [Cipher<Fractional<64>>; DATA_POINTS]) -> Cipher<Fractional<64>> {
            mean(&data)
        }

        #[fhe_program(scheme = "bfv")]
        fn variance_fhe(data: [Cipher<Fractional<64>>; DATA_POINTS]) -> Cipher<Fractional<64>> {
            variance(&data)
        }

        let app = Compiler::new()
            .fhe_program(mean_fhe)
            .fhe_program(variance_fhe)
            .compile()?;

        let mean_program = app.get_program(mean_fhe).unwrap();
        let variance_program = app.get_program(variance_fhe).unwrap();

        let runtime = Runtime::new(app.params())?;

        Ok(Self {
            params: app.params().to_owned(),
            mean_fhe: mean_program.to_owned(),
            variance_fhe: variance_program.to_owned(),
            runtime,
        })
    }

    pub fn compute_and_serialize_mean_variance(
        &self,
        serialized_ciphertext: &[u8],
        serialized_public_key: &[u8],
    ) -> Result<(Vec<u8>, Vec<u8>), Error> {
        let data: Ciphertext = bincode::deserialize(serialized_ciphertext)?;
        let public_key = bincode::deserialize(serialized_public_key)?;

        let mean_result = self
            .runtime
            .run(&self.mean_fhe, vec![data.clone()], &public_key)?;

        let variance_result = self
            .runtime
            .run(&self.variance_fhe, vec![data], &public_key)?;

        Ok((
            bincode::serialize(&mean_result[0])?,
            bincode::serialize(&variance_result[0])?,
        ))
    }

    pub fn serialized_scheme_params(&self) -> Result<Vec<u8>, Error> {
        Ok(bincode::serialize(&self.params)?)
    }
}
```

He declares `mean_fhe` and `variance_fhe` as FHE programs with the appropriate attribute (`[fhe_program(scheme = "bfv")]`). As`mean_fhe` and `variance_fhe` compute the mean and variance over an encrypted data set, they both take in `Cipher<Fractional<64>>`s and return a `Cipher<Fractional<64>>`.

Since Bob is responsible for computing the mean and variance, he'll have to run the compiled `mean_fhe` and `variance_fhe` programs. Thus, in `new`, he compiles `mean_fhe` and `variance_fhe` and saves them as runnable programs. Finally, he constructs and saves a `runtime` so that he can later run these programs.

In `compute_and_serialize_mean_variance`, Bob computes the mean and variance of a user's encrypted data and then serializes the results of these computations. He calls `runtime.run`, passing in the respective FHE program (either `mean_fhe` or `variance_fhe`), the user's encrypted data (`data`), and the user's `public_key`. Recall that we must pass in arguments to an FHE program via a `vec`. The results of the computations are stored as `mean_result` and `variance_result` and then serialized.

We also have `serialized_scheme_parameters` which will allow Bob to share the appropriate FHE scheme parameters with the user. Doing this ensures that the user encrypts her data with the correct parameter set.

### Alice
Let's look at the user (Alice) next.

```rust
pub struct Alice {
    runtime: Runtime,
    public_key: PublicKey,
    private_key: PrivateKey,
}
```

Alice will need to generate a public/private key pair to encrypt her data with.

```rust
impl Alice {
    pub fn new(serialized_params: &[u8]) -> Result<Self, Error> {
        let params = bincode::deserialize(serialized_params)?;
        let runtime = Runtime::new(&params)?;

        let (public_key, private_key) = runtime.generate_keys()?;

        Ok(Self {
            runtime,
            public_key,
            private_key,
        })
    }

    pub fn encrypt_and_serialize_input(&self) -> Result<Vec<u8>, Error> {
        fn create_dataset() -> [Fractional<64>; DATA_POINTS] {
            (0..DATA_POINTS)
                .map(|x| Fractional::try_from(x as f64).unwrap())
                .collect::<Vec<Fractional<64>>>()
                .try_into()
                .unwrap()
        }

        let data = create_dataset();

        let ciphertext = self.runtime.encrypt(data, &self.public_key)?;

        Ok(bincode::serialize(&ciphertext)?)
    }

    pub fn serialized_public_key(&self) -> Result<Vec<u8>, Error> {
        Ok(bincode::serialize(&self.public_key)?)
    }

    pub fn deserialize_decrypt_and_print_results(
        &self,
        serialized_mean: &[u8],
        serialized_variance: &[u8],
    ) -> Result<(), Error> {
        let mean = bincode::deserialize(serialized_mean)?;
        let variance = bincode::deserialize(serialized_variance)?;

        let mean: Fractional<64> = self.runtime.decrypt(&mean, &self.private_key)?;
        let mean: f64 = mean.into();

        let variance: Fractional<64> = self.runtime.decrypt(&variance, &self.private_key)?;
        let variance: f64 = variance.into();

        println!("Mean={}, Variance={}", mean, variance);

        Ok(())
    }
}
```

In `new`, Alice retrieves the scheme parameters and creates a key pair for herself. She obtains the serialized scheme parameters (`serialized_params`), `deserialize`s them, and uses them to consruct a `runtime`. Once Alice has constructed a `runtime`, she's ready to generate her `public_key` and `private_key`.

Alice then creates her data set (via `create_dataset`); we need `try_from` here to help us perform the appropriate type conversion. Now she's ready to encrypt her `data` using her `public_key`. She saves the encrypted version as `ciphertext` and finally `serialize`s it.

`serialized_public_key` will allow Alice to share her serialized public key with Bob when he performs the computations.

We won't use this until the very end but `deserialize_decrypt_and_print_results` allows Alice to find out what the results were of Bob's computations. She receives the encrypted `serialized_mean` and `serialized_variance` from Bob, `deserialize`s them, and finally can `decrypt` the values.

### Computing various statistics over private data

```rust
fn main() -> Result<(), Error> {
    // This application performs serialization to simulate messages
    // going over a network.
    let bob = Bob::new()?;

    let alice = Alice::new(&bob.serialized_scheme_params()?)?;
    let serialized_input = alice.encrypt_and_serialize_input()?;

    let (serialized_mean, serialized_variance) = bob
        .compute_and_serialize_mean_variance(&serialized_input, &alice.serialized_public_key()?)?;

    alice.deserialize_decrypt_and_print_results(&serialized_mean, &serialized_variance)?;

    Ok(())
}
```

We set up Bob first (since Alice relies on parameters generated from Bob's setup).

Alice retrieves the serialized scheme parameters from Bob which she then uses to set up her runtime and generate a key pair (via `new`). Once that's done, she encrypts her data and serializes the result using `encrypt_and_serialize_input`. 

Bob retrieves Alice's serialized data (`serialized_input`) along with Alice's serialized public key (`alice.serialized_public_key()`). He then computes the mean and variance over Alice's private data set and serializes the results, saving them as `serialized_mean` and `serialized_variance`.

Finally, Alice can determine the mean and variance over her data set via `deserialize_decrypt_and_prints_results`.

### Performance
The entire program (not including compilation time) takes ~2.54 s on an Intel Xeon @ 3.0 GHz (with 8 cores and 16 GB RAM) and ~8.71 s on a Macbook Air M1.

## What's missing?
For more interesting examples (i.e. larger data sets and more complex statistical computations), you'll likely need to go in and change the default plaintext modulus value to be larger.
