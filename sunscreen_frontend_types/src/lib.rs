use std::cell::RefCell;

use serde::{Deserialize, Serialize};
use petgraph::stable_graph::{NodeIndex, StableGraph};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub enum Operation {
    InputCiphertext,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub enum OperandInfo {
}

pub struct Signed {
    pub id: NodeIndex,
}

impl Ciphertext for Signed {
    fn new() -> Self {
        CURRENT_CTX.with(|ctx| {
            let mut option = ctx.borrow_mut();
            let ctx = option.as_mut().expect("Called Ciphertext::new() outside of a context.");

            Self {
                id: Context::add_input(ctx),
            }
        })
    }
}

impl Signed {
}

pub trait Ciphertext {
    // fn num_ciphertexts() -> usize;
    fn new() -> Self;
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Context {
    pub graph: StableGraph<Operation, OperandInfo>,
}

thread_local! {
    pub static CURRENT_CTX: RefCell<Option<&'static mut Context>> = RefCell::new(None);
}

impl Context {
    pub fn new() -> Self {
        Self {
            graph: StableGraph::new()
        }
    }

    pub fn add_input(&mut self) -> NodeIndex {
        self.graph.add_node(Operation::InputCiphertext)
    }
}
