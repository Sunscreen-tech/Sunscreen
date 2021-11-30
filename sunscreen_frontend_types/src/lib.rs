mod types;

use std::cell::RefCell;

use petgraph::{
    algo::is_isomorphic_matching,
    stable_graph::{NodeIndex, StableGraph},
    Graph,
};
use serde::{Deserialize, Serialize};

pub use types::*;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub enum Literal {
    U64(u64)
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub enum Operation {
    InputCiphertext,
    Add,
    Multiply,
    Literal(Literal),
    RotateLeft,
    RotateRight,
    SwapRows
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub enum OperandInfo {
    Left,
    Right,
}

pub trait Value {
    fn new() -> Self;
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Context {
    pub graph: StableGraph<Operation, OperandInfo>,
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
    pub fn new() -> Self {
        Self {
            graph: StableGraph::new(),
        }
    }

    fn add_2_input(&mut self, op: Operation, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        let new_id = self.graph.add_node(op);
        self.graph.add_edge(left, new_id, OperandInfo::Left);
        self.graph.add_edge(right, new_id, OperandInfo::Right);

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
        let existing_literal = self.graph.node_indices().filter_map(|i| {
            match &self.graph[i] {
                Operation::Literal(x) => if *x == literal { Some(i) } else { None },
                _ => None
            }
        }).nth(0);

        match existing_literal {
            Some(x) => x,
            None => self.graph.add_node(Operation::Literal(literal))
        }
    }

    pub fn add_rotate_left(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_2_input(Operation::RotateLeft, left, right)
    }

    pub fn add_rotate_right(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        self.add_2_input(Operation::RotateRight, left, right)
    }
}
