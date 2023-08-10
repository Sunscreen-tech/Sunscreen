use std::os::raw::c_long;

use static_assertions::const_assert;

use crate::bindgen::{
    COR_E_INVALIDOPERATION, COR_E_IO, E_INVALIDARG, E_OK, E_OUTOFMEMORY, E_POINTER, E_UNEXPECTED,
};

/**
 * A type representing all errors that can occur in SEAL.
 */
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum Error {
    /// No error
    #[error("The operation completed successfully")]
    Ok,

    /// An argument is invalid
    #[error("The argument is not valid")]
    InvalidArgument,

    /// A pointer is invalid. When using the rust bindings, encountering this error is a bug.
    #[error("Invalid pointer")]
    InvalidPointer,

    /// The machine ran out of memory.
    #[error("Out of memory")]
    OutOfMemory,

    /// An unknown error occurred in SEAL.
    #[error("Unexpected")]
    Unexpected,

    /// An internal invariant was violated.
    #[error("Internal error {0}")]
    InternalError(c_long),

    /// An unknown error occurred in SEAL.
    #[error("Unknown {0}")]
    Unknown(c_long),

    /// User failed to set a polynomial degree.
    #[error("Polynomial degree not set")]
    DegreeNotSet,

    /// User failed to set a coefficient modulus.
    #[error("Coefficient modulus not set")]
    CoefficientModulusNotSet,

    /// User failed to set a plaintext modulus.
    #[error("Plain modulus not set")]
    PlainModulusNotSet,

    /// User failed to set a coefficient modulus.
    #[error("Cannot reduce the modulus from a set size of 1 to 0")]
    ModulusChainTooSmall,

    /// Serialization failed.
    #[error("Serialization failed {0}")]
    SerializationError(Box<String>),
}

const_assert!(std::mem::size_of::<Error>() <= 16);

impl From<c_long> for Error {
    fn from(err: c_long) -> Self {
        match err {
            E_OK => Error::Ok,
            E_POINTER => Error::InvalidPointer,
            E_INVALIDARG => Error::InvalidArgument,
            E_OUTOFMEMORY => Error::OutOfMemory,
            E_UNEXPECTED => Error::Unexpected,
            COR_E_IO => Error::InternalError(err),
            COR_E_INVALIDOPERATION => Error::InternalError(err),
            _ => Error::Unknown(err),
        }
    }
}

/**
 * `type Result<T> = std::result::Result<T, Error>;`.
 */
pub type Result<T> = std::result::Result<T, Error>;

pub fn convert_seal_error(err: c_long) -> Result<()> {
    if err == E_OK {
        Ok(())
    } else {
        Err(Error::from(err))
    }
}
