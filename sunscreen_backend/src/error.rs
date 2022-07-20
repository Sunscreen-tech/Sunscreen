#[derive(Debug, Clone, PartialEq)]
/**
 * Represents an error that can occur in this crate.
 */
pub enum Error {
    /**
     * An [``]() is erroneous.
     */
    IRError(sunscreen_fhe_program::Error),

    /**
     * The given parameters are invalid.
     */
    InvalidParams,
}

impl From<sunscreen_fhe_program::Error> for Error {
    fn from(err: sunscreen_fhe_program::Error) -> Self {
        Self::IRError(err)
    }
}

/**
 * A convenience wrapper around [`std::result::Result`].
 */
pub type Result<T> = std::result::Result<T, Error>;
