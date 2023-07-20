use crate::BigInt;
use sunscreen_compiler_common::{CompilationResult, Operation as OperationTrait};

#[derive(Debug, Clone, Copy, Hash, PartialEq, Eq)]
pub enum Operation {
    Input(usize),

    /**
     * A hidden input. When running the prover's algorithm, this will
     * be [`Some`]. Otherwise [`None`].
     */
    HiddenInput(Option<BigInt>),

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

    fn is_ordered(&self) -> bool {
        false
    }

    fn is_multiplication(&self) -> bool {
        matches!(self, Operation::Mul)
    }
}

/**
 * A ZKP program that has been JIT'd and is ready for use in a ZKP backend.
 */
pub type ExecutableZkpProgram = CompilationResult<Operation>;
