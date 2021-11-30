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
pub enum Operation {
    InputCiphertext,
    Add,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub enum OperandInfo {
    Left,
    Right,
}

pub trait Ciphertext {
    // fn num_ciphertexts() -> usize;
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

    pub fn add_input(&mut self) -> NodeIndex {
        self.graph.add_node(Operation::InputCiphertext)
    }

    pub fn add_addition(&mut self, left: NodeIndex, right: NodeIndex) -> NodeIndex {
        let new_id = self.graph.add_node(Operation::Add);
        self.graph.add_edge(left, new_id, OperandInfo::Left);
        self.graph.add_edge(right, new_id, OperandInfo::Right);

        new_id
    }
}
