#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

//! This crate contains the types and functions for executing a Sunscreen FHE program
//! (i.e. an [`FheProgram`](sunscreen_fhe_program::FheProgram)).

mod array;
mod error;
mod keys;
mod metadata;
mod run;
mod runtime;
mod serialization;

pub use crate::error::*;
pub use crate::keys::*;
pub use crate::metadata::*;
pub use run::*;
pub use runtime::*;
pub use serialization::WithContext;

use seal_fhe::{Ciphertext as SealCiphertext, Plaintext as SealPlaintext};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
/**
 * The underlying backend implementation of a plaintext (e.g. SEAL's [`Plaintext`](seal_fhe::Plaintext)).
 */
pub enum InnerPlaintext {
    /**
     * This plaintext wraps a SEAL [`Plaintext`](seal_fhe::Plaintext).
     */
    Seal(Vec<WithContext<SealPlaintext>>),
}

impl InnerPlaintext {
    /**
     * Returns how many plaintexts are inside this wrapper.
     */
    pub fn len(&self) -> usize {
        match self {
            Self::Seal(d) => d.len(),
        }
    }

    /**
     * Returns whether or not there are any plaintexts inside this wrapper.
     */
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /**
     * Decompose the N plaintexts inside this wrapper into N wrappers
     * with 1 plaintext each. Useful for creating plaintext constants
     * in FHE programs.
     */
    pub fn scatter(&self) -> Vec<InnerPlaintext> {
        match self {
            Self::Seal(d) => d.iter().map(|p| Self::Seal(vec![p.clone()])).collect(),
        }
    }

    /**
     * Serialize this object into bytes.
     *
     * # Remarks
     * This function internally uses bincode for serialization.
     */
    pub fn to_bytes(&self) -> Result<Vec<u8>> {
        Ok(bincode::serialize(&self)?)
    }

    /**
     * Deserialize an inner plaintext object from bytes.
     *
     * # Remarks
     * This function internally uses bincode for serialization.
     */
    pub fn from_bytes(data: &[u8]) -> Result<Self> {
        Ok(bincode::deserialize(data)?)
    }

    /**
     * Unwraps the enum and returns the underlying seal plaintexts, or
     * returns an error if this plaintext isn't a Seal plaintext.
     */
    pub fn as_seal_plaintext(&self) -> Result<&[WithContext<SealPlaintext>]> {
        match self {
            Self::Seal(d) => Ok(d),
        }
    }
}

#[derive(Clone)]
/**
 * A type that can be either a SEAL plaintext or a ciphertext.
 */
pub enum SealData {
    /**
     * The underlying ciphertext.
     */
    Ciphertext(SealCiphertext),

    /**
     * The underlying plaintext.
     */
    Plaintext(SealPlaintext),
}

impl From<SealCiphertext> for SealData {
    fn from(val: SealCiphertext) -> Self {
        Self::Ciphertext(val)
    }
}

impl From<SealPlaintext> for SealData {
    fn from(val: SealPlaintext) -> Self {
        Self::Plaintext(val)
    }
}

#[derive(Clone, Serialize, Deserialize)]
/**
 * Represents an encoded plaintext suitable for use in the underlying scheme.
 */
pub struct Plaintext {
    /**
     * The data type contained in this ciphertext. Note, this type metadata is stored in the clear.
     */
    pub data_type: Type,

    /**
     * The scheme and backend-specific plaintext.
     */
    pub inner: InnerPlaintext,
}

impl Plaintext {
    /**
     * Unwraps the inner plaintext as a Seal plaintext variant. Returns an
     * error if the inner plaintext is not a Seal plaintext.
     */
    pub fn inner_as_seal_plaintext(&self) -> Result<&[WithContext<SealPlaintext>]> {
        self.inner.as_seal_plaintext()
    }
}

#[derive(Clone, Deserialize, Serialize)]
/**
 * The underlying backend implementation of a ciphertext (e.g SEAL's [`Ciphertext`](seal_fhe::Ciphertext)).
 */
pub enum InnerCiphertext {
    /**
     * A set of ciphertexts in SEAL's runtime.
     */
    Seal(Vec<WithContext<SealCiphertext>>),
}

#[derive(Clone, Deserialize, Serialize)]
/**
 * An encryption of the given data type. Note, the data type is
 * stored in plaintext and is considered part of Sunscreen's runtime
 * protocol.
 */
pub struct Ciphertext {
    /**
     * The data type contained in this ciphertext. Note, this type metadata is stored in the clear.
     */
    pub data_type: Type,

    /**
     * The scheme and backend-specific plaintext.
     */
    pub inner: InnerCiphertext,
}

/**
 * A trait that denotes this type can be used as an
 * argument to an FHE program.
 */
pub trait FheProgramInputTrait: TryIntoPlaintext + TypeNameInstance {}

/**
 * An input argument to an Fhe Program. See [`crate::Runtime::run`].
 */
pub enum FheProgramInput {
    /**
     * The argument is a ciphertext.
     */
    Ciphertext(Ciphertext),

    /**
     * The argument is a plaintext.
     */
    Plaintext(Box<dyn FheProgramInputTrait>),
}

impl TypeNameInstance for FheProgramInput {
    fn type_name_instance(&self) -> Type {
        match self {
            Self::Ciphertext(c) => c.data_type.clone(),
            Self::Plaintext(p) => p.type_name_instance(),
        }
    }
}

impl From<Ciphertext> for FheProgramInput {
    fn from(val: Ciphertext) -> Self {
        Self::Ciphertext(val)
    }
}

impl<T> From<T> for FheProgramInput
where
    T: FheProgramInputTrait + 'static,
{
    fn from(val: T) -> Self {
        Self::Plaintext(Box::new(val))
    }
}

/**
 * This trait denotes one may attempt to turn this type into a plaintext.
 */
pub trait TryIntoPlaintext {
    /**
     * Attempts to turn this type into a [`Plaintext`].
     */
    fn try_into_plaintext(&self, params: &Params) -> Result<Plaintext>;
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
    fn try_from_plaintext(plaintext: &Plaintext, params: &Params) -> Result<Self>;
}

/**
 * Declare how many ciphertexts an FheType decomposes into. The runtime needs this
 * to correctly bundle return values from an Fhe Program.
 */
pub trait NumCiphertexts {
    /**
     * The number of ciphertexts this type decomposes into.
     */
    const NUM_CIPHERTEXTS: usize;
}

/**
 * Denotes the given rust type is an encoding in an FHE scheme
 */
pub trait FheType:
    TypeNameInstance + TryIntoPlaintext + TryFromPlaintext + FheProgramInputTrait + NumCiphertexts
{
}

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
