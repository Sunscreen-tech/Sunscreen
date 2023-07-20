use petgraph::adj::NodeIndex;
use petgraph::stable_graph::StableGraph;
use sunscreen_compiler_common::{NodeInfo, EdgeInfo};
use sunscreen_compiler_common::Operation;
use serde::{Deserialize, Serialize};
use sunscreen_compiler_common::Type;
use petgraph::visit::{Dfs, Walker};

#[derive(Clone, Serialize, Deserialize)]
pub struct SerializedSealData {
    pub value: i64,
    pub data_type: Type,
    pub noise_budget: u32,
    pub coefficients: Vec<u64>,
    pub multiplicative_depth: u64,
}

/**
 * Gets the multiplicative depth of a node in the compilation graph.
 */

// TODO: implement with memoization? will have to see how performance is with naive algorithm
pub fn get_mult_depth<O>(graph: &StableGraph<NodeInfo<O>, EdgeInfo>, node: NodeIndex) -> u64
    where O: Operation
{
    let mut dfs = Dfs::new(graph, petgraph::prelude::NodeIndex(node));

    let mut max_depth = 0;

    while let Some(current_node) = dfs.next(graph) {
        let current_operation = &graph[current_node].operation;

        if current_operation.is_multiplication() {
            // Get the maximum depth of the node's predecessors
            let max_predecessor_depth = graph
                .neighbors_directed(current_node, petgraph::Incoming)
                .filter_map(|n| {
                    let operation = &graph[n].operation;
                    if operation.is_multiplication() {
                        Some(get_mult_depth(graph, n.index() as u32) + 1)
                    } else {
                        None
                    }
                })
                .max()
                .unwrap_or(0);
            
            max_depth = max_depth.max(max_predecessor_depth);
        }
    }
    max_depth
}