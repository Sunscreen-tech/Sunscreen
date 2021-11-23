#[derive(Debug, Clone)]
/**
 * Represents an error that can occur in this crate.
 */
pub enum Error {
    /**
     * An issue with an [`Circuit`](sunscreen_circuit::Circuit).
     */
    IRError(sunscreen_circuit::Error),
}

impl From<sunscreen_circuit::Error> for Error {
    fn from(err: sunscreen_circuit::Error) -> Self {
        Self::IRError(err)
    }
}

/**
 * Wrapper around [`Result`](std::result::Result) with this crate's error type.
 */
pub type Result<T> = std::result::Result<T, Error>;
