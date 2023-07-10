use crate::{EdgeInfo, FheProgram, IRError, NodeError, OutputType};
use crate::{Operation::*, OutputTypeTrait};
use petgraph::{algo::greedy_feedback_arc_set, stable_graph::NodeIndex, visit::EdgeRef, Direction};

pub(crate) fn validate_ir(ir: &FheProgram) -> Vec<IRError> {
    let mut errors = vec![];

    errors.append(&mut ir_has_no_cycle(ir));

    errors.append(&mut validate_nodes(ir));

    errors
}

pub(crate) fn ir_has_no_cycle(ir: &FheProgram) -> Vec<IRError> {
    let mut errors = vec![];

    if greedy_feedback_arc_set(&ir.graph.graph).next().is_some() {
        errors.push(IRError::IRHasCycles);
    }

    errors
}

pub(crate) fn validate_nodes(ir: &FheProgram) -> Vec<IRError> {
    let mut errors = vec![];

    for i in ir.graph.node_indices() {
        let node_info = &ir.graph[i];
        let node_errors = match ir.graph[i].operation {
            Add => Some(validate_binary_op_has_correct_operands(
                ir,
                i,
                OutputType::Ciphertext,
                OutputType::Ciphertext,
            )),
            Sub => Some(validate_binary_op_has_correct_operands(
                ir,
                i,
                OutputType::Ciphertext,
                OutputType::Ciphertext,
            )),
            SubPlaintext => Some(validate_binary_op_has_correct_operands(
                ir,
                i,
                OutputType::Ciphertext,
                OutputType::Plaintext,
            )),
            Multiply => Some(validate_binary_op_has_correct_operands(
                ir,
                i,
                OutputType::Ciphertext,
                OutputType::Ciphertext,
            )),
            MultiplyPlaintext => Some(validate_binary_op_has_correct_operands(
                ir,
                i,
                OutputType::Ciphertext,
                OutputType::Plaintext,
            )),
            AddPlaintext => Some(validate_binary_op_has_correct_operands(
                ir,
                i,
                OutputType::Ciphertext,
                OutputType::Plaintext,
            )),
            ShiftLeft => None,
            ShiftRight => None,
            Negate => Some(validate_unary_op_has_correct_operands(ir, i)),
            InputCiphertext(_) => None,
            InputPlaintext(_) => None,
            OutputCiphertext => Some(validate_unary_op_has_correct_operands(ir, i)),
            Relinearize => Some(validate_unary_op_has_correct_operands(ir, i)),
            Literal(_) => None,
            SwapRows => None,
        };

        if let Some(node_errors) = node_errors {
            errors.append(
                &mut node_errors
                    .into_iter()
                    .map(|e| IRError::node_error(i, node_info.operation.to_string(), e))
                    .collect(),
            )
        }
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
        return vec![NodeError::wrong_operand_count(2, operand_count)];
    }

    let mut errors = vec![];

    let (left, right) = get_left_right_operands(ir, index);

    match left {
        None => {
            errors.push(NodeError::MissingOperand(EdgeInfo::Left));
        }
        Some(x) => {
            if !ir.graph.contains_node(x) {
                errors.push(NodeError::MissingParent(x))
            } else if ir.graph[x].output_type() != expected_left_output {
                errors.push(NodeError::parent_has_incorrect_output_type(
                    EdgeInfo::Left,
                    ir.graph[x].output_type(),
                    expected_left_output,
                ));
            }
        }
    };

    match right {
        None => {
            errors.push(NodeError::MissingOperand(EdgeInfo::Right));
        }
        Some(x) => {
            if !ir.graph.contains_node(x) {
                errors.push(NodeError::MissingParent(x))
            } else if ir.graph[x].output_type() != expected_right_output {
                errors.push(NodeError::parent_has_incorrect_output_type(
                    EdgeInfo::Right,
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
        return vec![NodeError::wrong_operand_count(1, operand_count)];
    }

    let mut errors = vec![];

    let operand = get_unary_operand(ir, index);

    if operand.is_none() {
        errors.push(NodeError::MissingOperand(EdgeInfo::Unary));
    }

    errors
}

fn get_left_right_operands(
    ir: &FheProgram,
    index: NodeIndex,
) -> (Option<NodeIndex>, Option<NodeIndex>) {
    let left = ir
        .graph
        .edges_directed(index, Direction::Incoming)
        .filter(|e| e.weight().is_left())
        .map(|e| e.source())
        .next();

    let right = ir
        .graph
        .edges_directed(index, Direction::Incoming)
        .filter(|e| e.weight().is_right())
        .map(|e| e.source())
        .next();

    (left, right)
}

pub fn get_unary_operand(ir: &FheProgram, index: NodeIndex) -> Option<NodeIndex> {
    ir.graph
        .edges_directed(index, Direction::Incoming)
        .filter(|e| e.weight().is_unary())
        .map(|e| e.source())
        .next()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{FheProgramTrait, SchemeType};

    // FheProgram objects created with the API are guaranteed
    // to never produce errors. We may only deserialize an erroneous IR.

    #[test]
    fn no_errors_for_ok_ir() {
        let mut ir = FheProgram::new(SchemeType::Bfv);
        let a = ir.add_input_ciphertext(0);
        let b = ir.add_input_ciphertext(1);
        ir.add_add(a, b);

        assert_eq!(validate_ir(&ir).len(), 0);
    }

    #[test]
    fn error_for_cycle() {
        let ir_str = serde_json::json!({
          "data": "Bfv",
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
                "Left"
              ],
              [
                1,
                2,
                "Right"
              ],
              [
                2,
                0,
                "Right"
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
          "data": "Bfv",
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
                "Left"
              ],
              [
                1,
                2,
                "Left"
              ],
            ]
          }
        });

        let ir: FheProgram = serde_json::from_value(ir_str).unwrap();

        let errors = validate_ir(&ir);

        assert_eq!(errors.len(), 1);
        assert_eq!(
            errors[0],
            IRError::node_error(
                NodeIndex::from(2),
                "Add".to_owned(),
                NodeError::MissingOperand(EdgeInfo::Right)
            )
        );
    }

    #[test]
    fn add_too_few_operands() {
        let ir_str = serde_json::json!({
          "data": "Bfv",
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
                "Left"
              ],
            ]
          }
        });

        let ir: FheProgram = serde_json::from_value(ir_str).unwrap();

        let errors = validate_ir(&ir);

        assert_eq!(errors.len(), 1);
        assert_eq!(
            errors[0],
            IRError::node_error(
                NodeIndex::from(2),
                "Add".to_owned(),
                NodeError::wrong_operand_count(2, 1)
            )
        );
    }

    #[test]
    fn add_too_many_operands() {
        let ir_str = serde_json::json!({
          "data": "Bfv",
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
                "Left"
              ],
              [
                0,
                2,
                "Right"
              ],
              [
                0,
                2,
                "Left"
              ],
            ]
          }
        });

        let ir: FheProgram = serde_json::from_value(ir_str).unwrap();

        let errors = validate_ir(&ir);

        assert_eq!(errors.len(), 1);
        assert_eq!(
            errors[0],
            IRError::node_error(
                NodeIndex::from(2),
                "Add".to_owned(),
                NodeError::wrong_operand_count(2, 3)
            )
        );
    }
}
