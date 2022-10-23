use petgraph::stable_graph::NodeIndex;

use crate::{EdgeInfo, OutputType};

/**
 * The name of an [`Operation`](crate::Operation)
 */
pub type OpName = String;

#[derive(Debug, Clone, PartialEq, Eq)]
/**
 * Represents an error that can occur in this crate.
 */
pub enum Error {
    /**
     * The given [`FheProgram`](crate::FheProgram) has
     * one or more errors. The inner value is the list of errors.
     */
    IRError(Vec<IRError>),

    /**
     * Attempted to deserialize and unknown scheme type.
     */
    InvalidSchemeType,
}

/**
 * An error in an [`FheProgram`](crate::FheProgram).
 */
#[derive(Debug, Clone, PartialEq, Eq)]
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
 * An error on a node in an [`FheProgram`](crate::FheProgram).
 */
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NodeError {
    /**
     * The node is missing an expected operand of the contained type.
     */
    MissingOperand(EdgeInfo),

    /**
     * The parent node specified at the given [`EdgeInfo`] does not exist.
     */
    MissingParent(NodeIndex),

    /**
     * For the parent at EdgeInfo (first argument), the expected
     * output type (second argument) does not match the actual
     * (third argument) output type.
     */
    ParentHasIncorrectOutputType(EdgeInfo, OutputType, OutputType),

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
