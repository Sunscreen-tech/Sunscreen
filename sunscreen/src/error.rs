#[derive(Debug, Clone, PartialEq, Eq)]
/**
 * Represents an error that can occur in this crate.
 */
pub enum Error {
    /**
     * When compiling an FHE program with the ParamsMode::Search option, you must specify a
     * PlainModulusConstraint.
     */
    MissingPlainModulusConstraint,

    /**
     * No parameters were found that satisfy the given FHE program.
     */
    NoParams,

    /**
     * Attempted to compile the given FHE program with the wrong scheme.
     */
    IncorrectScheme,

    /**
     * No FHE programs were given to the compiler.
     */
    NoPrograms,

    /**
     * Not all FHE programs passed to compilation used the same scheme.
     */
    SchemeMismatch,

    /**
     * Multiple FHE programs with the same name were compiled.
     */
    NameCollision,

    /**
     * Failed to created an encryption scheme using the given parameters.
     */
    SealEncryptionParameterError,

    /**
     * The a constraint cannot be satisfied.
     */
    UnsatisfiableConstraint,

    /**
     * An internal error occurred in the SEAL library.
     */
    SealError(seal_fhe::Error),

    /**
     * An Error occurred in the Sunscreen runtime.
     */
    RuntimeError(crate::RuntimeError),

    /**
     * The compiled Sunscreen FHE program is malformed.
     */
    FheProgramError(sunscreen_fhe_program::Error),

    /**
     * The given configuration is not supported.
     */
    Unsupported(String),
}

impl From<seal_fhe::Error> for Error {
    fn from(err: seal_fhe::Error) -> Self {
        Self::SealError(err)
    }
}

impl From<crate::RuntimeError> for Error {
    fn from(err: crate::RuntimeError) -> Self {
        Self::RuntimeError(err)
    }
}

/**
 * Wrapper around [`Result`](std::result::Result) with this crate's error type.
 */
pub type Result<T> = std::result::Result<T, Error>;
