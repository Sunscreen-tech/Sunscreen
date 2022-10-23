use seal_fhe::Error as SealError;
use sunscreen_runtime::FheProgramRunFailure as RuntimeError;

#[derive(Debug, Clone, PartialEq, Eq)]
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

    /**
     * An error occurred in SEAL.
     */
    SealError(SealError),

    /**
     * Failed to generate expected Relinearization or Galois keys.
     */
    KeygenFailure,

    /**
     * An error occurred when running an FHE program.
     */
    RuntimeError(RuntimeError),

    /**
     * The given target noise budget is unachievable even with a fresh ciphertext.
     */
    ImpossibleNoiseFloor,

    /**
     * Attempted to create a ciphertext with
     * [`TargetNoiseLevel::NotApplicable`](crate::noise_model::TargetNoiseLevel::NotApplicable).
     */
    NotApplicable,
}

impl From<sunscreen_fhe_program::Error> for Error {
    fn from(err: sunscreen_fhe_program::Error) -> Self {
        Self::IRError(err)
    }
}

impl From<SealError> for Error {
    fn from(err: SealError) -> Self {
        Self::SealError(err)
    }
}

impl From<RuntimeError> for Error {
    fn from(err: RuntimeError) -> Self {
        Self::RuntimeError(err)
    }
}

/**
 * A convenience wrapper around [`std::result::Result`].
 */
pub type Result<T> = std::result::Result<T, Error>;
