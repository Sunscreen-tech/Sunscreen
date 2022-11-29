use petgraph::stable_graph::NodeIndex;
use static_assertions::const_assert;

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
    IRError(Box<Vec<IRError>>),

    /**
     * Attempted to deserialize and unknown scheme type.
     */
    InvalidSchemeType,
}

const_assert!(std::mem::size_of::<Error>() <= 16);

impl Error {
    /**
     * Creates an [`Error::IRError`].
     */
    pub fn ir_error(inner: &[IRError]) -> Self {
        Self::IRError(Box::new(inner.to_owned()))
    }
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
    NodeError(Box<(NodeIndex, OpName, NodeError)>),
}

impl IRError {
    /**
     * Creates an [`IRError::NodeError`].
     */
    pub fn node_error(node_id: NodeIndex, op: OpName, inner: NodeError) -> Self {
        Self::NodeError(Box::new((node_id, op, inner)))
    }
}

const_assert!(std::mem::size_of::<IRError>() <= 16);

/**
 * An error on a node in an [`FheProgram`](crate::FheProgram).
 */
#[derive(Debug, Clone, PartialEq, Eq)]
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
    ParentHasIncorrectOutputType(Box<(EdgeInfo, OutputType, OutputType)>),

    /**
     * The node has expects a specific number of input operands (first argument),
     * but got some other number (second argument).
     */
    WrongOperandCount(Box<(usize, usize)>),
}

impl NodeError {
    /**
     * Creates a [`NodeError::ParentHasIncorrectOutputType`].
     */
    pub fn parent_has_incorrect_output_type(edge: EdgeInfo, expected: OutputType, actual: OutputType) -> Self {
        Self::ParentHasIncorrectOutputType(Box::new((edge, expected, actual)))
    }

    /**
     * Creates a [`NodeError::WrongOperandCount`].
     */
    pub fn wrong_operand_count(expected: usize, actual: usize) -> Self {
        Self::WrongOperandCount(Box::new((expected, actual)))
    }
}

const_assert!(std::mem::size_of::<NodeError>() <= 16);

/**
 * Wrapper around [`Result`](std::result::Result) with this crate's error type.
 */
pub type Result<T> = std::result::Result<T, Error>;
