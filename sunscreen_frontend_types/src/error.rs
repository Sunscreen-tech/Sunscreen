#[derive(Debug, Clone, PartialEq)]
/**
 * Represents an error that can occur in this crate.
 */
pub enum Error {
    /**
     * When compiling a circuit with the ParamsMode::Search option, you must specify a
     * PlainModulusConstraint.
     */
    MissingPlainModulusConstraint,

    /**
     * No parameters were found that satisfy the given circuit.
     */ 
    NoParams,
}

/**
 * Wrapper around [`Result`](std::result::Result) with this crate's error type.
 */
pub type Result<T> = std::result::Result<T, Error>;
