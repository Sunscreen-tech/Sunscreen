#[cfg(feature = "bulletproofs")]
pub mod bulletproofs;

mod error;
mod exec;
mod jit;

use std::{
    any::Any,
    ops::{Add, Deref, Mul, Neg, Sub},
};

pub use crypto_bigint::UInt;
use crypto_bigint::U512;
pub use error::*;
pub use exec::ExecutableZkpProgram;
pub use jit::{jit_prover, CompiledZkpProgram, Operation};
use petgraph::stable_graph::NodeIndex;
use serde::{Deserialize, Serialize};

// Converting between U512 and backend numeric types requires an
// assumption about endianess. We require little endian for now unless
// there's demand for carefully writing endian-aware code.
#[cfg(not(target_endian = "little"))]
compile_error!("This crate currently requires a little endian target architecture.");

/**
 * In ZKP circuits, it's often simpler for the prover to provide additional
 * inputs and prove they meet some criteria than to directly compute some
 * quantity. However, *something* must compute these additional inputs. Rather
 * than delegate this responsibility to the prover's application, we use
 * [`Gadget`]s.
 *
 * `Gadget`s bear some resemblance to a function call in programming
 * languages. They take `N` input values and compute `M` output values. These
 * outputs get assigned to the additional inputs. In addition to computing
 * these values, the `Gadget` describes the circuit to prove the hidden inputs
 * satisfy some constraints.
 *
 * # Remarks
 * Gadget methods seem to accept a superfluous `&self` argument. This serves
 * to ensure the trait is object-safe. Although legal, implementors generally
 * won't have data.
 *
 * # Example
 * Suppose we want to decompose a native field element `x` into 8-bit
 * unsigned binary. Directly computing this with e.g. Lagrange interpolation
 * is cost prohibitive because `x` lives in a very large field (e.g.
 * Bulletproofs Scalar values are O(2^255)).
 *
 * We instead ask the prover to simply provide the binary decomposition
 * and prove that it's correct. To do this, we create a gadget. Its
 * [`compute_inputs`](Gadget::compute_inputs) method directly computes the
 * decomposition with shifting and masking. Then, the
 * [`gen_circuit`](Gadget::gen_circuit) method defined a circuit that proves
 * the following:
 * * Each hidden input is a 0 or 1
 * * x == 2^7 * b_7 + 2^6 * b_6 ... 2^0 * b_0
 *
 * and outputs (b_0..b_7)
 */
pub trait Gadget: Any {
    /**
     * Create the subcircuit for this gadget.
     * * `gadget_inputs` are the node indices of the gadget inputs.
     * * `hidden_inputs` are the nodes of the gadget's hidden inputs.
     *
     * Returns the node indices of the gadget outputs.
     *
     * # Remarks
     * If the following aren't true, proving will fail with a `GadgetError`.
     * * The number of outputs must equal
     *   [`get_output_count()`](Gadget::get_output_count).
     */
    fn gen_circuit(
        &self,
        gadget_inputs: &[NodeIndex],
        hidden_inputs: &[NodeIndex],
    ) -> Vec<NodeIndex>;

    /**
     * Compute the values for each of the hidden inputs from the given
     * gadget inputs.
     *
     * * # Remarks
     * The number of returned hidden input values must equal
     * [`get_input_count()`](Gadget::get_input_count).
     */
    fn compute_inputs(&self, gadget_inputs: &[BigInt]) -> Vec<BigInt>;

    /**
     * Returns the expected number of outputs.
     */
    fn get_output_count(&self) -> usize;

    /**
     * Returns the expected number of gadget inputs.
     */
    fn get_gadget_input_count(&self) -> usize;

    /**
     * Returns the expected number of hidden inputs.
     */
    fn get_hidden_input_count(&self) -> usize;

    /**
     * The gadget's name used to implement Operation's [`Debug`] trait.
     */
    fn debug_name(&self) -> &'static str;
}

#[derive(Clone, Serialize, Deserialize)]
/**
 * An R1CS proof.
 */
pub enum Proof {
    #[cfg(feature = "bulletproofs")]
    /**
     * A Bulletproofs R1CS proof.
     */
    Bulletproofs(Box<bulletproofs::BulletproofsR1CSProof>),

    /**
     * A custom proof type provided by an external crate.
     */
    Custom { name: String, data: Vec<u8> },
}

pub trait FieldValue {}

#[derive(Debug, Clone, Copy, Hash, Eq, PartialEq)]
pub struct BigInt(U512);

impl<T> std::convert::From<T> for BigInt
where
    T: Into<U512>,
{
    fn from(x: T) -> Self {
        Self(x.into())
    }
}

impl Deref for BigInt {
    type Target = U512;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl BigInt {
    pub const fn from_words(val: [u64; 8]) -> Self {
        Self(U512::from_words(val))
    }

    pub const fn from_u32(val: u32) -> Self {
        Self(U512::from_u32(val))
    }

    pub fn from_be_hex(hex_str: &str) -> Self {
        Self(U512::from_be_hex(hex_str))
    }

    pub const ZERO: Self = Self(U512::ZERO);
}

pub trait ZkpBackend {
    fn prove(&self, graph: &ExecutableZkpProgram, inputs: &[BigInt]) -> Result<Proof>;

    fn verify(&self, graph: &ExecutableZkpProgram, proof: &Proof) -> Result<()>;

    fn jit_prover(
        &self,
        prog: &CompiledZkpProgram,
        public_inputs: &[BigInt],
        private_inputs: &[BigInt],
    ) -> Result<ExecutableZkpProgram>;

    fn jit_verifier(
        &self,
        prog: &CompiledZkpProgram,
        public_inputs: &[BigInt],
    ) -> Result<ExecutableZkpProgram>;
}

pub trait BackendField:
    Add<Self, Output = Self>
    + Sub<Self, Output = Self>
    + Mul<Self, Output = Self>
    + Neg<Output = Self>
    + Clone
    + TryFrom<BigInt, Error = Error>
    + ZkpInto<BigInt>
{
}

/**
 * See [`std::convert::From`]. This trait exists to avoid limitations
 * with foreign trait rules.
 */
pub trait ZkpFrom<T> {
    /**
     * See [`std::convert::From::from`].
     */
    fn from(val: T) -> Self;
}

/**
 * See [`std::convert::Into`]. This trait exists to avoid limitations
 * with foreign trait rules.
 */
pub trait ZkpInto<T> {
    /**
     * See [`std::convert::Into::into`].
     */
    fn into(self) -> T;
}

impl<T, U> ZkpInto<T> for U
where
    T: ZkpFrom<U>,
{
    fn into(self) -> T {
        T::from(self)
    }
}
