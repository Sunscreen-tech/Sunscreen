//! TFHE low-level library

#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

#[macro_use]
mod dst;
pub use dst::OverlaySize;

/// Methods for iterating over data structures.
pub(crate) mod iteration;

/// The entities module contains the main data structures used in the library.
pub mod entities;

/// Higher level operations in TFHE such as programmable bootstrapping, keyswitching, etc.
pub mod ops;

/// Parameters that define a TFHE scheme.
pub mod params;
pub use params::*;

/// Math operations on various math primitives such as polynomials.
pub mod math;
pub use math::*;

mod macros;

/// Random number generation.
pub mod rand;
mod scratch;

/// A high-level API for interfacing with TFHE. Allocates, computes with and returns
/// objects as you would expect from a Rust API.
pub mod high_level;

/// Zero Knowledge proofs for TFHE.
#[cfg(feature = "logproof")]
pub mod zkp;

/// Container [`Error`] and [`Result`] types for this crate.
mod error;
pub use error::*;
