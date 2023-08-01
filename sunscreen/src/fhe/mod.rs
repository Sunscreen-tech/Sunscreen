use petgraph::stable_graph::NodeIndex;
use serde::{Deserialize, Serialize};
use sunscreen_backend::compile_inplace;
use sunscreen_compiler_common::{
    CompilationResult, Context, EdgeInfo, NodeInfo, Operation as OperationTrait,
};

use sunscreen_fhe_program::{
    FheProgram, Literal as FheProgramLiteral, Operation as FheProgramOperation, SchemeType,
};
use sunscreen_runtime::{InnerPlaintext, Params};

use std::cell::RefCell;

use crate::ContextEnum;

#[derive(Clone, Debug, Deserialize, Hash, Serialize, PartialEq, Eq)]
/**
 * Represents a literal node's data.
 */
pub enum Literal {
    /**
     * An unsigned 64-bit integer.
     */
    U64(u64),

    /**
     * An encoded plaintext value.
     */
    Plaintext(InnerPlaintext),
}

#[derive(Clone, Debug, Hash, Deserialize, Serialize, PartialEq, Eq)]
/**
 * Represents an operation occurring in the frontend AST.
 */
pub enum FheOperation {
    /**
     * This node indicates loading a cipher text from an input.
     */
    InputCiphertext,

    /**
     * This node indicates loading a plaintext from an input.
     */
    InputPlaintext,

    /**
     * Addition.
     */
    Add,

    /**
     * Add a ciphertext and plaintext value.
     */
    AddPlaintext,

    /**
     * Subtraction.
     */
    Sub,

    /**
     * Subtract a plaintext.
     */
    SubPlaintext,

    /**
     * Unary negation (i.e. given x, compute -x)
     */
    Negate,

    /**
     * Multiplication.
     */
    Multiply,

    /**
     * Multiply a ciphertext by a plaintext.
     */
    MultiplyPlaintext,

    /**
     * A literal that serves as an operand to other operations.
     */
    Literal(Literal),

    /**
     * Rotate left.
     */
    RotateLeft,

    /**
     * Rotate right.
     */
    RotateRight,

    /**
     * In the BFV scheme, swap rows in the Batched vectors.
     */
    SwapRows,

    /**
     * This node indicates the previous node's result should be a result of the [`fhe_program`](crate::fhe_program).
     */
    Output,
}

impl OperationTrait for FheOperation {
    fn is_binary(&self) -> bool {
        matches!(
            self,
            FheOperation::Add
                | FheOperation::Multiply
                | FheOperation::Sub
                | FheOperation::RotateLeft
                | FheOperation::RotateRight
                | FheOperation::SubPlaintext
                | FheOperation::AddPlaintext
                | FheOperation::MultiplyPlaintext
        )
    }

    fn is_commutative(&self) -> bool {
        matches!(
            self,
            FheOperation::Add
                | FheOperation::Multiply
                | FheOperation::AddPlaintext
                | FheOperation::MultiplyPlaintext
        )
    }

    fn is_unary(&self) -> bool {
        matches!(self, FheOperation::Negate | FheOperation::SwapRows)
    }

    fn is_unordered(&self) -> bool {
        false
    }

    fn is_ordered(&self) -> bool {
        false
    }
}

/**
 * The context for constructing the [`fhe_program`](crate::fhe_program) graph during compilation.
 *
 * This is an implementation detail of the
 * [`fhe_program`](crate::fhe_program) macro, and you shouldn't need
 * to construct one.
 */
pub type FheContext = Context<FheOperation, Params>;

/**
 *
 */
pub type FheFrontendCompilation = CompilationResult<FheOperation>;

thread_local! {
    /**
     * Contains the graph of a ZKP program during compilation. An
     * implementation detail and not for public consumption.
     */
    pub static CURRENT_FHE_CTX: RefCell<Option<&'static mut ContextEnum>> = RefCell::new(None);
}

/**
 * Runs the specified closure, injecting the current
 * [`fhe_program`](crate::fhe_program) context.
 */
pub fn with_fhe_ctx<F, R>(f: F) -> R
where
    F: FnOnce(&mut FheContext) -> R,
{
    CURRENT_FHE_CTX.with(|ctx| {
        let mut option = ctx.borrow_mut();
        let ctx = option
            .as_mut()
            .expect("Called Ciphertext::new() outside of a context.")
            .unwrap_fhe_mut()
            .unwrap();

        f(ctx)
    })
}

/**
 * Defines transformations to FHE program graphs.
 */
pub trait FheContextOps {
    /**
     * Add an encrypted input to this context.
     */
    fn add_ciphertext_input(&mut self) -> NodeIndex;

    /**
     * Add a plaintext input to this context.
     */
    fn add_plaintext_input(&mut self) -> NodeIndex;

