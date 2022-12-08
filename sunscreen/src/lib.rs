#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

//! This crate contains the frontend compiler for Sunscreen [`fhe_program`] and the types and
//! algorithms that support it.
//!
//! # Examples
//! This example is further annotated in `examples/simple_multiply`.
//! ```
//! # use sunscreen::{fhe_program, Compiler, types::{bfv::Signed, Cipher}, PlainModulusConstraint, Params, Runtime};
//!
//! #[fhe_program(scheme = "bfv")]
//! fn simple_multiply(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
//!     a * b
//! }
//!
//! fn main() {
//!   let app = Compiler::new()
//!       .fhe_program(simple_multiply)
//!       .plain_modulus_constraint(PlainModulusConstraint::Raw(600))
//!       .additional_noise_budget(5)
//!       .compile()
//!       .unwrap();
//!
//!   let runtime = Runtime::new_fhe(app.params()).unwrap();
//!
//!   let (public_key, private_key) = runtime.generate_keys().unwrap();
//!
//!   let a = runtime.encrypt(Signed::from(15), &public_key).unwrap();
//!   let b = runtime.encrypt(Signed::from(5), &public_key).unwrap();
//!
//!   let results = runtime.run(app.get_fhe_program(simple_multiply).unwrap(), vec![a, b], &public_key).unwrap();
//!
//!   let c: Signed = runtime.decrypt(&results[0], &private_key).unwrap();
//!
//!   assert_eq!(c, 75.into());
//! }
//! ```
//!

mod compiler;
mod error;
/**
 * This module contains types used internally when compiling
 * [`fhe_program`]s.
 */
pub mod fhe;
mod params;
mod zkp;

/**
 * This module contains types used during [`fhe_program`] construction.
 *
 * * The [`crate::types::bfv`] module contains data types used for
 * BFV [`fhe_program`] inputs and outputs.
 * * The [`crate::types::intern`] module contains implementation details needed
 * for [`fhe_program`] construction. You shouldn't need to use these, as the `#[fhe_program]`
 * macro will automatically insert them for you as needed.
 *
 * The root of the module contains:
 * * [`Cipher`](crate::types::Cipher) is a parameterized type used to
 * denote an [`fhe_program`] input parameter as encrypted.
 */
pub mod types;

use fhe::{FheOperation, Literal};
use petgraph::stable_graph::StableGraph;
use serde::{Deserialize, Serialize};
use sunscreen_runtime::{marker, Fhe, FheZkp, Zkp};
use sunscreen_zkp_backend::CompiledZkpProgram;

use std::cell::RefCell;
use std::collections::HashMap;
use std::marker::PhantomData;

pub use compiler::{Compiler, FheProgramFn};
pub use error::{Error, Result};
pub use params::PlainModulusConstraint;
pub use seal_fhe::Plaintext as SealPlaintext;
pub use sunscreen_compiler_macros::*;
pub use sunscreen_fhe_program::{SchemeType, SecurityLevel};
pub use sunscreen_runtime::{
    CallSignature, Ciphertext, CompiledFheProgram, Error as RuntimeError, FheProgramInput,
    FheProgramInputTrait, FheProgramMetadata, FheRuntime, FheZkpRuntime, InnerCiphertext,
    InnerPlaintext, Params, Plaintext, PrivateKey, PublicKey, RequiredKeys, Runtime, WithContext,
    ZkpRuntime,
};
pub use zkp::ZkpProgramFn;
pub use zkp::{
    invoke_gadget, with_zkp_ctx, ZkpContext, ZkpData, ZkpFrontendCompilation, CURRENT_ZKP_CTX,
};

#[derive(Clone)]
/**
 * The outcome of successful compilation. Contains one or more [`CompiledFheProgram`].
 */
pub struct Application<T> {
    fhe_programs: HashMap<String, CompiledFheProgram>,
    zkp_programs: HashMap<String, CompiledZkpProgram>,
    _phantom: PhantomData<T>,
}

impl Application<()> {
    /**
     * Constructs a new Application from the given HashMap of programs. The
     * keys of this contain FHE program names and the values are the
     * compiled FHE programs.
     *
     * # Remarks
     * The programs [`HashMap`] must contain at least 1 program or this
     * function will return [`Error::NoPrograms`].
     *
     * You should generally not call this function
     * It is an implementation detail of compilation.
     */
    pub(crate) fn new(
        fhe_programs: HashMap<String, CompiledFheProgram>,
        zkp_programs: HashMap<String, CompiledZkpProgram>,
    ) -> Result<Self> {
        if fhe_programs.is_empty() && zkp_programs.is_empty() {
            return Err(Error::NoPrograms);
        }

        Ok(Self {
            fhe_programs,
            zkp_programs,
            _phantom: PhantomData,
        })
    }
}

