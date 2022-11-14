use sunscreen_runtime::CallSignature;

use crate::Result;

use std::cell::RefCell;

/**
 * An internal representation of a ZKP program specification.
 */
pub trait ZkpProgramFn {
    /**
     * Create a circuit from this specification.
     */
    fn build(&self) -> Result<ZkpFrontendCompilation>;

    /**
     * Gets the call signature for this program.
     */
    fn signature(&self) -> CallSignature;

    /**
     * Gets the name of this program.
     */
    fn name(&self) -> &str;
}

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

/**
 * An implementation detail of a ZKP program. During compilation, it holds 
 * the graph of the program currently being constructed in an
 * [`#[zkp_program]`](crate::zkp_program) function.
 * 
 * # Remarks
 * For internal use only.
 */
pub type ZkpContext = Context<Operation>;
/**
 * Contains the results of compiling a [`#[zkp_program]`](crate::zkp_program) function.
 * 
 * # Remarks
 * For internal use only.
 */
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

thread_local! {
    /**
     * Contains the graph of a ZKP program during compilation. An 
     * implementation detail and not for public consumption.
     */
    pub static CURRENT_ZKP_CTX: RefCell<Option<&'static mut ZkpContext>> = RefCell::new(None);
}

/**
 * Runs the specified closure, injecting the current [`fhe_program`] context.
 */
pub fn with_zkp_ctx<F, R>(f: F) -> R
where
    F: FnOnce(&mut ZkpContext) -> R,
{
    CURRENT_ZKP_CTX.with(|ctx| {
        let mut option = ctx.borrow_mut();
        let ctx = option
            .as_mut()
            .expect("Called with_zkp_ctx() outside of a context.");

        f(ctx)
    })
}