    /**
     * Adds a plaintext literal to the
     * [`fhe_program`](crate::fhe_program) graph.
     */
    fn add_plaintext_literal(&mut self, plaintext: InnerPlaintext) -> NodeIndex;

    /**
     * Add a subtraction to this context.
     */
    fn add_subtraction(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex;

    /**
     * Add a subtraction to this context.
     */
    fn add_subtraction_plaintext(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex;

    /**
     * Adds a negation to this context.
     */
    fn add_negate(&mut self, x: NodeIndex) -> NodeIndex;

    /**
     * Add an addition to this context.
     */
    fn add_addition(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex;

    /**
     * Adds an addition to a plaintext.
     */
    fn add_addition_plaintext(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex;

    /**
     * Add a multiplication to this context.
     */
    fn add_multiplication(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex;

    /**
     * Add a multiplication to this context.
     */
    fn add_multiplication_plaintext(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex;

    /**
     * Adds a literal to this context.
     */
    fn add_literal(&mut self, literal: Literal) -> NodeIndex;

    /**
     * Add a rotate left.
     */
    fn add_rotate_left(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex;

    /**
     * Add a rotate right.
     */
    fn add_rotate_right(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex;
    /**
     * Adds a row swap.
     */
    fn add_swap_rows(&mut self, x: NodeIndex) -> NodeIndex;

    /**
     * Add a node that captures the previous node as an output.
     */
    fn add_output(&mut self, i: NodeIndex) -> NodeIndex;
}

impl FheContextOps for FheContext {
    fn add_ciphertext_input(&mut self) -> NodeIndex {
        self.add_node(FheOperation::InputCiphertext)
    }

    fn add_plaintext_input(&mut self) -> NodeIndex {
        self.add_node(FheOperation::InputPlaintext)
    }

    fn add_plaintext_literal(&mut self, plaintext: InnerPlaintext) -> NodeIndex {
        self.add_node(FheOperation::Literal(Literal::Plaintext(plaintext)))
    }

    fn add_subtraction(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_binary_operation(FheOperation::Sub, left, right)
    }

    fn add_subtraction_plaintext(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_binary_operation(FheOperation::SubPlaintext, left, right)
    }

    fn add_negate(&mut self, x: NodeIndex) -> NodeIndex {
        self.add_unary_operation(FheOperation::Negate, x)
    }

    fn add_addition(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_binary_operation(FheOperation::Add, left, right)
    }

    fn add_addition_plaintext(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_binary_operation(FheOperation::AddPlaintext, left, right)
    }

    fn add_multiplication(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_binary_operation(FheOperation::Multiply, left, right)
    }

    fn add_multiplication_plaintext(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_binary_operation(FheOperation::MultiplyPlaintext, left, right)
    }

    fn add_literal(&mut self, literal: Literal) -> NodeIndex {
        // See if we already have a node for the given literal. If so, just return it.
        // If not, make a new one.
        let existing_literal =
            self.graph
                .node_indices()
                .find(|&i| match &self.graph[i].operation {
                    FheOperation::Literal(x) => *x == literal,
                    _ => false,
                });

        match existing_literal {
            Some(x) => x,
            None => self.add_node(FheOperation::Literal(literal)),
        }
    }

    fn add_rotate_left(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_binary_operation(FheOperation::RotateLeft, left, right)
    }

    fn add_rotate_right(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_binary_operation(FheOperation::RotateRight, left, right)
    }

    fn add_swap_rows(&mut self, x: NodeIndex) -> NodeIndex {
        self.add_unary_operation(FheOperation::SwapRows, x)
    }

    fn add_output(&mut self, i: NodeIndex) -> NodeIndex {
        self.add_unary_operation(FheOperation::Output, i)
    }
}

/**
 * Extends FheFrontendCompilation to add a backend compilation method.
 */
pub trait FheCompile {
    /**
     * Performs frontend compilation of this intermediate representation into a backend [`FheProgram`],
     * then perform backend compilation and return the result.
     */
    fn compile(&self) -> FheProgram;
}

impl FheCompile for FheFrontendCompilation {
    fn compile(&self) -> FheProgram {
        let mut fhe_program = FheProgram::new(SchemeType::Bfv);

        let mapped_graph = self.graph.map(
            |id, n| match &n.operation {
                FheOperation::Add => NodeInfo::new(
                    FheProgramOperation::Add,
                    #[cfg(feature = "debugger")]
                    n.group_id,
                    #[cfg(feature = "debugger")]
                    n.stack_id,
                ),
                FheOperation::InputCiphertext => {
                    // HACKHACK: Input nodes are always added first to the graph in the order
                    // they're specified as function arguments. We should not depend on this.
                    NodeInfo::new(
                        FheProgramOperation::InputCiphertext { id: id.index() },
                        #[cfg(feature = "debugger")]
                        n.group_id,
                        #[cfg(feature = "debugger")]
                        n.stack_id,
                    )
                }
                FheOperation::InputPlaintext => {
                    // HACKHACK: Input nodes are always added first to the graph in the order
                    // they're specified as function arguments. We should not depend on this.
                    NodeInfo::new(
                        FheProgramOperation::InputPlaintext { id: id.index() },
                        #[cfg(feature = "debugger")]
                        n.group_id,
                        #[cfg(feature = "debugger")]
                        n.stack_id,
                    )
                }
                FheOperation::Literal(Literal::U64(x)) => NodeInfo::new(
                    FheProgramOperation::Literal {
                        val: FheProgramLiteral::U64 { value: *x },
                    },
                    #[cfg(feature = "debugger")]
                    n.group_id,
                    #[cfg(feature = "debugger")]
                    n.stack_id,
                ),
                FheOperation::Literal(Literal::Plaintext(x)) => {
                    // It's okay to unwrap here because fhe_program compilation will
                    // catch the panic and return a compilation error.
                    NodeInfo::new(
                        FheProgramOperation::Literal {
                            val: FheProgramLiteral::Plaintext {
                                value: x.to_bytes().expect("Failed to serialize plaintext."),
                            },
                        },
                        #[cfg(feature = "debugger")]
                        n.group_id,
                        #[cfg(feature = "debugger")]
                        n.stack_id,
                    )
                }
                FheOperation::Sub => NodeInfo::new(
                    FheProgramOperation::Sub,
                    #[cfg(feature = "debugger")]
                    n.group_id,
                    #[cfg(feature = "debugger")]
                    n.stack_id,
                ),
                FheOperation::SubPlaintext => NodeInfo::new(
                    FheProgramOperation::SubPlaintext,
                    #[cfg(feature = "debugger")]
                    n.group_id,
                    #[cfg(feature = "debugger")]
                    n.stack_id,
                ),
                FheOperation::Negate => NodeInfo::new(
                    FheProgramOperation::Negate,
                    #[cfg(feature = "debugger")]
                    n.group_id,
                    #[cfg(feature = "debugger")]
                    n.stack_id,
                ),
                FheOperation::Multiply => NodeInfo::new(
                    FheProgramOperation::Multiply,
                    #[cfg(feature = "debugger")]
                    n.group_id,
                    #[cfg(feature = "debugger")]
                    n.stack_id,
                ),
                FheOperation::MultiplyPlaintext => NodeInfo::new(
                    FheProgramOperation::MultiplyPlaintext,
                    #[cfg(feature = "debugger")]
                    n.group_id,
                    #[cfg(feature = "debugger")]
                    n.stack_id,
                ),
                FheOperation::Output => NodeInfo::new(
                    FheProgramOperation::OutputCiphertext,
                    #[cfg(feature = "debugger")]
                    n.group_id,
                    #[cfg(feature = "debugger")]
                    n.stack_id,
                ),
                FheOperation::RotateLeft => NodeInfo::new(
                    FheProgramOperation::ShiftLeft,
                    #[cfg(feature = "debugger")]
                    n.group_id,
                    #[cfg(feature = "debugger")]
                    n.stack_id,
                ),
                FheOperation::RotateRight => NodeInfo::new(
                    FheProgramOperation::ShiftRight,
                    #[cfg(feature = "debugger")]
                    n.group_id,
                    #[cfg(feature = "debugger")]
                    n.stack_id,
                ),
                FheOperation::SwapRows => NodeInfo::new(
                    FheProgramOperation::SwapRows,
                    #[cfg(feature = "debugger")]
                    n.group_id,
                    #[cfg(feature = "debugger")]
                    n.stack_id,
                ),
                FheOperation::AddPlaintext => NodeInfo::new(
                    FheProgramOperation::AddPlaintext,
                    #[cfg(feature = "debugger")]
                    n.group_id,
                    #[cfg(feature = "debugger")]
                    n.stack_id,
                ),
            },
            |_, e| match e {
                EdgeInfo::Left => EdgeInfo::Left,
                EdgeInfo::Right => EdgeInfo::Right,
                EdgeInfo::Unary => EdgeInfo::Unary,
                EdgeInfo::Unordered => unreachable!("FHE programs have no unordered edges."),
                EdgeInfo::Ordered { .. } => unreachable!("FHE programs have no ordered edges."),
            },
        );

        fhe_program.graph = CompilationResult {
            graph: mapped_graph,
            #[cfg(feature = "debugger")]
            metadata: self.metadata.clone(),
        };

        compile_inplace(fhe_program)
    }
}
