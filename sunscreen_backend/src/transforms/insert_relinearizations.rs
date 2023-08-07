use std::convert::Infallible;

use sunscreen_compiler_common::{
    forward_traverse_mut,
    transforms::{GraphTransforms, Transform},
    EdgeInfo, GraphQuery, NodeInfo,
};
use sunscreen_fhe_program::{
    FheProgram,
    Operation::{self, *},
};

use petgraph::{stable_graph::NodeIndex, visit::EdgeRef, Direction};

type FheGraphQuery<'a> = GraphQuery<'a, NodeInfo<Operation>, EdgeInfo>;

pub fn apply_insert_relinearizations(ir: &mut FheProgram) {
    let insert_relin = |id: NodeIndex, query: FheGraphQuery| {
        let mut transforms = GraphTransforms::new();

        let node = query.get_node(id).unwrap();

        let relin_node = transforms.push(Transform::AddNode(NodeInfo {
            operation: Operation::Relinearize,
            #[cfg(feature = "debugger")]
            group_id: node.group_id,
            #[cfg(feature = "debugger")]
            stack_id: node.stack_id,
        }));

        transforms.push(Transform::AddEdge(
            id.into(),
            relin_node.into(),
            EdgeInfo::Unary,
        ));

        for e in query.edges_directed(id, Direction::Outgoing) {
            let operand_type = e.weight();

            transforms.push(Transform::RemoveEdge(id.into(), e.target().into()));
            transforms.push(Transform::AddEdge(
                relin_node.into(),
                e.target().into(),
                *operand_type,
            ));
        }

        transforms
    };

    forward_traverse_mut(&mut ir.graph.graph, |query, id| {
        // Id is given to us, so the node should exist. Just
        // unwrap.
        let transforms = match query.get_node(id).unwrap().operation {
            // We only need to insert relinearizations for ciphertext
            // multiplications. Plaintext multiplications don't increase
            // the number of polynomials (see
            // multiply_plaintext_does_not_increase_polynomials) test in
            // assumptions.rs
            Multiply => insert_relin(id, query),
            _ => GraphTransforms::default(),
        };

        Ok::<_, Infallible>(transforms)
    })
    .unwrap();

    #[cfg(feature = "debugger")]
    {
        let mut group_updates: Vec<(u64, u64)> = vec![];
        for i in ir.graph.node_indices() {
            group_updates.push((
                ir.graph.node_weight(i).unwrap().group_id,
                i.index().try_into().unwrap(),
            ));
        }
        for (g, i) in group_updates {
            group_insert_recursive(&g, i, ir);
        }
    }
}
#[cfg(feature = "debugger")]
fn group_insert_recursive(g: &u64, i: u64, ir: &mut FheProgram) {
    ir.graph
        .metadata
        .group_lookup
        .id_data_lookup
        .get_mut(g)
        .unwrap()
        .node_ids
        .insert(i);
    if let Some(p) = ir
        .graph
        .metadata
        .group_lookup
        .id_data_lookup
        .get(g)
        .unwrap()
        .parent
    {
        group_insert_recursive(&p, i, ir)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use petgraph::stable_graph::NodeIndex;
    use sunscreen_compiler_common::GraphQuery;
    use sunscreen_fhe_program::{
        FheProgramTrait, Literal as FheProgramLiteral, Operation, SchemeType,
    };

    fn create_test_dag() -> FheProgram {
        let mut ir = FheProgram::new(SchemeType::Bfv);

        let ct = ir.add_input_ciphertext(0);
        let l1 = ir.add_input_literal(FheProgramLiteral::from(7u64));
        let add = ir.add_add(ct, l1);
        let l2 = ir.add_input_literal(FheProgramLiteral::from(5u64));
        let mul = ir.add_multiply(add, l2);
        let add_2 = ir.add_add(mul, l2);
        ir.add_multiply(add_2, ct);

        ir
    }

    #[test]
    fn inserts_relinearizations() {
        let mut ir = create_test_dag();

        assert_eq!(ir.graph.node_count(), 7);

        apply_insert_relinearizations(&mut ir);

        assert_eq!(ir.graph.node_count(), 9);

        let query = GraphQuery::new(&ir.graph.graph);

        let relin_nodes = ir
            .graph
            .node_indices()
            .filter(|i| {
                matches!(
                    query.get_node(*i).unwrap().operation,
                    Operation::Relinearize
                )
            })
            .collect::<Vec<NodeIndex>>();

        // Should have 2 relin nodes added.
        assert_eq!(relin_nodes.len(), 2);

        // Every relin should have 1 predacessor.
        assert!(relin_nodes
            .iter()
            .all(|id| { query.neighbors_directed(*id, Direction::Incoming).count() == 1 }),);

        // Every relin's predacessor should be a multiply
        assert!(relin_nodes.iter().all(|id| {
            query
                .neighbors_directed(*id, Direction::Incoming)
                .map(|id| query.get_node(id).unwrap())
                .all(|node| matches!(node.operation, Operation::Multiply))
        }));

        // The first relin node should point to add_2
        assert_eq!(
            query
                .neighbors_directed(relin_nodes[0], Direction::Outgoing)
                .count(),
            1
        );

        // The second relin node should point to nothing.
        assert_eq!(
            query
                .neighbors_directed(relin_nodes[1], Direction::Outgoing)
                .count(),
            0
        );

        // The first relin node should point to add_2
        assert!(query
            .neighbors_directed(relin_nodes[0], Direction::Outgoing)
            .all(|i| { matches!(query.get_node(i).unwrap().operation, Operation::Add) }),);
    }
}
