use std::collections::HashMap;

use petgraph::{
    stable_graph::{EdgeReference, NodeIndex, StableGraph},
    visit::EdgeRef,
    Direction,
};

use crate::graph::{forward_traverse, GraphQuery};

use crate::{
    transforms::{GraphTransforms, Transform, TransformNodeIndex},
    EdgeInfo, NodeInfo, Operation,
};

/**
 * Returns the left and right edges for a binary operand.
 *
 * # Panics
 * Panics if:
 * * The node at the given index doesn't exist.
 * * The node at the given index isn't a binary operation.
 * * The node at the given index doesn't have a left and a right operand.
 */
fn get_binary_operands<O: Operation>(
    graph_query: &GraphQuery<NodeInfo<O>, EdgeInfo>,
    node_index: NodeIndex,
) -> (NodeIndex, NodeIndex) {
    let edge_infos = graph_query
        .edges_directed(node_index, Direction::Incoming)
        .collect::<Vec<EdgeReference<EdgeInfo>>>();

    assert_eq!(edge_infos.len(), 2);

    match edge_infos[0].weight() {
        EdgeInfo::Left => {
            assert!(edge_infos[1].weight().is_right());

            let left_edge = edge_infos[0].source();
            let right_edge = edge_infos[1].source();

            (left_edge, right_edge)
        }
        EdgeInfo::Right => {
            assert!(edge_infos[1].weight().is_left());

            let left_edge = edge_infos[1].source();
            let right_edge = edge_infos[0].source();

            (left_edge, right_edge)
        }
        _ => panic!("Unexpected edge type"),
    }
}

/**
 * For the given compilation graph, perform common subexpression
 * elimination (CSE).
 *
 * # Remarks
 * CSE is an optimization that collapses and reuses redundance
 * computations. For example:
 * ```ignore
 * a = b + c * d
 * e = c * d + 42
 * ```
 * The `c * d` subexpression can be computed once and shared between
 * the two expressions.
 */
pub fn common_subexpression_elimination<O: Operation>(
    graph: &mut StableGraph<NodeInfo<O>, EdgeInfo>,
) {
    forward_traverse(graph, |query, index| {
        let mut transforms: GraphTransforms<NodeInfo<O>, EdgeInfo> = GraphTransforms::new();

        // Key is left/unary+right operand and operation. Value is
        // the node that matches such a key.
        let mut visited_nodes = HashMap::<(NodeIndex, Option<NodeIndex>, O), NodeIndex>::new();

        // Look through out immediate children. If we find any of the
        // type that share an edge with another node, consolidate them into
        // one and fix up their outputs.
        for e in query.neighbors_directed(index, Direction::Outgoing) {
            let child_node = query.get_node(e);

            // Moves all the edges from removed_node to node_to_add and
            // deleted removed_node
            let mut move_edges = |node_to_add, removed_node| {
                let node_to_add = TransformNodeIndex::NodeIndex(node_to_add);

                for e in query.edges_directed(removed_node, Direction::Outgoing) {
                    let edge = TransformNodeIndex::NodeIndex(e.target());
                    let info = e.weight();

                    transforms.push(Transform::AddEdge(node_to_add, edge, *info));
                }

                transforms.push(Transform::RemoveNode(TransformNodeIndex::NodeIndex(
                    removed_node,
                )));
            };

            let child_op = child_node.operation;

            if child_op.is_binary() {
                let (left, right) = get_binary_operands(&query, e);

                match visited_nodes.get(&(left, Some(right), child_node.operation)) {
                    Some(equiv_node) => {
                        move_edges(*equiv_node, e);
                    }
                    None => {
                        visited_nodes.insert((left, Some(right), child_node.operation), e);

                        if child_op.is_commutative() {
                            visited_nodes.insert((right, Some(left), child_node.operation), e);
                        }
                    }
                };
            } else if child_op.is_unary() {
                // Unary
                let equiv_node = visited_nodes.get(&(index, None, child_node.operation));

                match equiv_node {
                    Some(equiv_node) => move_edges(*equiv_node, e),
                    None => {
                        visited_nodes.insert((index, None, child_node.operation), e);
                    }
                }
            }
        }

        transforms
    });
}

#[cfg(test)]
mod tests {
    use crate::FrontendCompilation;

    use super::Operation as OperationTrait;
    use super::*;
    use petgraph::{algo::is_isomorphic_matching, Graph};

    #[derive(Clone, Copy, Debug, Hash, PartialEq, Eq)]
    enum Operation {
        Add,
        Sub,
        Mul,
        Neg,
        PublicInput(NodeIndex),
    }

    impl OperationTrait for Operation {
        fn is_binary(&self) -> bool {
            matches!(self, Operation::Add | Operation::Mul | Operation::Sub)
        }

