use sunscreen_ir::IntermediateRepresentation;

use petgraph::stable_graph::{NodeIndex};

pub fn run_program(ir: &IntermediateRepresentation) {

}

/*
fn parallel_traverse(ir: &IntermediateRepresentation, run_to: Option<NodeIndex>) {
    let ir = match run_to {
        Some(r) => prune(),
        None => ir,
    }
}*/