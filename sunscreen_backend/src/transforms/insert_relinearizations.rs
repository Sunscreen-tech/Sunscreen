use sunscreen_fhe_program::{FheProgram, GraphQuery, IRTransform::*, Operation::*, TransformList};

use petgraph::{stable_graph::NodeIndex, visit::EdgeRef, Direction};

pub fn apply_insert_relinearizations(ir: &mut FheProgram) {
    let insert_relin = |id: NodeIndex, query: GraphQuery| {
        let mut transforms = TransformList::new();

        let relin_node = transforms.push(AppendRelinearize(id.into()));

        for e in query.edges_directed(id, Direction::Outgoing) {
            let operand_type = e.weight();

            transforms.push(RemoveEdge(id.into(), e.target().into()));
            transforms.push(AddEdge(relin_node.into(), e.target().into(), *operand_type));
        }

        transforms
    };

    ir.forward_traverse(|query, id| match query.get_node(id).operation {
        // We only need to insert relinearizations for ciphertext
        // multiplications. Plaintext multiplications don't increase
        // the number of polynomials (see
        // multiply_plaintext_does_not_increase_polynomials) test in
        // assumptions.rs
        Multiply => insert_relin(id, query),
        _ => TransformList::default(),
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use petgraph::stable_graph::NodeIndex;
    use sunscreen_fhe_program::{GraphQuery, Literal as FheProgramLiteral, Operation, SchemeType};

    fn create_test_dag() -> FheProgram {
        let mut ir = FheProgram::new(SchemeType::Bfv);

        let ct = ir.append_input_ciphertext(0);
        let l1 = ir.append_input_literal(FheProgramLiteral::from(7i64));
        let add = ir.append_add(ct, l1);
        let l2 = ir.append_input_literal(FheProgramLiteral::from(5u64));
        let mul = ir.append_multiply(add, l2);
        let add_2 = ir.append_add(mul, l2);
        ir.append_multiply(add_2, ct);

        ir
    }

    #[test]
    fn inserts_relinearizations() {
        let mut ir = create_test_dag();

        assert_eq!(ir.graph.node_count(), 7);

        apply_insert_relinearizations(&mut ir);

        assert_eq!(ir.graph.node_count(), 9);

        let query = GraphQuery::new(&ir);

        let relin_nodes = ir
            .graph
            .node_indices()
            .filter(|i| matches!(query.get_node(*i).operation, Operation::Relinearize))
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
                .map(|id| query.get_node(id))
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
            .all(|i| { matches!(query.get_node(i).operation, Operation::Add) }),);
    }
}
