use petgraph::{
    graph::NodeIndex,
    stable_graph::{Neighbors, StableGraph},
    visit::{IntoNodeIdentifiers},
    Direction,
};
use serde::{Deserialize, Serialize};

use std::collections::HashSet;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Literal {
    I64(i64),
    U64(u64),
    F64(f64),
}

impl From<i64> for Literal {
    fn from(val: i64) -> Self {
        Self::I64(val)
    }
}

impl From<u64> for Literal {
    fn from(val: u64) -> Self {
        Self::U64(val)
    }
}

impl From<f64> for Literal {
    fn from(val: f64) -> Self {
        Self::F64(val)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Operation {
    ShiftLeft,
    ShiftRight,
    SwapRows,
    Relinearize,
    Multiply,
    Add,
    Negate,
    Sub,
    InputCiphertext,
    Literal(Literal),
    OutputCiphertext,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeInfo {
    pub operation: Operation,
}

impl NodeInfo {
    fn new(operation: Operation) -> Self {
        Self { operation }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeInfo;

impl EdgeInfo {
    pub fn new() -> Self {
        Self
    }
}

type IRGraph = StableGraph<NodeInfo, EdgeInfo>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntermediateRepresentation {
    pub graph: IRGraph,
}

use IRTransform::*;

impl IntermediateRepresentation {
    pub fn new() -> Self {
        Self {
            graph: StableGraph::new(),
        }
    }

    fn append_2_input_node(
        &mut self,
        operation: Operation,
        x: NodeIndex,
        y: NodeIndex,
    ) -> NodeIndex {
        let new_node = self.graph.add_node(NodeInfo::new(operation));

        self.graph.update_edge(x, new_node, EdgeInfo::new());
        self.graph.update_edge(y, new_node, EdgeInfo::new());

        new_node
    }

    fn append_1_input_node(&mut self, operation: Operation, x: NodeIndex) -> NodeIndex {
        let new_node = self.graph.add_node(NodeInfo::new(operation));

        self.graph.update_edge(x, new_node, EdgeInfo::new());

        new_node
    }

    fn append_0_input_node(&mut self, operation: Operation) -> NodeIndex {
        let new_node = self.graph.add_node(NodeInfo::new(operation));

        new_node
    }

    /**
     * Appends a negate operation that depends on operand x
     */
    pub fn append_negate(&mut self, x: NodeIndex) -> NodeIndex {
        self.append_1_input_node(Operation::Negate, x)
    }

    /**
     * Appends a multiply operation that depends on the operands x and y.
     */
    pub fn append_multiply(&mut self, x: NodeIndex, y: NodeIndex) -> NodeIndex {
        self.append_2_input_node(Operation::Multiply, x, y)
    }

    /**
     * Appends an add operation that depends on the operands x and y.
     */
    pub fn append_add(&mut self, x: NodeIndex, y: NodeIndex) -> NodeIndex {
        self.append_2_input_node(Operation::Add, x, y)
    }

    /**
     * Appends a subtract operation that depends on the operands x and y.
     */
    pub fn append_sub(&mut self, x: NodeIndex, y: NodeIndex) -> NodeIndex {
        self.append_2_input_node(Operation::Sub, x, y)
    }

    /**
     * Appends an input ciphertext.
     */
    pub fn append_input_ciphertext(&mut self) -> NodeIndex {
        self.append_0_input_node(Operation::InputCiphertext)
    }

    /**
     * Appends a constant literal unencrypted.
     */
    pub fn append_input_literal(&mut self, value: Literal) -> NodeIndex {
        self.append_0_input_node(Operation::Literal(value))
    }

    /**
     * Appends an output ciphertext.
     */
    pub fn append_output_ciphertext(&mut self, x: NodeIndex) -> NodeIndex {
        self.append_1_input_node(Operation::OutputCiphertext, x)
    }

    /**
     * Appends a relinearize operation for given operand.
     */
    pub fn append_relinearize(&mut self, x: NodeIndex) -> NodeIndex {
        self.append_1_input_node(Operation::Relinearize, x)
    }

    /**
     * A specialized topological DAG traversal that allows the following graph
     * mutations during traversal:
     * * Delete the current node
     * * Insert nodoes after current node
     * * Add new nodes with no dependencies
     *
     * Any other graph mutation will likely result in unvisited nodes.
     */
    pub fn forward_traverse<F>(&mut self, callback: F)
    where
        F: FnMut(GraphQuery, NodeIndex) -> Vec<IRTransform>,
    {
        self.traverse(true, callback);
    }

    /**
     * A specialized reverse topological DAG traversal that allows the following graph
     * mutations during traversal:
     * * Delete the current node
     * * Insert nodoes after current node
     * * Add new nodes with no dependencies
     *
     * Any other graph mutation will likely result in unvisited nodes.
     */
    pub fn reverse_traverse<F>(&mut self, callback: F)
    where
        F: FnMut(GraphQuery, NodeIndex) -> Vec<IRTransform>,
    {
        self.traverse(false, callback);
    }

    /**
     * Remove the given node.
     */
    pub fn remove_node(&mut self, id: NodeIndex) {
        self.graph.remove_node(id);
    }

    fn traverse<F>(&mut self, forward: bool, mut callback: F)
    where
        F: FnMut(GraphQuery, NodeIndex) -> Vec<IRTransform>,
    {
        let mut ready: HashSet<NodeIndex> = HashSet::new();
        let mut visited: HashSet<NodeIndex> = HashSet::new();
        let prev_direction = if forward {
            Direction::Incoming
        } else {
            Direction::Outgoing
        };
        let next_direction = if forward {
            Direction::Outgoing
        } else {
            Direction::Incoming
        };

        let mut ready_nodes: Vec<NodeIndex> = self
            .graph
            .node_identifiers()
            .filter(|&x| {
                self.graph
                    .neighbors_directed(x, prev_direction)
                    .next()
                    .is_none()
            })
            .collect();

        for i in &ready_nodes {
            ready.insert(*i);
        }

        while let Some(n) = ready_nodes.pop() {
            visited.insert(n);

            // Remember the next nodes from the current node in case it gets deletes.
            let next_nodes: Vec<NodeIndex> =
                self.graph.neighbors_directed(n, next_direction).collect();

            let transforms = callback(GraphQuery(self), n);

            // Apply the transforms the callback produced
            for t in transforms {
                self.apply_transform(&t);
            }

            let node_ready = |n: NodeIndex| {
                self.graph
                    .neighbors_directed(n, prev_direction)
                    .all(|m| visited.contains(&m))
            };

            // If the node still exists, push all its ready dependents
            if self.graph.contains_node(n) {
                for i in self.graph.neighbors_directed(n, next_direction) {
                    if !ready.contains(&i) && node_ready(i) {
                        ready.insert(i);
                        ready_nodes.push(i);
                    }
                }
            }

            // Iterate through the next nodes that existed before visitin this node.
            for i in next_nodes {
                if !ready.contains(&i) && node_ready(i) {
                    ready.insert(i);
                    ready_nodes.push(i);
                }
            }

            // Iterate through any sources/sinks the callback may have added.
            let sources = self.graph.node_identifiers().filter(|&x| {
                self.graph
                    .neighbors_directed(x, prev_direction)
                    .next()
                    .is_none()
            });

            for i in sources {
                if !ready.contains(&i) {
                    ready.insert(i);
                    ready_nodes.push(i);
                }
            }
        }
    }

    fn apply_transform(&mut self, transform: &IRTransform) {
        match transform {
            AppendAdd(x, y) => { self.append_add(*x, *y); },
            AppendMultiply(x, y) => { self.append_multiply(*x, *y); },
            AppendInputCiphertext => { self.append_input_ciphertext(); },
            AppendOutputCiphertext(x) => { self.append_output_ciphertext(*x); },
            AppendRelinearize(x) => { self.append_relinearize(*x); },
            AppendSub(x, y) => { self.append_sub(*x, *y); },
            RemoveNode(x) => { self.remove_node(*x); },
            AppendNegate(x) => { self.append_negate(*x); },
        };
    }
}

pub struct GraphQuery<'a>(&'a IntermediateRepresentation);

impl <'a> GraphQuery<'a> {
    pub fn get_node(&self, x: NodeIndex) -> &NodeInfo {
        &self.0.graph[x]
    }

    pub fn get_neighbors(&self, x: NodeIndex, direction: Direction) -> Neighbors<EdgeInfo> {
        self.0.graph.neighbors_directed(x, direction)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum IRTransform {
    AppendAdd(NodeIndex, NodeIndex),
    AppendMultiply(NodeIndex, NodeIndex),
    AppendInputCiphertext,
    AppendOutputCiphertext(NodeIndex),
    AppendRelinearize(NodeIndex),
    AppendSub(NodeIndex, NodeIndex),
    RemoveNode(NodeIndex),
    AppendNegate(NodeIndex),
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_simple_dag() -> IntermediateRepresentation {
        let mut ir = IntermediateRepresentation::new();

        let ct = ir.append_input_ciphertext();
        let l1 = ir.append_input_literal(Literal::from(7i64));
        let add = ir.append_add(ct, l1);
        let l2 = ir.append_input_literal(Literal::from(5u64));
        ir.append_multiply(add, l2);

        ir
    }

    #[test]
    fn can_build_simple_dag() {
        let ir = create_simple_dag();

        assert_eq!(ir.graph.node_count(), 5);

        let nodes = ir
            .graph
            .node_identifiers()
            .map(|i| (i, &ir.graph[i]))
            .collect::<Vec<(NodeIndex, &NodeInfo)>>();

        assert_eq!(nodes[0].1.operation, Operation::InputCiphertext);
        assert_eq!(
            nodes[1].1.operation,
            Operation::Literal(Literal::from(7i64))
        );
        assert_eq!(nodes[2].1.operation, Operation::Add);
        assert_eq!(
            nodes[3].1.operation,
            Operation::Literal(Literal::from(5u64))
        );
        assert_eq!(nodes[4].1.operation, Operation::Multiply);

        assert_eq!(
            ir.graph
                .neighbors_directed(nodes[0].0, Direction::Outgoing)
                .next()
                .unwrap(),
            nodes[2].0
        );
        assert_eq!(
            ir.graph
                .neighbors_directed(nodes[1].0, Direction::Outgoing)
                .next()
                .unwrap(),
            nodes[2].0
        );
        assert_eq!(
            ir.graph
                .neighbors_directed(nodes[2].0, Direction::Outgoing)
                .next()
                .unwrap(),
            nodes[4].0
        );
        assert_eq!(
            ir.graph
                .neighbors_directed(nodes[3].0, Direction::Outgoing)
                .next()
                .unwrap(),
            nodes[4].0
        );
        assert_eq!(
            ir.graph
                .neighbors_directed(nodes[4].0, Direction::Outgoing)
                .next(),
            None
        );
    }

    #[test]
    fn can_forward_traverse() {
        let mut ir = create_simple_dag();

        let mut visited = vec![];

        ir.forward_traverse(|_, n| { visited.push(n); vec![]});

        assert_eq!(
            visited,
            vec![
                NodeIndex::from(3),
                NodeIndex::from(1),
                NodeIndex::from(0),
                NodeIndex::from(2),
                NodeIndex::from(4)
            ]
        );
    }

    #[test]
    fn can_reverse_traverse() {
        let mut ir = create_simple_dag();

        let mut visited = vec![];

        ir.reverse_traverse(|_, n| { visited.push(n); vec![] });

        assert_eq!(
            visited,
            vec![
                NodeIndex::from(4),
                NodeIndex::from(2),
                NodeIndex::from(0),
                NodeIndex::from(1),
                NodeIndex::from(3)
            ]
        );
    }

    #[test]
    fn can_delete_during_traversal() {
        let mut ir = create_simple_dag();

        let mut visited = vec![];

        ir.reverse_traverse(|_, n| {
            visited.push(n);
            // Delete the addition
            if n.index() == 2 {
                vec![RemoveNode(n)]
            } else {
                vec![]
            }
        });

        assert_eq!(
            visited,
            vec![
                NodeIndex::from(4),
                NodeIndex::from(2),
                NodeIndex::from(0),
                NodeIndex::from(1),
                NodeIndex::from(3)
            ]
        );
    }

    #[test]
    fn can_append_during_traversal() {
        let mut ir = create_simple_dag();

        let mut visited = vec![];

        ir.forward_traverse(|_, n| {
            visited.push(n);

            // Delete the addition
            if n.index() == 2 {
                vec![AppendMultiply(n, NodeIndex::from(1))]
            } else {
                vec![]
            }
        });

        assert_eq!(
            visited,
            vec![
                NodeIndex::from(3),
                NodeIndex::from(1),
                NodeIndex::from(0),
                NodeIndex::from(2),
                NodeIndex::from(4),
                NodeIndex::from(5),
            ]
        );
    }
}
