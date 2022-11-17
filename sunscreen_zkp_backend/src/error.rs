use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[cfg(feature = "bulletproofs")]
    #[error("Bulletproofs R1CS error: {0:#?}")]
    BulletproofsR1CSError(#[from] bulletproofs::r1cs::R1CSError),

    #[error("Value {0} is out of range for the chosen backend")]
    OutOfRange(String),

    #[error("The number of inputs passed to an R1CS circuit didn't match the number of inputs to the circuit.")]
    InputsMismatch,

    #[error("The given proof isn't valid for the backend proof system.")]
    IncorrectProofType,
}

pub type Result<T> = std::result::Result<T, Error>;