        fn is_commutative(&self) -> bool {
            matches!(self, Operation::Mul | Operation::Add)
        }

        fn is_unary(&self) -> bool {
            matches!(self, Operation::Neg)
        }
    }

    fn get_graph() -> FrontendCompilation<Operation> {
        fn make_node(operation: Operation) -> NodeInfo<Operation> {
            NodeInfo { operation }
        }

        let mut fe = FrontendCompilation::new();

        // Layer 1
        let in_1 = fe.add_node(make_node(Operation::PublicInput(NodeIndex::from(0))));
        let in_2 = fe.add_node(make_node(Operation::PublicInput(NodeIndex::from(1))));
        let in_3 = fe.add_node(make_node(Operation::PublicInput(NodeIndex::from(2))));

        // Layer 2
        // sub_2 gets eliminated.
        // add_2, add_3 get eliminated
        // mul_2, mul_3 get eliminated
        let sub_1 = fe.add_node(make_node(Operation::Sub));
        let sub_2 = fe.add_node(make_node(Operation::Sub));
        let sub_3 = fe.add_node(make_node(Operation::Sub));
        let sub_4 = fe.add_node(make_node(Operation::Sub));

        fe.add_edge(in_1, sub_1, EdgeInfo::Left);
        fe.add_edge(in_2, sub_1, EdgeInfo::Right);
        fe.add_edge(in_1, sub_2, EdgeInfo::Left);
        fe.add_edge(in_2, sub_2, EdgeInfo::Right);
        fe.add_edge(in_1, sub_3, EdgeInfo::Right);
        fe.add_edge(in_2, sub_3, EdgeInfo::Left);
        fe.add_edge(in_1, sub_4, EdgeInfo::Right);
        fe.add_edge(in_3, sub_4, EdgeInfo::Left);

        let add_1 = fe.add_node(make_node(Operation::Add));
        let add_2 = fe.add_node(make_node(Operation::Add));
        let add_3 = fe.add_node(make_node(Operation::Add));
        let add_4 = fe.add_node(make_node(Operation::Add));

        fe.add_edge(in_1, add_1, EdgeInfo::Left);
        fe.add_edge(in_2, add_1, EdgeInfo::Right);
        fe.add_edge(in_1, add_2, EdgeInfo::Left);
        fe.add_edge(in_2, add_2, EdgeInfo::Right);
        fe.add_edge(in_1, add_3, EdgeInfo::Right);
        fe.add_edge(in_2, add_3, EdgeInfo::Left);
        fe.add_edge(in_1, add_4, EdgeInfo::Right);
        fe.add_edge(in_3, add_4, EdgeInfo::Left);

        let mul_1 = fe.add_node(make_node(Operation::Mul));
        let mul_2 = fe.add_node(make_node(Operation::Mul));
        let mul_3 = fe.add_node(make_node(Operation::Mul));
        let mul_4 = fe.add_node(make_node(Operation::Mul));

        fe.add_edge(in_1, mul_1, EdgeInfo::Left);
        fe.add_edge(in_2, mul_1, EdgeInfo::Right);
        fe.add_edge(in_1, mul_2, EdgeInfo::Left);
        fe.add_edge(in_2, mul_2, EdgeInfo::Right);
        fe.add_edge(in_1, mul_3, EdgeInfo::Right);
        fe.add_edge(in_2, mul_3, EdgeInfo::Left);
        fe.add_edge(in_1, mul_4, EdgeInfo::Right);
        fe.add_edge(in_3, mul_4, EdgeInfo::Left);

        let neg_1 = fe.add_node(make_node(Operation::Neg));
        let neg_2 = fe.add_node(make_node(Operation::Neg));
        let neg_3 = fe.add_node(make_node(Operation::Neg));

        fe.add_edge(in_1, neg_1, EdgeInfo::Unary);
        fe.add_edge(in_1, neg_2, EdgeInfo::Unary);
        fe.add_edge(in_2, neg_3, EdgeInfo::Unary);

        // Layer 3
        let out_1 = fe.add_node(make_node(Operation::Add));
        let out_2 = fe.add_node(make_node(Operation::Add));
        let out_3 = fe.add_node(make_node(Operation::Add));
        let out_4 = fe.add_node(make_node(Operation::Add));
        let out_5 = fe.add_node(make_node(Operation::Add));
        let out_6 = fe.add_node(make_node(Operation::Add));

        fe.add_edge(sub_1, out_1, EdgeInfo::Left);
        fe.add_edge(add_1, out_1, EdgeInfo::Right);
        fe.add_edge(sub_2, out_2, EdgeInfo::Left);
        fe.add_edge(add_2, out_2, EdgeInfo::Right);
        fe.add_edge(sub_3, out_3, EdgeInfo::Left);
        fe.add_edge(add_3, out_3, EdgeInfo::Right);
        fe.add_edge(sub_4, out_4, EdgeInfo::Left);
        fe.add_edge(add_4, out_4, EdgeInfo::Right);
        fe.add_edge(mul_1, out_5, EdgeInfo::Left);
        fe.add_edge(mul_2, out_5, EdgeInfo::Right);
        fe.add_edge(mul_3, out_6, EdgeInfo::Left);
        fe.add_edge(mul_4, out_6, EdgeInfo::Right);

        fe
    }

