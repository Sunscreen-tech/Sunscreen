use petgraph::Direction::Incoming;
use petgraph::stable_graph::StableGraph;
use petgraph::stable_graph::NodeIndex;
use serde::{Deserialize, Serialize};
use sunscreen_compiler_common::Operation;
use sunscreen_compiler_common::Type;
use sunscreen_compiler_common::{EdgeInfo, NodeInfo};

#[derive(Clone, Serialize, Deserialize)]
pub struct SerializedSealData {
    pub value: i64,
    pub data_type: Type,
    pub noise_budget: Option<u32>,
    pub coefficients: Vec<Vec<u64>>,
    pub multiplicative_depth: u64,
}

/**
 * Gets the multiplicative depth of a node in the compilation graph.
 */

pub fn get_mult_depth<O>(
    graph: &StableGraph<NodeInfo<O>, EdgeInfo>,
    node: NodeIndex,
    mut depth: u64,
) -> u64
where
    O: Operation,
{
    if graph.node_weight(node).unwrap().operation.is_multiplication() {
        depth += 1;
    }

    let neighbors = graph.neighbors_directed(node, Incoming);
    if neighbors.clone().count() == 0 {
        return depth; 
    }
    let mut max_depth = 0;
    for neighbor in neighbors.clone() {
        let neighbor_depth = get_mult_depth(graph, neighbor, depth);
        max_depth = max_depth.max(neighbor_depth);
    }

    max_depth
}

#[test]
fn test_get_mul_depth() {

}