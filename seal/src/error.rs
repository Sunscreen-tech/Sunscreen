use std::os::raw::c_long;

use crate::bindgen::{
    COR_E_INVALIDOPERATION, COR_E_IO, E_INVALIDARG, E_OK, E_OUTOFMEMORY, E_POINTER, E_UNEXPECTED,
};

#[derive(Debug, Copy, Clone)]
pub enum Error {
    Ok,
    InvalidArgument,
    InvalidPointer,
    OutOfMemory,
    Unexpected,
    InternalError(i64),
    Unknown(i64),
    DegreeNotSet,
    CoefficientModulusNotSet,
    PlainModulusNotSet,
}

impl From<c_long> for Error {
    fn from(err: c_long) -> Self {
        match err {
            E_OK => Error::Ok,
            E_POINTER => Error::InvalidPointer,
            E_INVALIDARG => Error::InvalidArgument,
            E_OUTOFMEMORY => Error::OutOfMemory,
            E_UNEXPECTED => Error::Unexpected,
            COR_E => Error::InternalError(err),
            COR_E_INVALIDOPERATION => Error::InternalError(err),
            _ => Error::Unknown(err),
        }
    }
}

pub fn convert_seal_error(err: c_long) -> Result<(), Error> {
    if err == E_OK {
        Ok(())
    } else {
        Err(Error::from(err))
    }
}
