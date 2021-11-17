use petgraph::{
    graph::NodeIndex,
    stable_graph::{Neighbors, StableGraph},
    visit::IntoNodeIdentifiers,
    Direction,
};
use serde::{Deserialize, Serialize};

use IRTransform::*;
use TransformNodeIndex::*;

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
        F: FnMut(GraphQuery, NodeIndex) -> TransformList,
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
        F: FnMut(GraphQuery, NodeIndex) -> TransformList,
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
        F: FnMut(GraphQuery, NodeIndex) -> TransformList,
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

            let mut transforms = callback(GraphQuery(self), n);

            // Apply the transforms the callback produced
            transforms.apply(self);

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
}

pub struct GraphQuery<'a>(&'a IntermediateRepresentation);

impl<'a> GraphQuery<'a> {
    pub fn new(ir: &'a IntermediateRepresentation) -> Self {
        Self(ir)
    }

    pub fn get_node(&self, x: NodeIndex) -> &NodeInfo {
        &self.0.graph[x]
    }

    pub fn get_neighbors(&self, x: NodeIndex, direction: Direction) -> Neighbors<EdgeInfo> {
        self.0.graph.neighbors_directed(x, direction)
    }
}

#[derive(Debug, Clone)]
pub enum IRTransform {
    AppendAdd(TransformNodeIndex, TransformNodeIndex),
    AppendMultiply(TransformNodeIndex, TransformNodeIndex),
    AppendInputCiphertext,
    AppendOutputCiphertext(TransformNodeIndex),
    AppendRelinearize(TransformNodeIndex),
    AppendSub(TransformNodeIndex, TransformNodeIndex),
    RemoveNode(TransformNodeIndex),
    AppendNegate(TransformNodeIndex),
    RemoveEdge(TransformNodeIndex, TransformNodeIndex),
    AddEdge(TransformNodeIndex, TransformNodeIndex),
}

/**
 * Transforms can refer to nodes that already exist in the graph or nodes that don't
 * yet exist in the graph, but will be inserted in a previous transform.
 */
#[derive(Debug, Clone, Copy)]
pub enum TransformNodeIndex {
    /**
     * This node index refers to a pre-existing node in the graph.
     */
    NodeIndex(NodeIndex),

    /**
     * This node index refers to a
     */
    DeferredIndex(DeferredIndex),
}

pub type DeferredIndex = usize;

impl Into<TransformNodeIndex> for DeferredIndex {
    fn into(self) -> TransformNodeIndex {
        TransformNodeIndex::DeferredIndex(self)
    }
}

impl Into<TransformNodeIndex> for NodeIndex {
    fn into(self) -> TransformNodeIndex {
        TransformNodeIndex::NodeIndex(self)
    }
}

pub struct TransformList {
    transforms: Vec<IRTransform>,
    inserted_node_ids: Vec<Option<NodeIndex>>,
}

impl Default for TransformList {
    fn default() -> Self {
        Self::new()
    }
}

impl TransformList {
    pub fn new() -> Self {
        Self {
            transforms: vec![],
            inserted_node_ids: vec![],
        }
    }

    /**
     * Pushes a transform into the list and returns the index of the pushed transform
     * suitable for use in TransformNodeIndex::DeferredIndex.
     */
    pub fn push(&mut self, transform: IRTransform) -> DeferredIndex {
        self.transforms.push(transform);

        self.transforms.len() - 1
    }

    pub fn apply(&mut self, ir: &mut IntermediateRepresentation) {
        for t in self.transforms.clone().iter() {
            let inserted_node_id = match t {
                AppendAdd(x, y) => {
                    self.apply_2_input(ir, *x, *y, |ir, x, y| Some(ir.append_add(x, y)))
                }
                AppendMultiply(x, y) => {
                    self.apply_2_input(ir, *x, *y, |ir, x, y| Some(ir.append_multiply(x, y)))
                }
                AppendInputCiphertext => Some(ir.append_input_ciphertext()),
                AppendOutputCiphertext(x) => {
                    self.apply_1_input(ir, *x, |ir, x| Some(ir.append_output_ciphertext(x)))
                }
                AppendRelinearize(x) => {
                    self.apply_1_input(ir, *x, |ir, x| Some(ir.append_relinearize(x)))
                }
                AppendSub(x, y) => {
                    self.apply_2_input(ir, *x, *y, |ir, x, y| Some(ir.append_sub(x, y)))
                }
                RemoveNode(x) => {
                    let x = self.materialize_index(*x);

                    ir.remove_node(x);

                    None
                }
                AppendNegate(x) => self.apply_1_input(ir, *x, |ir, x| Some(ir.append_negate(x))),
                RemoveEdge(x, y) => {
                    let x = self.materialize_index(*x);
                    let y = self.materialize_index(*y);

                    ir.graph.remove_edge(
                        ir.graph
                            .find_edge(x, y)
                            .expect("Fatal error: attempted to remove nonexistent edge."),
                    );

                    None
                }
                AddEdge(x, y) => {
                    let x = self.materialize_index(*x);
                    let y = self.materialize_index(*y);

                    ir.graph.update_edge(x, y, EdgeInfo::new());

                    None
                }
            };

            self.inserted_node_ids.push(inserted_node_id);
        }
    }

    fn apply_1_input<F>(
        &mut self,
        ir: &mut IntermediateRepresentation,
        x: TransformNodeIndex,
        callback: F,
    ) -> Option<NodeIndex>
    where
        F: FnOnce(&mut IntermediateRepresentation, NodeIndex) -> Option<NodeIndex>,
    {
        let x = self.materialize_index(x);

        callback(ir, x)
    }

    fn apply_2_input<F>(
        &mut self,
        ir: &mut IntermediateRepresentation,
        x: TransformNodeIndex,
        y: TransformNodeIndex,
        callback: F,
    ) -> Option<NodeIndex>
    where
        F: FnOnce(&mut IntermediateRepresentation, NodeIndex, NodeIndex) -> Option<NodeIndex>,
    {
        let x = self.materialize_index(x);
        let y = self.materialize_index(y);

        callback(ir, x, y)
    }

    fn materialize_index(&self, x: TransformNodeIndex) -> NodeIndex {
        match x {
            NodeIndex(x) => x,
            DeferredIndex(x) => self.inserted_node_ids[x]
                .expect(&format!("Fatal error: No such deferred node index :{}", x)),
        }
    }
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

        ir.forward_traverse(|_, n| {
            visited.push(n);
            TransformList::default()
        });

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

        ir.reverse_traverse(|_, n| {
            visited.push(n);
            TransformList::default()
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
    fn can_delete_during_traversal() {
        let mut ir = create_simple_dag();

        let mut visited = vec![];

        ir.reverse_traverse(|_, n| {
            visited.push(n);
            // Delete the addition
            if n.index() == 2 {
                let mut transforms = TransformList::new();
                transforms.push(RemoveNode(n.into()));

                transforms
            } else {
                TransformList::default()
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
                let mut transforms = TransformList::new();
                transforms.push(AppendMultiply(n.into(), NodeIndex::from(1).into()));

                transforms
            } else {
                TransformList::default()
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
