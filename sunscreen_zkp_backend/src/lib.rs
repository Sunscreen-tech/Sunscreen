#[cfg(feature = "bulletproofs")]
pub mod bulletproofs;

mod error;

use std::any::Any;

use crypto_bigint::{U512};
pub use error::*;
pub use crypto_bigint::UInt;
use sunscreen_compiler_common::{Operation as OperationTrait, CompilationResult};

pub trait Node {}

pub trait Proof: Any {}

pub trait FieldValue {}

type BigInt = U512;

pub trait ZkpProverBackend {
    fn prove(graph: ZkpBackendCompilationResult, inputs: &[BigInt]) -> Result<Box<dyn Proof>>;
}

pub trait ZkpVerifierBackend {
    fn verify(graph: &ZkpBackendCompilationResult, proof: Box<dyn Proof>) -> Result<()>;
}

#[derive(Debug, Clone, Copy, Hash, PartialEq, Eq)]
pub enum Operation {
    Input(usize),

    Add,

    Mul,

    Sub,

    Neg,

    Constraint(BigInt)
}

impl OperationTrait for Operation {
    fn is_binary(&self) -> bool {
        matches!(self, Operation::Add | Operation::Sub | Operation:: Mul)
    }

    fn is_commutative(&self) -> bool {
        matches!(self, Operation::Add | Operation::Mul)
    }

    fn is_unary(&self) -> bool {
        matches!(self, Operation::Neg)
    }
}

pub type ZkpBackendCompilationResult = CompilationResult<Operation>;