    fn get_expected() -> FrontendCompilation<Operation> {
        fn make_node(operation: Operation) -> NodeInfo<Operation> {
            NodeInfo { operation }
        }

        let mut fe = FrontendCompilation::new();

        // Layer 1
        let in_1 = fe.add_node(make_node(Operation::PublicInput(NodeIndex::from(0))));
        let in_2 = fe.add_node(make_node(Operation::PublicInput(NodeIndex::from(1))));
        let in_3 = fe.add_node(make_node(Operation::PublicInput(NodeIndex::from(2))));

        // Layer 2
        // sub_2 gets eliminated.
        // add_1, add_2 get eliminated, leaving commuted add_3
        // mul_1, mul_2 get eliminated, leaving commuted mul_3
        let sub_1 = fe.add_node(make_node(Operation::Sub));
        let sub_3 = fe.add_node(make_node(Operation::Sub));
        let sub_4 = fe.add_node(make_node(Operation::Sub));

        fe.add_edge(in_1, sub_1, EdgeInfo::Left);
        fe.add_edge(in_2, sub_1, EdgeInfo::Right);
        fe.add_edge(in_1, sub_3, EdgeInfo::Right);
        fe.add_edge(in_2, sub_3, EdgeInfo::Left);
        fe.add_edge(in_1, sub_4, EdgeInfo::Right);
        fe.add_edge(in_3, sub_4, EdgeInfo::Left);

        let add_1 = fe.add_node(make_node(Operation::Add));
        let add_4 = fe.add_node(make_node(Operation::Add));

        // The left and right edges get permuted after CSE because
        // add is commutative.
        fe.add_edge(in_1, add_1, EdgeInfo::Right);
        fe.add_edge(in_2, add_1, EdgeInfo::Left);
        fe.add_edge(in_1, add_4, EdgeInfo::Right);
        fe.add_edge(in_3, add_4, EdgeInfo::Left);

        let mul_1 = fe.add_node(make_node(Operation::Mul));
        let mul_4 = fe.add_node(make_node(Operation::Mul));

        // The left and right edges get permuted after CSE because
        // mul is commutative.
        fe.add_edge(in_1, mul_1, EdgeInfo::Right);
        fe.add_edge(in_2, mul_1, EdgeInfo::Left);
        fe.add_edge(in_1, mul_4, EdgeInfo::Right);
        fe.add_edge(in_3, mul_4, EdgeInfo::Left);

        // neg_2 gets removed by CSE
        let neg_1 = fe.add_node(make_node(Operation::Neg));
        let neg_3 = fe.add_node(make_node(Operation::Neg));

        fe.add_edge(in_1, neg_1, EdgeInfo::Unary);
        fe.add_edge(in_2, neg_3, EdgeInfo::Unary);

        // Layer 3
        // out_2 gets culled
        let out_1 = fe.add_node(make_node(Operation::Add));
        let out_3 = fe.add_node(make_node(Operation::Add));
        let out_4 = fe.add_node(make_node(Operation::Add));
        let out_6 = fe.add_node(make_node(Operation::Add));

        fe.add_edge(sub_1, out_1, EdgeInfo::Left);
        fe.add_edge(add_1, out_1, EdgeInfo::Right);
        fe.add_edge(sub_3, out_3, EdgeInfo::Left);
        fe.add_edge(add_1, out_3, EdgeInfo::Right);
        fe.add_edge(sub_4, out_4, EdgeInfo::Left);
        fe.add_edge(add_4, out_4, EdgeInfo::Right);
        fe.add_edge(mul_1, out_6, EdgeInfo::Left);
        fe.add_edge(mul_4, out_6, EdgeInfo::Right);

        fe
    }

    #[test]
    fn can_remove_common_subexpressions_add() {
        let mut fe = get_graph();
        let expected = get_expected();

        common_subexpression_elimination(&mut fe.0);

        // We can't check for edge equality, since left and right
        // operands can get permuted for commutative operations.
        let equals = is_isomorphic_matching(
            &Graph::from(fe.0.clone()),
            &Graph::from(expected.0.clone()),
            |x, y| x == y,
            |x, y| x == y,
        );

        assert!(equals);
    }
}
