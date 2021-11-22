#[derive(Debug, Clone)]
/**
 * Represents an error that can occur in this crate.
 */
pub enum Error {
    /**
     * An issue with an [`IntermediateRepresentation`](sunscreen_ir::IntermediateRepresentation).
     */
    IRError(sunscreen_ir::Error),
}

impl From<sunscreen_ir::Error> for Error {
    fn from(err: sunscreen_ir::Error) -> Self {
        Self::IRError(err)
    }
}

/**
 * Wrapper around [`Result`](std::result::Result) with this crate's error type.
 */
pub type Result<T> = std::result::Result<T, Error>;
