#[cfg(feature = "bulletproofs")]
pub mod bulletproofs;

mod error;

use std::any::Any;

pub use crypto_bigint::UInt;
use crypto_bigint::U512;
pub use error::*;
use sunscreen_compiler_common::{CompilationResult, Operation as OperationTrait};

// Converting between U512 and backend numeric types requires an
// assumption about endianess. We require little endian for now unless
// there's demand for carefully writing endian-aware code.
#[cfg(not(target_endian = "little"))]
compile_error!("This crate currently requires a little endian target architecture.");

pub trait Node {}

pub type Proof = dyn Any;

pub trait FieldValue {}

type BigInt = U512;

pub trait ZkpProverBackend {
    fn prove(graph: &ZkpBackendCompilationResult, inputs: &[BigInt]) -> Result<Box<Proof>>;
}

pub trait ZkpVerifierBackend {
    fn verify(graph: &ZkpBackendCompilationResult, proof: Box<Proof>) -> Result<()>;
}

#[derive(Debug, Clone, Copy, Hash, PartialEq, Eq)]
pub enum Operation {
    Input(usize),

    Add,

    Mul,

    Sub,

    Neg,

    Constraint(BigInt),
}

impl OperationTrait for Operation {
    fn is_binary(&self) -> bool {
        matches!(self, Operation::Add | Operation::Sub | Operation::Mul)
    }

    fn is_commutative(&self) -> bool {
        matches!(self, Operation::Add | Operation::Mul)
    }

    fn is_unary(&self) -> bool {
        matches!(self, Operation::Neg)
    }

    fn is_unordered(&self) -> bool {
        matches!(self, Operation::Constraint(_))
    }
}

pub type ZkpBackendCompilationResult = CompilationResult<Operation>;