impl<T> Application<T>
where
    T: marker::Fhe,
{
    /**
     * Returns the [`Params`] suitable for running each contained [`CompiledFheProgram`].
     * These parameters were chosen during compilation.
     *
     * # Remarks
     * If no [`fhe_program`] was specified, this function returns [`None`].
     */
    pub fn params(&self) -> &Params {
        &self.fhe_programs.values().next().unwrap().metadata.params
    }

    #[deprecated]
    /**
     * Gets the [`CompiledFheProgram`] with the given name or [`None`] if not present.
     */
    pub fn get_program<N>(&self, name: N) -> Option<&CompiledFheProgram>
    where
        N: AsRef<str>,
    {
        self.get_fhe_program(name)
    }

    /**
     * Gets the [`CompiledFheProgram`] with the given name or [`None`] if not present.
     */
    pub fn get_fhe_program<N>(&self, name: N) -> Option<&CompiledFheProgram>
    where
        N: AsRef<str>,
    {
        self.fhe_programs.get(name.as_ref())
    }

    #[deprecated]
    /**
     * Returns an iterator over all the compiled programs.
     *
     * # Deprecated
     * Please use [`get_fhe_programs`](Self::get_fhe_programs) instead.
     */
    pub fn get_programs(&self) -> impl Iterator<Item = (&String, &CompiledFheProgram)> {
        self.get_fhe_programs()
    }

    /**
     * Returns an iterator over all the compiled programs.
     */
    pub fn get_fhe_programs(&self) -> impl Iterator<Item = (&String, &CompiledFheProgram)> {
        self.fhe_programs.iter()
    }
}

impl<T> Application<T>
where
    T: marker::Zkp,
{
    /**
     * Returns the [`CompiledZkpProgram`] with the given name
     * or [`None`] if not present.
     */
    pub fn get_zkp_program<N>(&self, name: N) -> Option<&CompiledZkpProgram>
    where
        N: AsRef<str>,
    {
        self.zkp_programs.get(name.as_ref())
    }

    /**
     * Returns an iterator over all [`CompiledZkpProgram`]s.
     */
    pub fn get_zkp_programs(&self) -> impl Iterator<Item = (&String, &CompiledZkpProgram)> {
        self.zkp_programs.iter()
    }
}

impl<T> Application<T> {
    pub(crate) fn convert<U>(self) -> Application<U> {
        Application {
            fhe_programs: self.fhe_programs,
            zkp_programs: self.zkp_programs,
            _phantom: PhantomData,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
/**
 * Information about an edge in the frontend IR.
 */
pub enum OperandInfo {
    /**
     * This edge serves as the left operand to the destination node.
     */
    Left,

    /**
     * This edge serves as the right operand to the destination node.
     */
    Right,

    /**
     * This edge serves as the single operand to the destination node.
     */
    Unary,
}

/**
 * This trait specifies a type as being able to be used as an input or output of an [`fhe_program`].
 */
pub trait Value {
    /**
     * Creates an instance and adds it to the graph in the thread-local IR context.
     */
    fn new() -> Self;

    /**
     * Add a output node to the current IR context.
     */
    fn output(&self) -> Self;
}

#[derive(Clone, Debug, Deserialize, Serialize)]
/**
 * Contains the frontend compilation graph.
 */
pub struct FrontendCompilation {
    /**
     * The dependency graph of the frontend's intermediate representation (IR) that backs an [`fhe_program`].
     */
    pub graph: StableGraph<FheOperation, OperandInfo>,
}

thread_local! {
    /**
     * An arena containing slices of indicies. An implementation detail of the
     * [`fhe_program`] macro.
     */
    pub static INDEX_ARENA: RefCell<bumpalo::Bump> = RefCell::new(bumpalo::Bump::new());
}

/**
 * An application with FHE programs.
 */
pub type FheApplication = Application<Fhe>;

/**
 * An application with ZKP programs.
 */
pub type ZkpApplication = Application<Zkp>;

/**
 * An application with FHE and ZKP programs.
 */
pub type FheZkpApplication = Application<FheZkp>;
