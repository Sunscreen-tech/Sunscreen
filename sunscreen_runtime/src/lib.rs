#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

//! This crate contains the types and functions for executing a Sunscreen FHE or ZKP program.

mod array;
mod builder;
mod error;
mod keys;
#[cfg(feature = "linkedproofs")]
mod linked;
mod metadata;
mod run;
mod runtime;
mod serialization;

use std::{ops::Deref, sync::Arc};

use seal_fhe::{Ciphertext as SealCiphertext, Plaintext as SealPlaintext};
use serde::{Deserialize, Serialize};
use sunscreen_zkp_backend::BigInt;

pub use builder::*;
pub use error::*;
pub use keys::*;
#[cfg(feature = "linkedproofs")]
pub use linked::*;
pub use metadata::*;
pub use run::*;
pub use runtime::*;
pub use serialization::WithContext;

#[derive(Debug, Clone, PartialEq, Hash, Serialize, Deserialize, Eq)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

impl InnerCiphertext {
    /**
     * Unwraps the enum and returns the underlying seal ciphertexts, or
     * returns an error if this ciphertext isn't a Seal ciphertext.
     */
    pub fn as_seal_ciphertext(&self) -> Result<&[WithContext<SealCiphertext>]> {
        match self {
            Self::Seal(d) => Ok(d),
        }
    }
}

#[derive(Clone, Deserialize, Serialize)]
/**
 * A typed variant of [`Ciphertext`].
 */
// TODO: possibly restrict T: FheType
pub struct Cipher<T> {
    /// The inner ciphertext
    pub inner: Ciphertext,
    _marker: std::marker::PhantomData<T>,
}

impl<T> Deref for Cipher<T> {
    type Target = Ciphertext;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl<T> Cipher<T> {
    pub(crate) fn new(inner: Ciphertext) -> Cipher<T> {
        Self {
            inner,
            _marker: std::marker::PhantomData,
        }
    }
}

impl<T: TypeName> Cipher<T> {
    /// Cast a [`Ciphertext`] to a typed [`Cipher<T>`]. Returns an error if the underlying
    /// ciphertext datatype does not match `T`.
    pub fn cast(ciphertext: Ciphertext) -> Result<Cipher<T>> {
        let expected_type = Type {
            is_encrypted: true,
            ..T::type_name()
        };
        if expected_type != ciphertext.data_type {
            Err(Error::type_mismatch(&expected_type, &ciphertext.data_type))
        } else {
            Ok(Self {
                inner: ciphertext,
                _marker: std::marker::PhantomData,
            })
        }
    }
}

impl<T> NumCiphertexts for Cipher<T>
where
    T: NumCiphertexts,
{
    const NUM_CIPHERTEXTS: usize = T::NUM_CIPHERTEXTS;
}

impl<T> TypeName for Cipher<T>
where
    T: FheType + TypeName,
{
    fn type_name() -> Type {
        Type {
            is_encrypted: true,
            ..T::type_name()
        }
    }
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

impl Ciphertext {
    /**
     * Unwraps the inner ciphertext as a Seal ciphertext variant. Returns an
     * error if the inner ciphertext is not a Seal ciphertext.
     */
    pub fn inner_as_seal_ciphertext(&self) -> Result<&[WithContext<SealCiphertext>]> {
        self.inner.as_seal_ciphertext()
    }
}

/**
 * A trait that denotes this type can be used as an
 * argument to an FHE program.
 */
pub trait FheProgramPlaintextInput: TryIntoPlaintext + TypeNameInstance {}

/// A trait that denotes this type can be used as a ciphertext argument to an FHE program.
pub trait FheProgramCiphertextInput: IntoCiphertext {}

/**
 * An input argument to an Fhe Program. See [`crate::Runtime::run`].
 */
pub enum FheProgramInput {
    /**
     * The argument is a ciphertext.
     */
    Ciphertext(Box<dyn FheProgramCiphertextInput>),

    /**
     * The argument is a plaintext.
     */
    Plaintext(Box<dyn FheProgramPlaintextInput>),
}

impl<T: FheProgramCiphertextInput + 'static> From<T> for FheProgramInput {
    fn from(value: T) -> Self {
        Self::Ciphertext(Box::new(value))
    }
}

// Without specialization, can't have two blanket impls, so provide:
/// A macro to cover the boilerplate for implementing `Into<FheProgramInput>` for a plaintext
/// type.`
#[macro_export]
macro_rules! impl_into_fhe_program_plaintext_input {
    ($t:ty) => {
        impl From<$t> for sunscreen::FheProgramInput {
            fn from(value: $t) -> Self {
                Self::Plaintext(Box::new(value))
            }
        }
    };
}

/**
 * Denotes this type can be used as an input to a ZKP
 * program.
 */
pub trait ZkpProgramInputTrait: ToNativeFields + TypeNameInstance {}

impl<T: ToNativeFields + TypeNameInstance> ZkpProgramInputTrait for T {}

#[derive(Clone)]
/**
 * An input argument to a ZKP program.
 */
pub struct ZkpProgramInput(pub Arc<dyn ZkpProgramInputTrait>);

impl<T> From<T> for ZkpProgramInput
where
    T: ZkpProgramInputTrait + 'static,
{
    fn from(val: T) -> Self {
        Self(Arc::new(val))
    }
}

impl TypeNameInstance for ZkpProgramInput {
    fn type_name_instance(&self) -> Type {
        self.0.type_name_instance()
    }
}

impl TypeNameInstance for FheProgramInput {
    fn type_name_instance(&self) -> Type {
        match self {
            Self::Ciphertext(c) => c.into_ciphertext().data_type.type_name_instance(),
            Self::Plaintext(p) => p.type_name_instance(),
        }
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

impl TryIntoPlaintext for Plaintext {
    fn try_into_plaintext(&self, _params: &Params) -> Result<Plaintext> {
        Ok(self.clone())
    }
}

/// This trait dentoes one may attempt to turn this type into a ciphertext.
#[allow(clippy::wrong_self_convention)]
pub trait IntoCiphertext {
    /// Attempts to convert this type into a [`Ciphertext`].
    fn into_ciphertext(&self) -> Ciphertext;
}

impl IntoCiphertext for Ciphertext {
    fn into_ciphertext(&self) -> Ciphertext {
        self.clone()
    }
}

impl<T> IntoCiphertext for Cipher<T> {
    fn into_ciphertext(&self) -> Ciphertext {
        self.inner.clone()
    }
}

impl FheProgramCiphertextInput for Ciphertext {}
impl<T> FheProgramCiphertextInput for Cipher<T> {}

/**
 * A trait for converting values into fields used by ZKPs.
 */
pub trait ToNativeFields {
    /**
     * Converts the given value into [`BigInt`]s.
     *
     * # Remarks
     * The length of the returned vector must equal NUM_NATIVE_FIELD_ELEMENTS.
     */
    fn to_native_fields(&self) -> Vec<BigInt>;
}

impl<T, const N: usize> ToNativeFields for [T; N]
where
    T: ToNativeFields,
{
    fn to_native_fields(&self) -> Vec<sunscreen_zkp_backend::BigInt> {
        self.iter().flat_map(|x| x.to_native_fields()).collect()
    }
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
    TypeNameInstance + TryIntoPlaintext + TryFromPlaintext + FheProgramPlaintextInput + NumCiphertexts
{
}

/**
 * Denotes the given type is valid under the BFV scheme.
 */
pub trait BfvType: FheType {}

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

// Useful impl if you are aggregating a list of various types.
impl TypeNameInstance for Type {
    fn type_name_instance(&self) -> Type {
        self.clone()
    }
}
