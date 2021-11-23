#[derive(Debug, Clone, PartialEq)]
/**
 * Represents an error that can occur in this crate.
 */
pub enum Error {
    /**
     * Afer running [`determine_params`](crate::determine_params), no suitable parameters
     * were found that can run the circuit. This might mean the circuit is too large,
     * you requested too many bits of noise budget remain at the end, or the plaintext modulus
     * constraint was too large.
     */ 
    NoParams,

    /**
     * A circuit is erroneous.
     */ 
    IRError(sunscreen_circuit::Error),
}

impl From<sunscreen_circuit::Error> for Error {
    fn from(err: sunscreen_circuit::Error) -> Self {
        Self::IRError(err)
    }
}

/**
 * A convensience wrapper around [`std::result::Result`].
 */ 
pub type Result<T> = std::result::Result<T, Error>;
