#[derive(Debug, Clone, PartialEq)]
/**
 * Represents an error that can occur in this crate.
 */
pub enum Error {
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
