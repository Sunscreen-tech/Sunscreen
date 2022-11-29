use crate::BigInt;
use sunscreen_compiler_common::{CompilationResult, Operation as OperationTrait};

#[derive(Debug, Clone, Copy, Hash, PartialEq, Eq)]
pub enum Operation {
    Input(usize),

    Add,

    Mul,

    Sub,

    Neg,

    Constraint(BigInt),

    Constant(BigInt),
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

/**
 * A ZKP program that has been JIT'd and is ready for use in a ZKP backend.
 */
pub type ExecutableZkpProgram = CompilationResult<Operation>;
