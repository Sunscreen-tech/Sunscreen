use crate::{
    exec::{ExecutableZkpProgram, Operation as ExecOperation},
    BackendField, BigInt, Result,
};
use sunscreen_compiler_common::{CompilationResult, NodeInfo, Operation as OperationTrait};

#[derive(Debug, Clone, Copy, Hash, PartialEq, Eq)]
pub enum Operation {
    PrivateInput(usize),
    PublicInput(usize),

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
 * A ZKP program that has been through frontend compilation, but not yet
 * JIT'd.
 */
pub type CompiledZkpProgram = CompilationResult<Operation>;

/**
 * Just in time compile a [`CompiledZkpProgram`] into an [`ExecutableZkpProgram`]
 */
pub fn jit<U>(prog: &CompiledZkpProgram) -> Result<ExecutableZkpProgram>
where
    U: BackendField,
{
    let prog = prog.0.map(
        |_, n| {
            let operation = match n.operation {
                Operation::PrivateInput(x) => ExecOperation::Input(x),
                Operation::PublicInput(x) => ExecOperation::Input(x),
                Operation::Add => ExecOperation::Add,
                Operation::Sub => ExecOperation::Sub,
                Operation::Neg => ExecOperation::Neg,
                Operation::Mul => ExecOperation::Mul,
                Operation::Constraint(x) => ExecOperation::Constraint(x),
                Operation::Constant(x) => ExecOperation::Constant(x),
            };

            NodeInfo { operation }
        },
        |_, e| *e,
    );

    Ok(CompilationResult(prog))
}
