use std::fmt::Debug;

use petgraph::stable_graph::NodeIndex;
use sunscreen_compiler_common::{
    Context, FrontendCompilation, Operation as OperationTrait, Render,
};

#[derive(Clone, Copy, Debug, Hash, PartialEq, Eq)]
pub enum Operation {
    PrivateInput(NodeIndex),
    PublicInput(NodeIndex),
    HiddenInput(NodeIndex),
    Add,
    Sub,
    Mul,
    Neg,
}

impl OperationTrait for Operation {
    fn is_binary(&self) -> bool {
        matches!(self, Operation::Add | Operation::Mul | Operation::Sub)
    }

    fn is_commutative(&self) -> bool {
        matches!(self, Operation::Add | Operation::Mul)
    }

    fn is_unary(&self) -> bool {
        matches!(self, Operation::Neg)
    }
}

impl Operation {
    pub fn is_add(&self) -> bool {
        matches!(self, Operation::Add)
    }

    pub fn is_sub(&self) -> bool {
        matches!(self, Operation::Sub)
    }

    pub fn is_mul(&self) -> bool {
        matches!(self, Operation::Mul)
    }

    pub fn is_neg(&self) -> bool {
        matches!(self, Operation::Neg)
    }

    pub fn is_private_input(&self) -> bool {
        matches!(self, Operation::PrivateInput(_))
    }

    pub fn is_public_input(&self) -> bool {
        matches!(self, Operation::PublicInput(_))
    }

    pub fn is_hidden_input(&self) -> bool {
        matches!(self, Operation::HiddenInput(_))
    }
}

pub type ZkpContext = Context<Operation>;
pub type ZkpFrontendCompilation = FrontendCompilation<Operation>;

pub trait ZkpContextOps {
    fn add_public_input(&mut self) -> NodeIndex;

    fn add_addition(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex;

    fn add_multiplication(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex;

    fn add_negate(&mut self, left: NodeIndex) -> NodeIndex;
}

impl ZkpContextOps for ZkpContext {
    fn add_public_input(&mut self) -> NodeIndex {
        let node = self.add_node(Operation::PublicInput(NodeIndex::from(self.next_input_id)));
        self.next_input_id += 1;

        node
    }

    fn add_addition(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_binary_operation(Operation::Add, left, right)
    }

    fn add_multiplication(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_binary_operation(Operation::Mul, left, right)
    }

    fn add_negate(&mut self, left: NodeIndex) -> NodeIndex {
        self.add_unary_operation(Operation::Neg, left)
    }
}

impl Render for Operation {
    fn render(&self) -> String {
        format!("{:?}", self)
    }
}

pub fn fe_compile(fe_compilation: ZkpFrontendCompilation) {}
