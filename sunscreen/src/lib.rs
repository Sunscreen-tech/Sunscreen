#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

//! This crate contains the frontend compiler for Sunscreen [`fhe_program`] and the types and
//! algorithms that support it.
//!
//! # Examples
//! This example is further annotated in `examples/simple_multiply`.
//! ```
//! # use sunscreen::{fhe_program, Compiler, types::{bfv::Signed, Cipher}, PlainModulusConstraint, Params, Runtime, Context};
//!
//! #[fhe_program(scheme = "bfv")]
//! fn simple_multiply(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
//!     a * b
//! }
//!
//! fn main() {
//!   let app = Compiler::new()
//!       .fhe_program(simple_multiply)
//!       .plain_modulus_constraint(PlainModulusConstraint::Raw(600))
//!       .additional_noise_budget(5)
//!       .compile()
//!       .unwrap();
//!
//!   let runtime = Runtime::new(app.params()).unwrap();
//!
//!   let (public_key, private_key) = runtime.generate_keys().unwrap();
//!
//!   let a = runtime.encrypt(Signed::from(15), &public_key).unwrap();
//!   let b = runtime.encrypt(Signed::from(5), &public_key).unwrap();
//!
//!   let results = runtime.run(app.get_program(simple_multiply).unwrap(), vec![a, b], &public_key).unwrap();
//!
//!   let c: Signed = runtime.decrypt(&results[0], &private_key).unwrap();
//!
//!   assert_eq!(c, 75.into());
//! }
//! ```
//!

mod compiler;
mod error;
mod params;

/**
 * This module contains types used during [`fhe_program`] construction.
 *
 * * The [`crate::types::bfv`] module contains data types used for
 * BFV [`fhe_program`] inputs and outputs.
 * * The [`crate::types::intern`] module contains implementation details needed
 * for [`fhe_program`] construction. You shouldn't need to use these, as the `#[fhe_program]`
 * macro will automatically insert them for you as needed.
 *
 * The root of the module contains:
 * * [`Cipher`](crate::types::Cipher) is a parameterized type used to
 * denote an [`fhe_program`] input parameter as encrypted.
 */
pub mod types;

use petgraph::{
    algo::is_isomorphic_matching,
    stable_graph::{NodeIndex, StableGraph},
    Graph,
};
use serde::{Deserialize, Serialize};

use std::cell::RefCell;
use std::collections::HashMap;

use sunscreen_backend::compile_inplace;
use sunscreen_fhe_program::{
    EdgeInfo, FheProgram, Literal as FheProgramLiteral, NodeInfo, Operation as FheProgramOperation,
};

pub use compiler::{Compiler, FheProgramFn};
pub use error::{Error, Result};
pub use params::PlainModulusConstraint;
pub use seal_fhe::Plaintext as SealPlaintext;
pub use sunscreen_compiler_macros::*;
pub use sunscreen_fhe_program::{SchemeType, SecurityLevel};
pub use sunscreen_runtime::{
    CallSignature, Ciphertext, CompiledFheProgram, Error as RuntimeError, FheProgramInput,
    FheProgramInputTrait, FheProgramMetadata, InnerCiphertext, InnerPlaintext, Params, Plaintext,
    PrivateKey, PublicKey, RequiredKeys, Runtime, WithContext,
};

#[derive(Clone, Serialize, Deserialize)]
/**
 * The outcome of successful compilation. Contains one or more [`CompiledFheProgram`].
 */
pub struct Application {
    programs: HashMap<String, CompiledFheProgram>,
}

impl Application {
    /**
     * Constructs a new Application from the given HashMap of programs. The
     * keys of this contain FHE program names and the values are the
     * compiled FHE programs.
     *
     * # Remarks
     * The programs [`HashMap`] must contain at least 1 program or this
     * function will return [`Error::NoPrograms`].
     *
     * You should generally not call this function
     * It is an implementation detail of compilation.
     */
    pub(crate) fn new(programs: HashMap<String, CompiledFheProgram>) -> Result<Self> {
        if programs.is_empty() {
            return Err(Error::NoPrograms);
        }

        Ok(Self { programs })
    }

    /**
     * Returns the [`Params`] suitable for running each contained [`CompiledFheProgram`].
     * These parameters were chosen during compilation.
     */
    pub fn params(&self) -> &Params {
        // We can safely unwrap the iterator because we ensured we have at
        // least 1 program during construction.
        &self.programs.values().next().unwrap().metadata.params
    }

    /**
     * Gets the [`CompiledFheProgram`] with the given name or [`None`] if not present.
     */
    pub fn get_program<'a, N>(&self, name: N) -> Option<&CompiledFheProgram>
    where
        N: AsRef<str>,
    {
        self.programs.get(name.as_ref())
    }

