pub mod types;
mod compiler;
mod error;
mod params;

use std::cell::RefCell;

use petgraph::{
    algo::is_isomorphic_matching,
    stable_graph::{NodeIndex, StableGraph},
    Graph,
};
use serde::{Deserialize, Serialize};

use sunscreen_backend::compile_inplace;
use sunscreen_circuit::{
    Circuit, EdgeInfo, Literal as CircuitLiteral, NodeInfo, Operation as CircuitOperation,
    OuterLiteral as CircuitOuterLiteral,
};

pub use params::{PlainModulusConstraint};
pub use sunscreen_circuit::{SchemeType, SecurityLevel};
pub use compiler::{Compiler};
pub use sunscreen_runtime::Params;
pub use error::{Error, Result};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub enum Literal {
    U64(u64),
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub enum Operation {
    InputCiphertext,
    Add,
    Multiply,
    Literal(Literal),
    RotateLeft,
    RotateRight,
    SwapRows,
    Output,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub enum OperandInfo {
    Left,
    Right,
    Unary,
}

pub trait Value {
    fn new() -> Self;
    fn output(&self) -> Self;
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Context {
    pub graph: StableGraph<Operation, OperandInfo>,
    pub scheme: SchemeType,
}

impl PartialEq for Context {
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
    pub static CURRENT_CTX: RefCell<Option<&'static mut Context>> = RefCell::new(None);
}

impl Context {
    pub fn new(scheme: SchemeType) -> Self {
        Self {
            graph: StableGraph::new(),
            scheme,
        }
    }

    fn add_2_input(&mut self, op: Operation, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        let new_id = self.graph.add_node(op);
        self.graph.add_edge(left, new_id, OperandInfo::Left);
        self.graph.add_edge(right, new_id, OperandInfo::Right);

        new_id
    }

    fn add_1_input(&mut self, op: Operation, i: NodeIndex) -> NodeIndex {
        let new_id = self.graph.add_node(op);
        self.graph.add_edge(i, new_id, OperandInfo::Unary);

        new_id
    }

    pub fn add_input(&mut self) -> NodeIndex {
        self.graph.add_node(Operation::InputCiphertext)
    }

    pub fn add_addition(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_2_input(Operation::Add, left, right)
    }

    pub fn add_multiplication(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_2_input(Operation::Multiply, left, right)
    }

    pub fn add_literal(&mut self, literal: Literal) -> NodeIndex {
        // See if we already have a node for the given literal. If so, just return it.
        // If not, make a new one.
        let existing_literal = self
            .graph
            .node_indices()
            .filter_map(|i| match &self.graph[i] {
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
            None => self.graph.add_node(Operation::Literal(literal)),
        }
    }

    pub fn add_rotate_left(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_2_input(Operation::RotateLeft, left, right)
    }

    pub fn add_rotate_right(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_2_input(Operation::RotateRight, left, right)
    }

    pub fn add_output(&mut self, i: NodeIndex) -> NodeIndex {
        self.add_1_input(Operation::Output, i)
    }

    pub fn compile(&self) -> Circuit {
        let mut circuit = Circuit::new(SchemeType::Bfv);

        let mapped_graph = self.graph.map(
            |id, n| match n {
                Operation::Add => NodeInfo::new(CircuitOperation::Add),
                Operation::InputCiphertext => {
                    NodeInfo::new(CircuitOperation::InputCiphertext(id.index()))
                }
                Operation::Literal(Literal::U64(x)) => NodeInfo::new(CircuitOperation::Literal(
                    CircuitOuterLiteral::Scalar(CircuitLiteral::U64(*x)),
                )),
                Operation::Multiply => NodeInfo::new(CircuitOperation::Multiply),
                Operation::Output => NodeInfo::new(CircuitOperation::OutputCiphertext),
                Operation::RotateLeft => NodeInfo::new(CircuitOperation::ShiftLeft),
                Operation::RotateRight => NodeInfo::new(CircuitOperation::ShiftRight),
                Operation::SwapRows => NodeInfo::new(CircuitOperation::SwapRows),
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
