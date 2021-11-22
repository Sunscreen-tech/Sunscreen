use crate::Operation::*;
use crate::{EdgeInfo, Error, IRError, IntermediateRepresentation, NodeError, Result};
use petgraph::{algo::greedy_feedback_arc_set, stable_graph::NodeIndex, visit::EdgeRef, Direction};

pub fn validate_ir(ir: &IntermediateRepresentation) -> Vec<IRError> {
    let mut errors = vec![];

    errors.append(&mut ir_has_no_cycle(ir));

    errors.append(&mut validate_nodes(ir));

    errors
}

pub fn ir_has_no_cycle(ir: &IntermediateRepresentation) -> Vec<IRError> {
    let mut errors = vec![];

    if greedy_feedback_arc_set(&ir.graph).next() != None {
        errors.push(IRError::IRHasCycles);
    }

    errors
}

pub fn validate_nodes(ir: &IntermediateRepresentation) -> Vec<IRError> {
    let mut errors = vec![];

    for i in ir.graph.node_indices() {
        let node_info = &ir.graph[i];
        let error = match ir.graph[i].operation {
            Add => {
                errors.append(
                    &mut validate_binary_op_has_correct_operands(ir, i)
                        .iter()
                        .map(|e| IRError::NodeError(i, node_info.to_string(), *e))
                        .collect(),
                );
            }
            Sub => {
                errors.append(
                    &mut validate_binary_op_has_correct_operands(ir, i)
                        .iter()
                        .map(|e| IRError::NodeError(i, node_info.to_string(), *e))
                        .collect(),
                );
            }
            Multiply => {
                errors.append(
                    &mut validate_binary_op_has_correct_operands(ir, i)
                        .iter()
                        .map(|e| IRError::NodeError(i, node_info.to_string(), *e))
                        .collect(),
                );
            }
            ShiftLeft => {}
            ShiftRight => {}
            Negate => {
                errors.append(
                    &mut validate_unary_op_has_correct_operands(ir, i)
                        .iter()
                        .map(|e| IRError::NodeError(i, node_info.to_string(), *e))
                        .collect(),
                );
            }
            InputCiphertext(_) => {}
            OutputCiphertext => {
                errors.append(
                    &mut validate_unary_op_has_correct_operands(ir, i)
                        .iter()
                        .map(|e| IRError::NodeError(i, node_info.to_string(), *e))
                        .collect(),
                );
            }
            Relinearize => {
                errors.append(
                    &mut validate_unary_op_has_correct_operands(ir, i)
                        .iter()
                        .map(|e| IRError::NodeError(i, node_info.to_string(), *e))
                        .collect(),
                );
            }
            Literal(_) => {}
            SwapRows => {}
        };
    }

    errors
}

fn validate_binary_op_has_correct_operands(
    ir: &IntermediateRepresentation,
    index: NodeIndex,
) -> Vec<NodeError> {
    let operand_count = ir.graph.edges_directed(index, Direction::Incoming).count();

    if operand_count != 2 {
        return vec![NodeError::WrongOperandCount(2, operand_count)];
    }

    let mut errors = vec![];

    let (left, right) = get_left_right_operands(ir, index);

    match left {
        None => {
            errors.push(NodeError::MissingOperand(EdgeInfo::LeftOperand));
        }
        _ => {}
    };

    match right {
        None => {
            errors.push(NodeError::MissingOperand(EdgeInfo::RightOperand));
        }
        _ => {}
    };

    errors
}

fn validate_unary_op_has_correct_operands(
    ir: &IntermediateRepresentation,
    index: NodeIndex,
) -> Vec<NodeError> {
    let operand_count = ir.graph.edges_directed(index, Direction::Incoming).count();

    if operand_count != 1 {
        return vec![NodeError::WrongOperandCount(1, operand_count)];
    }

    let mut errors = vec![];

    let operand = get_unary_operand(ir, index);

    match operand {
        None => {
            errors.push(NodeError::MissingOperand(EdgeInfo::UnaryOperand));
        }
        _ => {}
    };

    errors
}

fn get_left_right_operands(
    ir: &IntermediateRepresentation,
    index: NodeIndex,
) -> (Option<NodeIndex>, Option<NodeIndex>) {
    let left = ir
        .graph
        .edges_directed(index, Direction::Incoming)
        .filter(|e| *e.weight() == EdgeInfo::LeftOperand)
        .map(|e| e.source())
        .nth(0);

    let right = ir
        .graph
        .edges_directed(index, Direction::Incoming)
        .filter(|e| *e.weight() == EdgeInfo::RightOperand)
        .map(|e| e.source())
        .nth(0);

    (left, right)
}

pub fn get_unary_operand(ir: &IntermediateRepresentation, index: NodeIndex) -> Option<NodeIndex> {
    ir.graph
        .edges_directed(index, Direction::Incoming)
        .filter(|e| *e.weight() == EdgeInfo::UnaryOperand)
        .map(|e| e.source())
        .nth(0)
}
