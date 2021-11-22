use petgraph::stable_graph::NodeIndex;

use crate::EdgeInfo;

/**
 * The name of an [`Operation`](crate::Operation)
 */
pub type OpName = String;

#[derive(Debug, Clone)]
/**
 * Represents an error that can occur in this crate.
 */
pub enum Error {
    /**
     * The given [`IntermediateRepresentation`](crate::IntermediateRepresentation) has
     * one or more errors. The inner value is the list of errors.
     */
    IRError(Vec<IRError>),
}

/**
 * An error in an [`IntermediateRepresentation`](crate::IntermediateRepresentation).
 */
#[derive(Debug, Clone)]
pub enum IRError {
    /**
     * The IR has a cycle.
     */
    IRHasCycles,

    /**
     * A node in the IR has an error.
     */
    NodeError(NodeIndex, OpName, NodeError),
}

/**
 * An error on a node in an [`IntermediateRepresentation`](crate::IntermediateRepresentation).
 */
#[derive(Debug, Clone, Copy)]
pub enum NodeError {
    /**
     * The node is missing an expected operand of the contained type.
     */
    MissingOperand(EdgeInfo),

    /**
     * The node has expects a specific number of input operands (first argument),
     * but got some other number (second argument).
     */
    WrongOperandCount(usize, usize),
}

/**
 * Wrapper around [`Result`](std::result::Result) with this crate's error type.
 */
pub type Result<T> = std::result::Result<T, Error>;
