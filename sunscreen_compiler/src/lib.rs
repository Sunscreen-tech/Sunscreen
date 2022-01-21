#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

//! This crate contains the frontend compiler for Sunscreen circuits and the types and
//! algorithms that support it.
//!
//! # Examples
//! This example is further annotated in `examples/simple_multiply`.
//! ```
//! # use sunscreen_compiler::{circuit, Compiler, types::{Cipher, Unsigned}, PlainModulusConstraint, Params, Runtime, Context};
//!
//! #[circuit(scheme = "bfv")]
//! fn simple_multiply(a: Cipher<Unsigned>, b: Cipher<Unsigned>) -> Cipher<Unsigned> {
//!     a * b
//! }
//!
//! fn main() {
//!   let circuit = Compiler::with_circuit(simple_multiply)
//!       .plain_modulus_constraint(PlainModulusConstraint::Raw(600))
//!       .noise_margin_bits(5)
//!       .compile()
//!       .unwrap();
//!
//!   let runtime = Runtime::new(&circuit.metadata.params).unwrap();
//!
//!   let (public, secret) = runtime.generate_keys().unwrap();
//!
//!   let a = runtime.encrypt(Unsigned::from(15), &public).unwrap();
//!   let b = runtime.encrypt(Unsigned::from(5), &public).unwrap();
//!
//!   let results = runtime.run(&circuit, vec![a, b], &public).unwrap();
//!
//!   let c: Unsigned = runtime.decrypt(&results[0], &secret).unwrap();
//!
//!   assert_eq!(c, 75.into());
//! }
//! ```
//!

mod compiler;
mod error;
mod params;

/**
 * This module contains build-in types you can use as inputs and outputs
 * from your circuits.
 *
 * # BFV Scheme types
 * The BFV scheme is a good choice for exactly and quickly computing a small
 * number of simple operations.
 *
 * Plaintexts under the BFV scheme are polynomials with `N` terms, where
 * `N` is the `poly_degree` scheme paramter. This parameter is (by default)
 * automatically configured on circuit compilation based on its noise budget
 * requirements. Addition and multiplication imply adding and multiplying
 * polynomials.
 *
 * However, working with polynomials directly is difficult, so Sunscreen
 * provides types that transparently encode data you might actually want
 * to use into and out of polynomials. These include:
 * * The [`Signed`](crate::types::Signed) type represents a signed integer that
 * encodes a binary value decomposed into a number of digits. This encoding
 * allows for somewhat efficiently representing integers, but has unusual
 * overflow semantics developers need to understand. This type supports
 * addition, subtraction, multiplication, and negation.
 * * The [`Unsigned`](crate::types::Unsigned) type represents and unsigned
 * integer. This type has the same benefits and caveats as
 * [`Signed`](crate::types::Signed) types, but is unsigned.
 * * The [`Fractional`](crate::types::Fractional) type is a quasi fixed-point
 * value. It allows you to homomorphically compute decimal values as
 * efficiently as [`Signed`](crate::types::Signed) and
 * [`Unsigned`](crate::types::Unsigned) types. This type has complex overflow
 * conditions. This type intrinsically supports homomorphic addition
 * multiplication, and negation. Dividing by plaintext is possible by
 * computing the divisor's reciprical and multiplying. Dividing by ciphertext
 * is not possible.
 * * The [`Rational`](crate::types::Rational) type allows quasi fixed-point
 * representation. This type interally uses 2 ciphertexts, and is thus requires
 * twice as much space as other types. Its overflow semantics are effectively
 * those of two [`Signed`](crate::types::Signed) values. However, this type is
 * less efficient than [`Fractional`](crate::types::Fractional), as it
 * requires 2 multiplications for addition and subtraction. Unlike other types,
 * [`Rational`](crate::types::Rational) supports ciphertext-ciphertext
 * division.
 *
 * Type comparison:
 *
 * | Type       | # ciphertexts | overflow conditions | values            | ops/add        | ops/mul | ops/sub        | ops/neg | ops/div |
 * |------------|---------------|---------------------|-------------------|----------------|---------|----------------|---------|---------|
 * | Signed     | 1             | moderate            | signed integral   | 1 add          | 1 mul   | 1 sub          | 1 neg   | -       |
 * | Unsigned   | 1             | moderate            | unsigned integral | 1 add          | 1 mul   | 1 sub          | 1 neg   | -       |
 * | Fractional | 1             | complex             | signed decimal    | 1 add          | 1 mul   | 1 sub          | 1 neg   | 1 mul*  |
 * | Rational   | 2             | moderate            | signed decimal    | 2 muls + 1 sub | 2 muls  | 2 muls + 1 sub | 1 neg   | 2 muls  |
 *
 * `* Plaintext division only.`
 *
 * The set of feasible computations under FHE with BFV is fairly limited. For
 * example, comparisons, modulus, transcendentals, are generally very difficult
 * and are often infeasible depending on scheme parameters and noise budget.
 * One can sometimes *approximate* operations using Lagrange interpolation.
 */
pub mod types;

