//! This crate provides wrappers for Micorosft's SEAL Homomorphic encryption library.

#![warn(missing_docs)]

extern crate link_cplusplus;

#[allow(dead_code)]
mod bindgen {
    use std::os::raw::c_long;

    include!(concat!(env!("OUT_DIR"), "/bindings.rs"));

    pub const E_OK: c_long = 0x0;
    pub const E_POINTER: c_long = 0x80004003;
    pub const E_INVALIDARG: c_long = 0x80070057;
    pub const E_OUTOFMEMORY: c_long = 0x8007000E;
    pub const E_UNEXPECTED: c_long = 0x8000FFFF;
    pub const COR_E_IO: c_long = 0x80131620;
    pub const COR_E_INVALIDOPERATION: c_long = 0x80131509;
}

mod serialization {
    #[repr(u8)]
    pub enum CompressionType {
        None = 0,
        ZLib = 1,
        ZStd = 2,
    }
}

mod context;
mod encryption_parameters;
mod error;
mod key_generator;
mod modulus;

pub use context::Context;
pub use encryption_parameters::*;
pub use error::{Error, Result};
pub use key_generator::KeyGenerator;
pub use modulus::{CoefficientModulus, Modulus, PlainModulus, SecurityLevel};
