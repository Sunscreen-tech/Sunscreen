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
    let mut variance = *data;

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

pub struct Bob {
    params: Params,
    mean_fhe: CompiledFheProgram,
    variance_fhe: CompiledFheProgram,
    runtime: Runtime,
}

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

pub struct Alice {
    runtime: Runtime,
    public_key: PublicKey,
    private_key: PrivateKey,
}

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