use petgraph::{
    algo::is_isomorphic_matching,
    stable_graph::{NodeIndex, StableGraph},
    Graph,
};
use serde::{Deserialize, Serialize};
use std::cell::RefCell;

use sunscreen_backend::compile_inplace;
use sunscreen_circuit::{
    Circuit, EdgeInfo, Literal as CircuitLiteral, NodeInfo, Operation as CircuitOperation,
    OuterLiteral as CircuitOuterLiteral,
};

pub use clap::crate_version;
pub use compiler::{CircuitFn, Compiler};
pub use error::{Error, Result};
pub use params::PlainModulusConstraint;
pub use sunscreen_circuit::{SchemeType, SecurityLevel};
pub use sunscreen_compiler_macros::*;
pub use sunscreen_runtime::{
    CallSignature, Ciphertext, CircuitInput, CircuitInputTrait, CircuitMetadata, CompiledCircuit,
    Error as RuntimeError, InnerCiphertext, InnerPlaintext, Params, Plaintext, PublicKey,
    RequiredKeys, Runtime, WithContext,
};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
/**
 * Represents a literal node's data.
 */
pub enum Literal {
    /**
     * An unsigned 64-bit integer.
     */
    U64(u64),
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
     * Multiplication.
     */
    Multiply,

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
     * In the BFV scheme, swap rows in the SIMD vectors.
     */
    SwapRows,

    /**
     * This node indicates the previous node's result should be a result of the circuit.
     */
    Output,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
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
 * This trait specifies a type as being able to be used as an input or output of a circuit.
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
     * The dependency graph of the frontend's intermediate representation (IR) that backs a circuit.
     */
    pub graph: StableGraph<Operation, OperandInfo>,
}

#[derive(Clone, Debug)]
/**
 * The context for constructing the circuit graph while compiling a circuit.
 *
 * This is an implementation detail of the circuit macro, and you shouldn't need
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
     * Stores indicies for graph nodes in a bump allocator. [`CircuitNode`](crate::types::CircuitNode)
     * can request allocations of these. This allows it to use slices instead of Vecs, which allows
     * CircuitNode to impl Copy.
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
     * While constructing a circuit, this refers to the current intermediate
     * representation. An implementation detail of the [`circuit`] macro.
     */
    pub static CURRENT_CTX: RefCell<Option<&'static mut Context>> = RefCell::new(None);

    /**
     * An arena containing slices of indicies. An implementation detail of the
     * [`circuit`] macro.
     */
    pub static INDEX_ARENA: RefCell<bumpalo::Bump> = RefCell::new(bumpalo::Bump::new());
}

/**
 * Runs the specified closure, injecting the current circuit context.
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
     * Add a subtraction to this context.
     */
    pub fn add_subtraction(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_2_input(Operation::Sub, left, right)
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
            .nth(0);

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
     * Add a node that captures the previous node as an output.
     */
    pub fn add_output(&mut self, i: NodeIndex) -> NodeIndex {
        self.add_1_input(Operation::Output, i)
    }
}

impl FrontendCompilation {
    /**
     * Performs frontend compilation of this intermediate representation into a backend [`Circuit`],
     * then perform backend compilation and return the result.
     */
    pub fn compile(&self) -> Circuit {
        let mut circuit = Circuit::new(SchemeType::Bfv);

        let mapped_graph = self.graph.map(
            |id, n| match n {
                Operation::Add => NodeInfo::new(CircuitOperation::Add),
                Operation::InputCiphertext => {
                    // HACKHACK: Input nodes are always added first to the graph in the order
                    // they're specified as function arguments. We should not depend on this.
                    NodeInfo::new(CircuitOperation::InputCiphertext(id.index()))
                }
                Operation::InputPlaintext => {
                    // HACKHACK: Input nodes are always added first to the graph in the order
                    // they're specified as function arguments. We should not depend on this.
                    NodeInfo::new(CircuitOperation::InputPlaintext(id.index()))
                }
                Operation::Literal(Literal::U64(x)) => NodeInfo::new(CircuitOperation::Literal(
                    CircuitOuterLiteral::Scalar(CircuitLiteral::U64(*x)),
                )),
                Operation::Sub => NodeInfo::new(CircuitOperation::Sub),
                Operation::Multiply => NodeInfo::new(CircuitOperation::Multiply),
                Operation::Output => NodeInfo::new(CircuitOperation::OutputCiphertext),
                Operation::RotateLeft => NodeInfo::new(CircuitOperation::ShiftLeft),
                Operation::RotateRight => NodeInfo::new(CircuitOperation::ShiftRight),
                Operation::SwapRows => NodeInfo::new(CircuitOperation::SwapRows),
                Operation::AddPlaintext => NodeInfo::new(CircuitOperation::AddPlaintext),
            },
            |_, e| match e {
                OperandInfo::Left => EdgeInfo::LeftOperand,
                OperandInfo::Right => EdgeInfo::RightOperand,
                OperandInfo::Unary => EdgeInfo::UnaryOperand,
            },
        );

        circuit.graph = StableGraph::from(mapped_graph);

        compile_inplace(circuit)
    }
}
