use std::{any::Any, hash::Hash, sync::Arc, fmt::Debug, collections::HashMap};

use crate::{
    exec::{ExecutableZkpProgram, Operation as ExecOperation},
    BackendField, BigInt, Result, Gadget, Error,
};
use petgraph::stable_graph::NodeIndex;
use sunscreen_compiler_common::{CompilationResult, NodeInfo, Operation as OperationTrait, forward_traverse, GraphQuery};

#[derive(Clone)]
pub enum Operation {
    PrivateInput(usize),
    PublicInput(usize),
    HiddenInput(usize),

    InvokeGadget(Arc<dyn Gadget>),

    Add,

    Mul,

    Sub,

    Neg,

    Constraint(BigInt),

    Constant(BigInt),
}

impl Hash for Operation {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        match self {
            Self::PrivateInput(x) => {
                state.write_u8(0);
                state.write_usize(*x);
            },
            Self::PublicInput(x) => {
                state.write_u8(1);
                state.write_usize(*x);
            },
            Self::HiddenInput(x) => {
                state.write_u8(2);
                state.write_usize(*x);
            },
            Self::Constraint(x) => {
                state.write_u8(3);
                x.hash(state);
            },
            Self::Constant(x) => {
                state.write_u8(4);
                x.hash(state);
            },
            Self::InvokeGadget(g) => {
                state.write_u8(5);
                g.type_id().hash(state);
            },
            Self::Add => {
                state.write_u8(6)
            }
            Self::Sub => {
                state.write_u8(7)
            },
            Self::Mul => {
                state.write_u8(8)
            },
            Self::Neg => {
                state.write_u8(9)
            }
        }
    }
}

impl PartialEq for Operation {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Self::PrivateInput(x), Self::PrivateInput(y)) => { x == y },
            (Self::PublicInput(x), Self::PublicInput(y)) => { x == y },
            (Self::HiddenInput(x), Self::HiddenInput(y)) => { x == y },
            (Self::Constraint(x), Self::Constraint(y)) => { x == y },
            (Self::Constant(x), Self::Constant(y)) => { x == y },
            (Self::InvokeGadget(x), Self::InvokeGadget(y)) => {
                x.type_id() == y.type_id()
            },
            (Self::Add, Self::Add) => true,
            (Self::Sub, Self::Sub) => true,
            (Self::Mul, Self::Mul) => true,
            (Self::Neg, Self::Neg) => true,
            _ => false
        }
    }
}

impl Eq for Operation {}

impl Debug for Operation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::PrivateInput(x) => write!(f, "PrivateInput({x})"),
            Self::PublicInput(x) => write!(f, "PublicInput({x})"),
            Self::HiddenInput(x) => write!(f, "HiddenInput({x})"),
            Self::Constraint(x) => write!(f, "Constraint({x:#?})"),
            Self::Constant(x) => write!(f, "Constant({x:#?})"),
            Self::InvokeGadget(g) => write!(f, "InvokeGadget({})", g.debug_name()),
            Self::Add => write!(f, "Add"),
            Self::Sub => write!(f, "Sub"),
            Self::Mul => write!(f, "Mul"),
            Self::Neg => write!(f, "Neg")
        }
    }
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
 * Just in time compile a [`CompiledZkpProgram`] into an [`ExecutableZkpProgram`] for creating proofs.
 */
pub fn jit_prover<U>(prog: &CompiledZkpProgram, public_inputs: &[U], private_inputs: &[U]) -> Result<ExecutableZkpProgram>
where
    U: BackendField,
{
    let node_outputs: HashMap<NodeIndex, U> = HashMap::new();

    forward_traverse(prog, |query, id| {
        let node = query.get_node(id);


        Ok::<_, Error>(())
    })?;
    
    unimplemented!();
}

pub fn jit_verifier<U>(prog: &CompiledZkpProgram, public_inputs: &[U]) -> Result<ExecutableZkpProgram>
where
    U: BackendField,
{
    unimplemented!()
}