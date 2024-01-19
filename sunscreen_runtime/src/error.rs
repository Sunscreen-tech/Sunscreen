use static_assertions::const_assert;

use crate::Type;
use sunscreen_zkp_backend::Error as ZkpError;

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
/**
 * Represents an error that can occur in this crate.
 */
pub enum Error {
    /**
     * An issue with an [`FheProgram`](sunscreen_fhe_program::FheProgram).
     */
    #[error("The FHE program is malformed: {0}")]
    IRError(#[from] sunscreen_fhe_program::Error),

    /**
     * An error occurred in the SEAL library.
     */
    #[error("SEAL encountered an error {0}")]
    SealError(#[from] seal_fhe::Error),

    /**
     * Tried to run an Fhe Program that requires relinearization keys, but didn't provide any.
     */
    #[error("Relinearization keys were required, but not present")]
    MissingRelinearizationKeys,

    /**
     * Tried to run an Fhe Program that requires Galois keys, but didn't provide any.
     */
    #[error("Galois keys were required, but not present")]
    MissingGaloisKeys,

    /**
     * Returned when:
     * * The wrong number of ciphertexts were provided as parameters to an Fhe Program.
     * * The wrong number of ciphertexts were returned from an Fhe Program.
     */
    #[error("An incorrect number of ciphertexts were given to the FHE program")]
    IncorrectCiphertextCount,

    /**
     * An argument is incompatible with the parameters in the runtime.
     */
    #[error("The given value is incompatible with the context.")]
    ParameterMismatch,

    /**
     * The given arguments do not match the call signature of the FHE program.
     */
    #[error("Expected arguments {:#?}, got {:#?}", self.unwrap_argument_mismatch_data().0, self.unwrap_argument_mismatch_data().1)]
    ArgumentMismatch(Box<(Vec<Type>, Vec<Type>)>),

    /**
     * The given type does not match the expected.
     */
    #[error("Type mismatch, expected {:#?} found {:#?}", self.unwrap_type_mismatch_data().0, self.unwrap_type_mismatch_data().1)]
    TypeMismatch(Box<(Type, Type)>),

    /**
     * The vector indicating the number of ciphertexts in the return types isn't the same length
     * as the signature's return type. Running valid FHE programs created by the Sunscreen compiler
     * should never produce this error.
     */
    #[error("Data returned from FHE program doesn't match return signature")]
    ReturnTypeMetadataError,

    /**
     * Decryption failed because the cipher text had too much noise.
     */
    #[error("Too much noise")]
    TooMuchNoise,

    /**
     * Executing an Fhe Program failed.
     */
    #[error("Running FHE program failed {0}")]
    FheProgramRunError(#[from] crate::run::FheProgramRunFailure),

    /**
     * This variant wraps some error specific to the representation of FheTypes. For example,
     * a type encoding even numbers would return this if you pass an odd number.
     */
    #[error("Type encoding error: {0}")]
    FheTypeError(Box<String>),

    /**
     * Failed to deserialize bytes as a [`Params`](crate::Params) object.
     */
    #[error("Failed to deserialize parameters")]
    ParamDeserializationError,

    /**
     * The given [`Plaintext`](crate::Plaintext) had no data.
     */
    #[error("Plaintext has no data")]
    NoPlaintextData,

    /**
     * The given [`Plaintext`](crate::Plaintext) had an incorrect array count.
     */
    #[error("Plaintext is malformed")]
    MalformedPlaintext,

    /**
     * An error occurred when serializing/deserializing with bincode.
     */
    #[error("Bincode serialization failed: {0}")]
    BincodeError(Box<String>),

    /**
     * Called [`inner_as_seal_plaintext`](crate::InnerPlaintext.inner_as_seal_plaintext)
     * on non-Seal plaintext.
     */
    #[error("Not a SEAL plaintext")]
    NotASealPlaintext,

    /**
     * An error occurred when creating or verifying a proof.
     */
    #[error("ZKP error: {0}")]
    ZkpError(#[from] ZkpError),

    /**
     * An error occurred when building a proof or verification
     */
    #[error("ZKP builder error: {0}")]
    ZkpBuilderError(Box<String>),

    /**
     * Parameters not supported in the given context.
     *
     * SDLP only supports particular security level and lattice dimensions.
     */
    #[error("These parameters are not supported in this context")]
    UnsupportedParameters,
}

const_assert!(std::mem::size_of::<Error>() <= 24);

impl Error {
    /**
     * Create an [`Error::ArgumentMismatch`].
     */
    pub fn argument_mismatch(expected: &[Type], actual: &[Type]) -> Self {
        Self::ArgumentMismatch(Box::new((expected.to_owned(), actual.to_owned())))
    }

    /**
     * Create an [`Error::TypeMismatch`].
     */
    pub fn type_mismatch(expected: &Type, actual: &Type) -> Self {
        Self::TypeMismatch(Box::new((expected.clone(), actual.clone())))
    }

    /**
     * Create an [`Error::FheTypeError`].
     */
    pub fn fhe_type_error(msg: &str) -> Self {
        Self::FheTypeError(Box::new(msg.to_owned()))
    }

    /**
     * Create an [`Error::ZkpBuilderError`].
     */
    pub fn zkp_builder_error(msg: &str) -> Self {
        Self::ZkpBuilderError(Box::new(msg.to_owned()))
    }

    fn unwrap_argument_mismatch_data(&self) -> &(Vec<Type>, Vec<Type>) {
        match self {
            Self::ArgumentMismatch(d) => d,
            _ => panic!("Not an argument mismatch"),
        }
    }

    fn unwrap_type_mismatch_data(&self) -> &(Type, Type) {
        match self {
            Self::TypeMismatch(d) => d,
            _ => panic!("Not a type mismatch"),
        }
    }
}

impl From<bincode::Error> for Error {
    fn from(err: bincode::Error) -> Self {
        Self::BincodeError(Box::new(format!("{}", err)))
    }
}

/**
 * Wrapper around [`Result`](std::result::Result) with this crate's error type.
 */
pub type Result<T> = std::result::Result<T, Error>;
