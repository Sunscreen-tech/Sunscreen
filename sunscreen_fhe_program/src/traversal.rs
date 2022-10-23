use crate::{EdgeInfo, FheProgram};
use petgraph::{stable_graph::NodeIndex, visit::EdgeRef, Direction};

/**
 * Gets the two input operands and returns a tuple of left, right. For some operations
 * (i.e. subtraction), order matters. While it's erroneous for a binary operations to have
 * anything other than a single left and single right operand, having more operands will result
 * in one being selected arbitrarily. Validating the [`FheProgram`] will
 * reveal having the wrong number of operands.
 *
 * # Panics
 * Panics if the given node doesn't have at least one left and one right operand. Calling
 * [`validate()`](crate::FheProgram::validate()) should reveal this
 * issue.
 */
pub fn get_left_right_operands(ir: &FheProgram, index: NodeIndex) -> (NodeIndex, NodeIndex) {
    let left = ir
        .graph
        .edges_directed(index, Direction::Incoming)
        .filter(|e| *e.weight() == EdgeInfo::LeftOperand)
        .map(|e| e.source())
        .next()
        .unwrap();

    let right = ir
        .graph
        .edges_directed(index, Direction::Incoming)
        .filter(|e| *e.weight() == EdgeInfo::RightOperand)
        .map(|e| e.source())
        .next()
        .unwrap();

    (left, right)
}

/**
 * Gets the single unary input operand for the given node. If the [`FheProgram`]
 * is malformed and the node has more than one UnaryOperand, one will be selected arbitrarily.
 * As such, one should validate the [`FheProgram`] before calling this method.
 *
 * # Panics
 * Panics if the given node doesn't have at least one unary operant. Calling
 * [`validate()`](crate::FheProgram::validate()) should reveal this
 * issue.
 */
pub fn get_unary_operand(ir: &FheProgram, index: NodeIndex) -> NodeIndex {
    ir.graph
        .edges_directed(index, Direction::Incoming)
        .filter(|e| *e.weight() == EdgeInfo::UnaryOperand)
        .map(|e| e.source())
        .next()
        .unwrap()
}
