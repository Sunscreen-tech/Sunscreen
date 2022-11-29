use static_assertions::const_assert;

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
/**
 * Represents an error that can occur in this crate.
 */
pub enum Error {
    /**
     * When compiling an FHE program with the ParamsMode::Search option, you must specify a
     * PlainModulusConstraint.
     */
    #[error("Missing plaintext modulus constraint")]
    MissingPlainModulusConstraint,

    /**
     * No parameters were found that satisfy the given FHE program.
     */
    #[error("Failed to find satisfying parameters")]
    NoParams,

    /**
     * Attempted to compile the given FHE program with the wrong scheme.
     */
    #[error("Incorrect scheme")]
    IncorrectScheme,

    /**
     * No FHE or ZKP programs were given to the compiler.
     */
    #[error("No programs")]
    NoPrograms,

    /**
     * Not all FHE programs passed to compilation used the same scheme.
     */
    #[error("Scheme mismatch")]
    SchemeMismatch,

    /**
     * Multiple FHE programs with the same name were compiled.
     */
    #[error("Name collision")]
    NameCollision,

    /**
     * Failed to created an encryption scheme using the given parameters.
     */
    #[error("Cannot create encryption scheme from parameters")]
    SealEncryptionParameterError,

    /**
     * The a constraint cannot be satisfied.
     */
    #[error("The given constraint cannot be satisfied")]
    UnsatisfiableConstraint,

    /**
     * An internal error occurred in the SEAL library.
     */
    #[error("SEAL error: {0}")]
    SealError(#[from] seal_fhe::Error),

    /**
     * An Error occurred in the Sunscreen runtime.
     */
    #[error("Runtime error: {0}")]
    RuntimeError(#[from] crate::RuntimeError),

    /**
     * The compiled Sunscreen FHE program is malformed.
     */
    #[error("FHE program error: {0}")]
    FheProgramError(sunscreen_fhe_program::Error),

    /**
     * The given configuration is not supported.
     */
    #[error("Unsupported: {0}")]
    Unsupported(Box<String>),
}

const_assert!(std::mem::size_of::<Error>() <= 24);

impl Error {
    /**
     * Create an [`Error::Unsupported`]
     */
    pub fn unsupported(msg: &str) -> Self {
        Self::Unsupported(Box::new(msg.to_owned()))
    }
}

/**
 * Wrapper around [`Result`](std::result::Result) with this crate's error type.
 */
pub type Result<T> = std::result::Result<T, Error>;
