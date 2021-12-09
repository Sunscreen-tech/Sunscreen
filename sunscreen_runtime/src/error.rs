#[derive(Debug, Clone)]
/**
 * Represents an error that can occur in this crate.
 */
pub enum Error {
    /**
     * An issue with an [`Circuit`](sunscreen_circuit::Circuit).
     */
    IRError(sunscreen_circuit::Error),

    /**
     * An error occurred in the SEAL library.
     */
    SealError(seal::Error),

    /**
     * Tried to run a circuit that requires relinearization keys, but didn't provide any.
     */
    MissingRelinearizationKeys,

    /**
     * Tried to run a circuit that requires Galois keys, but didn't provide any.
     */
    MissingGaloisKeys,

    /**
     * When attempting to run a circuit, the wrong number of ciphertexts were provided.
     */
    IncorrectCiphertextCount,

    /**
     * An argument is incompatible with the parameters in the runtime.
     */
    ParameterMismatch,
}

impl From<sunscreen_circuit::Error> for Error {
    fn from(err: sunscreen_circuit::Error) -> Self {
        Self::IRError(err)
    }
}

impl From<seal::Error> for Error {
    fn from(err: seal::Error) -> Self {
        Self::SealError(err)
    }
}

/**
 * Wrapper around [`Result`](std::result::Result) with this crate's error type.
 */
pub type Result<T> = std::result::Result<T, Error>;
