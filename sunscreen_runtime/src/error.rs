use crate::Type;

#[derive(Debug, Clone, PartialEq, Eq)]
/**
 * Represents an error that can occur in this crate.
 */
pub enum Error {
    /**
     * An issue with an [`FheProgram`](sunscreen_fhe_program::FheProgram).
     */
    IRError(sunscreen_fhe_program::Error),

    /**
     * An error occurred in the SEAL library.
     */
    SealError(seal_fhe::Error),

    /**
     * Tried to run an Fhe Program that requires relinearization keys, but didn't provide any.
     */
    MissingRelinearizationKeys,

    /**
     * Tried to run an Fhe Program that requires Galois keys, but didn't provide any.
     */
    MissingGaloisKeys,

    /**
     * Returned when:
     * * The wrong number of ciphertexts were provided as parameters to an Fhe Program.
     * * The wrong number of ciphertexts were returned from an Fhe Program.
     */
    IncorrectCiphertextCount,

    /**
     * An argument is incompatible with the parameters in the runtime.
     */
    ParameterMismatch,

    /**
     * The given arguments do not match the call signature of the FHE program.
     */
    ArgumentMismatch {
        /**
         * The arguments in the call signature of the FHE program.
         */
        expected: Vec<Type>,

        /**
         * The given arguments.
         */
        actual: Vec<Type>,
    },

    /**
     * The given return types do not match the FHE program interface.
     */
    ReturnMismatch {
        /**
         * The return types in the call signature of the FHE program.
         */
        expected: Vec<Type>,

        /**
         * The given return types.
         */
        actual: Vec<Type>,
    },

    /**
     * The given type does not match the expected.
     */
    TypeMismatch {
        /**
         * The expected type.
         */
        expected: Type,

        /**
         * The actual type.
         */
        actual: Type,
    },

    /**
     * The vector indicating the number of ciphertexts in the return types isn't the same length
     * as the signature's return type. Running valid FHE programs created by the Sunscreen compiler
     * should never produce this error.
     */
    ReturnTypeMetadataError,

    /**
     * Decryption failed because the cipher text had too much noise.
     */
    TooMuchNoise,

    /**
     * Executing an Fhe Program failed.
     */
    FheProgramRunError(crate::run::FheProgramRunFailure),

    /**
     * This variant wraps some error specific to the representation of FheTypes. For example,
     * a type encoding even numbers would return this if you pass an odd number.
     */
    FheTypeError(String),

    /**
     * Failed to deserialize bytes as a [`Params`](crate::Params) object.
     */
    ParamDeserializationError,

    /**
     * The given [`Plaintext`](crate::Plaintext) had no data.
     */
    NoPlaintextData,

    /**
     * The given [`Plaintext`](crate::Plaintext) had an incorrect array count.
     */
    MalformedPlaintext,

    /**
     * An error occurred when serializing/deserializing with bincode.
     */
    BincodeError(String),

    /**
     * Called [`inner_as_seal_plaintext`](crate::InnerPlaintext.inner_as_seal_plaintext)
     * on non-Seal plaintext.
     */
    NotASealPlaintext,
}

impl From<bincode::Error> for Error {
    fn from(err: bincode::Error) -> Self {
        Self::BincodeError(format!("{}", err))
    }
}

impl From<sunscreen_fhe_program::Error> for Error {
    fn from(err: sunscreen_fhe_program::Error) -> Self {
        Self::IRError(err)
    }
}

impl From<seal_fhe::Error> for Error {
    fn from(err: seal_fhe::Error) -> Self {
        Self::SealError(err)
    }
}

impl From<crate::run::FheProgramRunFailure> for Error {
    fn from(err: crate::run::FheProgramRunFailure) -> Self {
        Self::FheProgramRunError(err)
    }
}

/**
 * Wrapper around [`Result`](std::result::Result) with this crate's error type.
 */
pub type Result<T> = std::result::Result<T, Error>;
