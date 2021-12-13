#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

//! This crate contains the types and functions for executing a Sunscreen circuit
//! (i.e. an [`Circuit`](sunscreen_circuit::Circuit)).

mod args;
mod error;
mod keys;
mod metadata;
mod run;
mod runtime;

pub use crate::args::*;
pub use crate::error::*;
pub use crate::keys::*;
pub use crate::metadata::*;
pub use run::*;
pub use runtime::*;

use seal::Plaintext as SealPlaintext;
use serde::Serialize;

#[derive(Debug, Serialize)]
/**
 * The underlying backend implementation of a plaintext (e.g. SEAL's [`Plaintext`](seal::Plaintext)).
 */
pub enum InnerPlaintext {
    /**
     * This plaintext wraps a SEAL [`Plaintext`](seal::Plaintext).
     */
    Seal(SealPlaintext),

    /**
     * Not used, but allows you to use _ in match statements without warning.
     */
    Unused,
}

#[derive(Debug, Serialize)]
/**
 * Represents an encoded plaintext suitable for use in the underlying scheme.
 */
pub struct Plaintext {
    /**
     * The scheme parameters under which this plaintext was created.
     */
    pub params: Params,

    /**
     * The scheme and backend-specific plaintext.
     */
    pub inner: InnerPlaintext,
}

impl Plaintext {
    /**
     * Creates a new plaintext. Moves the given [`InnerPlaintext`] and [`Params`].
     */
    pub fn new(inner: InnerPlaintext, params: Params) -> Self {
        Self { inner, params }
    }
}

/**
 * This trait denotes one may attempt to turn this type into a plaintext.
 */
pub trait TryIntoPlaintext {
    /**
     * Attempts to turn this type into a [`Plaintext`].
     */
    fn try_into_plaintext(&self, params: &Params) -> Result<Vec<Plaintext>>;
}

/**
 * This trait specifies one may attempt to convert a plaintext into this type.
 */
pub trait TryFromPlaintext
where
    Self: Sized,
{
    /**
     * Attempts to turn a [`Plaintext`] into `Self`. On success, returns
     */
    fn try_from_plaintext<I>(plaintexts: &mut I) -> Result<Self>
    where
        I: Iterator<Item = Plaintext>;
}

/**
 * Denotes the given rust type is an encoding in an FHE scheme
 */
pub trait FheType: TypeNameInstance + TryIntoPlaintext {}

/**
 * Denotes the given type is valid under the BFV scheme.
 */
pub trait BfvType: FheType {}

/**
 * A trait the gives a name an version to a given type
 */
pub trait TypeName {
    /**
     * Returns the [`Type`] of the `&self`. Lives only on the instance so you can be object-safe
     * for use in `dyn TypeName`.
     */
    fn type_name() -> Type;
}

/**
 * A trait the gives a name an version to a given type
 */
pub trait TypeNameInstance {
    /**
     * Returns the [`Type`] of the `&self`. Lives only on the instance so you can be object-safe
     * for use in `dyn TypeName`.
     */
    fn type_name_instance(&self) -> Type;
}