    /**
     * Returns an iterator over all the compiled programs.
     */
    pub fn get_programs(&self) -> impl Iterator<Item = (&String, &CompiledFheProgram)> {
        self.programs.iter()
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
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

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
/**
 * Represents an operation occurring in the frontend AST.
 */
pub enum Operation {
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
     * This node indicates the previous node's result should be a result of the [`fhe_program`].
     */
    Output,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
/**
 * Information about an edge in the frontend IR.
 */
pub enum OperandInfo {
    /**
     * This edge serves as the left operand to the destination node.
     */
    Left,

    /**
     * This edge serves as the right operand to the destination node.
     */
    Right,

    /**
     * This edge serves as the single operand to the destination node.
     */
    Unary,
}

/**
 * This trait specifies a type as being able to be used as an input or output of an [`fhe_program`].
 */
pub trait Value {
    /**
     * Creates an instance and adds it to the graph in the thread-local IR context.
     */
    fn new() -> Self;

    /**
     * Add a output node to the current IR context.
     */
    fn output(&self) -> Self;
}

#[derive(Clone, Debug, Deserialize, Serialize)]
/**
 * Contains the frontend compilation graph.
 */
pub struct FrontendCompilation {
    /**
     * The dependency graph of the frontend's intermediate representation (IR) that backs an [`fhe_program`].
     */
    pub graph: StableGraph<Operation, OperandInfo>,
}

#[derive(Clone, Debug)]
/**
 * The context for constructing the [`fhe_program`] graph during compilation.
 *
 * This is an implementation detail of the [`fhe_program`] macro, and you shouldn't need
 * to construct one.
 */
pub struct Context {
    /**
     * The frontend compilation result.
     */
    pub compilation: FrontendCompilation,

    /**
     * The set of parameters for which we're currently constructing the graph.
     */
    pub params: Params,

    /**
     * Stores indicies for graph nodes in a bump allocator. [`FheProgramNode`](crate::types::intern::FheProgramNode)
     * can request allocations of these. This allows it to use slices instead of Vecs, which allows
     * FheProgramNode to impl Copy.
     */
    pub indicies_store: Vec<NodeIndex>,
}

impl PartialEq for FrontendCompilation {
    fn eq(&self, b: &Self) -> bool {
        is_isomorphic_matching(
            &Graph::from(self.graph.clone()),
            &Graph::from(b.graph.clone()),
            |n1, n2| n1 == n2,
            |e1, e2| e1 == e2,
        )
    }
}

thread_local! {
    /**
     * While constructing an [`fhe_program`], this refers to the current intermediate
     * representation. An implementation detail of the [`fhe_program`] macro.
     */
    pub static CURRENT_CTX: RefCell<Option<&'static mut Context>> = RefCell::new(None);

    /**
     * An arena containing slices of indicies. An implementation detail of the
     * [`fhe_program`] macro.
     */
    pub static INDEX_ARENA: RefCell<bumpalo::Bump> = RefCell::new(bumpalo::Bump::new());
}

/**
 * Runs the specified closure, injecting the current [`fhe_program`] context.
 */
pub fn with_ctx<F, R>(f: F) -> R
where
    F: FnOnce(&mut Context) -> R,
{
    CURRENT_CTX.with(|ctx| {
        let mut option = ctx.borrow_mut();
        let ctx = option
            .as_mut()
            .expect("Called Ciphertext::new() outside of a context.");

        f(ctx)
    })
}

impl Context {
    /**
     * Creates a new empty frontend intermediate representation context with the given scheme.
     */
    pub fn new(params: &Params) -> Self {
        Self {
            compilation: FrontendCompilation {
                graph: StableGraph::new(),
            },
            params: params.clone(),
            indicies_store: vec![],
        }
    }

    fn add_2_input(&mut self, op: Operation, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        let new_id = self.compilation.graph.add_node(op);
        self.compilation
            .graph
            .add_edge(left, new_id, OperandInfo::Left);
        self.compilation
            .graph
            .add_edge(right, new_id, OperandInfo::Right);

        new_id
    }

    fn add_1_input(&mut self, op: Operation, i: NodeIndex) -> NodeIndex {
        let new_id = self.compilation.graph.add_node(op);
        self.compilation
            .graph
            .add_edge(i, new_id, OperandInfo::Unary);

        new_id
    }

    /**
     * Add an input to this context.
     */
    pub fn add_ciphertext_input(&mut self) -> NodeIndex {
        self.compilation.graph.add_node(Operation::InputCiphertext)
    }

    /**
     * Add an input to this context.
     */
    pub fn add_plaintext_input(&mut self) -> NodeIndex {
        self.compilation.graph.add_node(Operation::InputPlaintext)
    }

    /**
     * Adds a plaintext literal to the [`fhe_program`] graph.
     */
    pub fn add_plaintext_literal(&mut self, plaintext: InnerPlaintext) -> NodeIndex {
        self.compilation
            .graph
            .add_node(Operation::Literal(Literal::Plaintext(plaintext)))
    }

    /**
     * Add a subtraction to this context.
     */
    pub fn add_subtraction(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_2_input(Operation::Sub, left, right)
    }

    /**
     * Add a subtraction to this context.
     */
    pub fn add_subtraction_plaintext(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_2_input(Operation::SubPlaintext, left, right)
    }

    /**
     * Adds a negation to this context.
     */
    pub fn add_negate(&mut self, x: NodeIndex) -> NodeIndex {
        self.add_1_input(Operation::Negate, x)
    }

    /**
     * Add an addition to this context.
     */
    pub fn add_addition(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_2_input(Operation::Add, left, right)
    }

    /**
     * Adds an addition to a plaintext.
     */
    pub fn add_addition_plaintext(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_2_input(Operation::AddPlaintext, left, right)
    }

    /**
     * Add a multiplication to this context.
     */
    pub fn add_multiplication(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_2_input(Operation::Multiply, left, right)
    }

    /**
     * Add a multiplication to this context.
     */
    pub fn add_multiplication_plaintext(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_2_input(Operation::MultiplyPlaintext, left, right)
    }

    /**
     * Adds a literal to this context.
     */
    pub fn add_literal(&mut self, literal: Literal) -> NodeIndex {
        // See if we already have a node for the given literal. If so, just return it.
        // If not, make a new one.
        let existing_literal = self
            .compilation
            .graph
            .node_indices()
            .filter_map(|i| match &self.compilation.graph[i] {
                Operation::Literal(x) => {
                    if *x == literal {
                        Some(i)
                    } else {
                        None
                    }
                }
                _ => None,
            })
            .next();

        match existing_literal {
            Some(x) => x,
            None => self.compilation.graph.add_node(Operation::Literal(literal)),
        }
    }

    /**
     * Add a rotate left.
     */
    pub fn add_rotate_left(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_2_input(Operation::RotateLeft, left, right)
    }

    /**
     * Add a rotate right.
     */
    pub fn add_rotate_right(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_2_input(Operation::RotateRight, left, right)
    }

    /**
     * Adds a row swap.
     */
    pub fn add_swap_rows(&mut self, x: NodeIndex) -> NodeIndex {
        self.add_1_input(Operation::SwapRows, x)
    }

    /**
     * Add a node that captures the previous node as an output.
     */
    pub fn add_output(&mut self, i: NodeIndex) -> NodeIndex {
        self.add_1_input(Operation::Output, i)
    }
}

impl FrontendCompilation {
    /**
     * Performs frontend compilation of this intermediate representation into a backend [`FheProgram`],
     * then perform backend compilation and return the result.
     */
    pub fn compile(&self) -> FheProgram {
        let mut fhe_program = FheProgram::new(SchemeType::Bfv);

        let mapped_graph = self.graph.map(
            |id, n| match n {
                Operation::Add => NodeInfo::new(FheProgramOperation::Add),
                Operation::InputCiphertext => {
                    // HACKHACK: Input nodes are always added first to the graph in the order
                    // they're specified as function arguments. We should not depend on this.
                    NodeInfo::new(FheProgramOperation::InputCiphertext(id.index()))
                }
                Operation::InputPlaintext => {
                    // HACKHACK: Input nodes are always added first to the graph in the order
                    // they're specified as function arguments. We should not depend on this.
                    NodeInfo::new(FheProgramOperation::InputPlaintext(id.index()))
                }
                Operation::Literal(Literal::U64(x)) => {
                    NodeInfo::new(FheProgramOperation::Literal(FheProgramLiteral::U64(*x)))
                }
                Operation::Literal(Literal::Plaintext(x)) => {
                    // It's okay to unwrap here because fhe_program compilation will
                    // catch the panic and return a compilation error.
                    NodeInfo::new(FheProgramOperation::Literal(FheProgramLiteral::Plaintext(
                        x.to_bytes().expect("Failed to serialize plaintext."),
                    )))
                }
                Operation::Sub => NodeInfo::new(FheProgramOperation::Sub),
                Operation::SubPlaintext => NodeInfo::new(FheProgramOperation::SubPlaintext),
                Operation::Negate => NodeInfo::new(FheProgramOperation::Negate),
                Operation::Multiply => NodeInfo::new(FheProgramOperation::Multiply),
                Operation::MultiplyPlaintext => {
                    NodeInfo::new(FheProgramOperation::MultiplyPlaintext)
                }
                Operation::Output => NodeInfo::new(FheProgramOperation::OutputCiphertext),
                Operation::RotateLeft => NodeInfo::new(FheProgramOperation::ShiftLeft),
                Operation::RotateRight => NodeInfo::new(FheProgramOperation::ShiftRight),
                Operation::SwapRows => NodeInfo::new(FheProgramOperation::SwapRows),
                Operation::AddPlaintext => NodeInfo::new(FheProgramOperation::AddPlaintext),
            },
            |_, e| match e {
                OperandInfo::Left => EdgeInfo::LeftOperand,
                OperandInfo::Right => EdgeInfo::RightOperand,
                OperandInfo::Unary => EdgeInfo::UnaryOperand,
            },
        );

        fhe_program.graph = mapped_graph;

        compile_inplace(fhe_program)
    }
}
