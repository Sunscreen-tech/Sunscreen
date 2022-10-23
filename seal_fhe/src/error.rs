use std::fmt::Display;
use std::os::raw::c_long;

use crate::bindgen::{
    COR_E_INVALIDOPERATION, COR_E_IO, E_INVALIDARG, E_OK, E_OUTOFMEMORY, E_POINTER, E_UNEXPECTED,
};

/**
 * A type representing all errors that can occur in SEAL.
 */
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Error {
    /// No error
    Ok,

    /// An argument is invalid
    InvalidArgument,

    /// A pointer is invalid. When using the rust bindings, encountering this error is a bug.
    InvalidPointer,

    /// The machine ran out of memory.
    OutOfMemory,

    /// An unknown error occurred in SEAL.
    Unexpected,

    /// An internal invariant was violated.
    InternalError(c_long),

    /// An unknown error occurred in SEAL.
    Unknown(c_long),

    /// User failed to set a polynomial degree.
    DegreeNotSet,

    /// User failed to set a coefficient modulus.
    CoefficientModulusNotSet,

    /// User failed to set a plaintext modulus.
    PlainModulusNotSet,

    /// Serialization failed.
    SerializationError(String),
}

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

impl Display for Error {
    fn fmt(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            Error::SerializationError(s) => formatter.write_str(s),
            _ => formatter.write_str(&format!("{:?}", self)),
        }
    }
}

impl std::error::Error for Error {}

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
