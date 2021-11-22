use petgraph::stable_graph::NodeIndex;

use crate::EdgeInfo;

pub type OpName = String;

#[derive(Debug, Clone)]
pub enum Error {
    IRError(Vec<IRError>),
}

/**
 * Represents an error that can occur in this crate.
 */
#[derive(Debug, Clone)]
pub enum IRError {
    IRHasCycles,
    NodeError(NodeIndex, OpName, NodeError),
}

/**
 * An error on a node in the [`IntermediateRepresentation`](crate::IntermediateRepresentation).
 */
#[derive(Debug, Clone, Copy)]
pub enum NodeError {
    MissingOperand(EdgeInfo),

    WrongOperandCount(usize, usize),
}

/**
 * Wrapper around [`Result`](std::result::Result) with this crate's error type.
 */
pub type Result<T> = std::result::Result<T, Error>;
