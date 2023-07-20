use petgraph::Direction::Incoming;
use petgraph::adj::NodeIndex;
use petgraph::stable_graph::StableGraph;
use sunscreen_compiler_common::{NodeInfo, EdgeInfo};
use sunscreen_compiler_common::Operation;
use serde::{Deserialize, Serialize};
use sunscreen_compiler_common::Type;
use petgraph::visit::{Dfs, Walker, IntoNeighborsDirected};

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
pub fn get_mult_depth<O>(
    graph: &StableGraph<NodeInfo<O>, EdgeInfo>, 
    node: NodeIndex,
    depth: u64
) -> u64
    where O: Operation
{
    0
}