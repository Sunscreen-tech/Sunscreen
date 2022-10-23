use crate::Operation::*;
use crate::{EdgeInfo, FheProgram, IRError, NodeError, OutputType};
use petgraph::{algo::greedy_feedback_arc_set, stable_graph::NodeIndex, visit::EdgeRef, Direction};

pub(crate) fn validate_ir(ir: &FheProgram) -> Vec<IRError> {
    let mut errors = vec![];

    errors.append(&mut ir_has_no_cycle(ir));

    errors.append(&mut validate_nodes(ir));

    errors
}

pub(crate) fn ir_has_no_cycle(ir: &FheProgram) -> Vec<IRError> {
    let mut errors = vec![];

    if greedy_feedback_arc_set(&ir.graph).next() != None {
        errors.push(IRError::IRHasCycles);
    }

    errors
}

pub(crate) fn validate_nodes(ir: &FheProgram) -> Vec<IRError> {
    let mut errors = vec![];

    for i in ir.graph.node_indices() {
        let node_info = &ir.graph[i];
        match ir.graph[i].operation {
            Add => {
                errors.append(
                    &mut validate_binary_op_has_correct_operands(
                        ir,
                        i,
                        OutputType::Ciphertext,
                        OutputType::Ciphertext,
                    )
                    .iter()
                    .map(|e| IRError::NodeError(i, node_info.to_string(), *e))
                    .collect(),
                );
            }
            Sub => {
                errors.append(
                    &mut validate_binary_op_has_correct_operands(
                        ir,
                        i,
                        OutputType::Ciphertext,
                        OutputType::Ciphertext,
                    )
                    .iter()
                    .map(|e| IRError::NodeError(i, node_info.to_string(), *e))
                    .collect(),
                );
            }
            SubPlaintext => {
                errors.append(
                    &mut validate_binary_op_has_correct_operands(
                        ir,
                        i,
                        OutputType::Ciphertext,
                        OutputType::Plaintext,
                    )
                    .iter()
                    .map(|e| IRError::NodeError(i, node_info.to_string(), *e))
                    .collect(),
                );
            }
            Multiply => {
                errors.append(
                    &mut validate_binary_op_has_correct_operands(
                        ir,
                        i,
                        OutputType::Ciphertext,
                        OutputType::Ciphertext,
                    )
                    .iter()
                    .map(|e| IRError::NodeError(i, node_info.to_string(), *e))
                    .collect(),
                );
            }
            MultiplyPlaintext => {
                errors.append(
                    &mut validate_binary_op_has_correct_operands(
                        ir,
                        i,
                        OutputType::Ciphertext,
                        OutputType::Plaintext,
                    )
                    .iter()
                    .map(|e| IRError::NodeError(i, node_info.to_string(), *e))
                    .collect(),
                );
            }
            AddPlaintext => {
                errors.append(
                    &mut validate_binary_op_has_correct_operands(
                        ir,
                        i,
                        OutputType::Ciphertext,
                        OutputType::Plaintext,
                    )
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
            InputPlaintext(_) => {}
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
    ir: &FheProgram,
    index: NodeIndex,
    expected_left_output: OutputType,
    expected_right_output: OutputType,
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
        Some(x) => {
            if !ir.graph.contains_node(x) {
                errors.push(NodeError::MissingParent(x))
            } else if ir.graph[x].output_type() != expected_left_output {
                errors.push(NodeError::ParentHasIncorrectOutputType(
                    EdgeInfo::LeftOperand,
                    ir.graph[x].output_type(),
                    expected_left_output,
                ));
            }
        }
    };

    match right {
        None => {
            errors.push(NodeError::MissingOperand(EdgeInfo::RightOperand));
        }
        Some(x) => {
            if !ir.graph.contains_node(x) {
                errors.push(NodeError::MissingParent(x))
            } else if ir.graph[x].output_type() != expected_right_output {
                errors.push(NodeError::ParentHasIncorrectOutputType(
                    EdgeInfo::RightOperand,
                    ir.graph[x].output_type(),
                    expected_right_output,
                ));
            }
        }
    };

    errors
}

fn validate_unary_op_has_correct_operands(ir: &FheProgram, index: NodeIndex) -> Vec<NodeError> {
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
    ir: &FheProgram,
    index: NodeIndex,
) -> (Option<NodeIndex>, Option<NodeIndex>) {
    let left = ir
        .graph
        .edges_directed(index, Direction::Incoming)
        .filter(|e| *e.weight() == EdgeInfo::LeftOperand)
        .map(|e| e.source())
        .next();

    let right = ir
        .graph
        .edges_directed(index, Direction::Incoming)
        .filter(|e| *e.weight() == EdgeInfo::RightOperand)
        .map(|e| e.source())
        .next();

    (left, right)
}

pub fn get_unary_operand(ir: &FheProgram, index: NodeIndex) -> Option<NodeIndex> {
    ir.graph
        .edges_directed(index, Direction::Incoming)
        .filter(|e| *e.weight() == EdgeInfo::UnaryOperand)
        .map(|e| e.source())
        .next()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::SchemeType;

    // FheProgram objects created with the API are guaranteed
    // to never produce errors. We may only deserialize an erroneous IR.

    #[test]
    fn no_errors_for_ok_ir() {
        let mut ir = FheProgram::new(SchemeType::Bfv);
        let a = ir.append_input_ciphertext(0);
        let b = ir.append_input_ciphertext(1);
        ir.append_add(a, b);

        assert_eq!(validate_ir(&ir).len(), 0);
    }

    #[test]
    fn error_for_cycle() {
        let ir_str = serde_json::json!({
          "scheme": "Bfv",
          "graph": {
            "nodes": [
              {
                "operation": {
                  "InputCiphertext": 0
                }
              },
              {
                "operation": {
                  "InputCiphertext": 1
                }
              },
              {
                "operation": "Add"
              }
            ],
            "node_holes": [],
            "edge_property": "directed",
            "edges": [
              [
                0,
                2,
                "LeftOperand"
              ],
              [
                1,
                2,
                "RightOperand"
              ],
              [
                2,
                0,
                "RightOperand"
              ]
            ]
          }
        });

        let ir: FheProgram = serde_json::from_value(ir_str).unwrap();

        let errors = validate_ir(&ir);

        assert_eq!(errors.len(), 1);
        assert_eq!(errors[0], IRError::IRHasCycles);
    }

    #[test]
    fn add_wrong_operands() {
        let ir_str = serde_json::json!({
          "scheme": "Bfv",
          "graph": {
            "nodes": [
              {
                "operation": {
                  "InputCiphertext": 0
                }
              },
              {
                "operation": {
                  "InputCiphertext": 1
                }
              },
              {
                "operation": "Add"
              }
            ],
            "node_holes": [],
            "edge_property": "directed",
            "edges": [
              [
                0,
                2,
                "LeftOperand"
              ],
              [
                1,
                2,
                "LeftOperand"
              ],
            ]
          }
        });

        let ir: FheProgram = serde_json::from_value(ir_str).unwrap();

        let errors = validate_ir(&ir);

        assert_eq!(errors.len(), 1);
        assert_eq!(
            errors[0],
            IRError::NodeError(
                NodeIndex::from(2),
                "Add".to_owned(),
                NodeError::MissingOperand(EdgeInfo::RightOperand)
            )
        );
    }

    #[test]
    fn add_too_few_operands() {
        let ir_str = serde_json::json!({
          "scheme": "Bfv",
          "graph": {
            "nodes": [
              {
                "operation": {
                  "InputCiphertext": 0
                }
              },
              {
                "operation": {
                  "InputCiphertext": 1
                }
              },
              {
                "operation": "Add"
              }
            ],
            "node_holes": [],
            "edge_property": "directed",
            "edges": [
              [
                0,
                2,
                "LeftOperand"
              ],
            ]
          }
        });

        let ir: FheProgram = serde_json::from_value(ir_str).unwrap();

        let errors = validate_ir(&ir);

        assert_eq!(errors.len(), 1);
        assert_eq!(
            errors[0],
            IRError::NodeError(
                NodeIndex::from(2),
                "Add".to_owned(),
                NodeError::WrongOperandCount(2, 1)
            )
        );
    }

    #[test]
    fn add_too_many_operands() {
        let ir_str = serde_json::json!({
          "scheme": "Bfv",
          "graph": {
            "nodes": [
              {
                "operation": {
                  "InputCiphertext": 0
                }
              },
              {
                "operation": {
                  "InputCiphertext": 1
                }
              },
              {
                "operation": "Add"
              }
            ],
            "node_holes": [],
            "edge_property": "directed",
            "edges": [
              [
                0,
                2,
                "LeftOperand"
              ],
              [
                0,
                2,
                "RightOperand"
              ],
              [
                0,
                2,
                "LeftOperand"
              ],
            ]
          }
        });

        let ir: FheProgram = serde_json::from_value(ir_str).unwrap();

        let errors = validate_ir(&ir);

        assert_eq!(errors.len(), 1);
        assert_eq!(
            errors[0],
            IRError::NodeError(
                NodeIndex::from(2),
                "Add".to_owned(),
                NodeError::WrongOperandCount(2, 3)
            )
        );
    }
}
