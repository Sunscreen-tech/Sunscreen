#[cfg(feature = "bulletproofs")]
pub mod bulletproofs;

mod error;
mod exec;
mod jit;

use std::ops::{Add, Deref, Mul, Sub};

pub use crypto_bigint::UInt;
use crypto_bigint::U512;
pub use error::*;
pub use exec::ExecutableZkpProgram;
pub use jit::{jit, CompiledZkpProgram, Operation};
use serde::{Deserialize, Serialize};

// Converting between U512 and backend numeric types requires an
// assumption about endianess. We require little endian for now unless
// there's demand for carefully writing endian-aware code.
#[cfg(not(target_endian = "little"))]
compile_error!("This crate currently requires a little endian target architecture.");

pub trait Node {}

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

impl<T> From<T> for BigInt
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

    fn jit(&self, prog: &CompiledZkpProgram) -> Result<ExecutableZkpProgram>;
}

pub trait BackendField: Add + Sub + Mul + Clone + TryFrom<BigInt> {}
