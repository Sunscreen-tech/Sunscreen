use std::collections::{HashSet, VecDeque};

use petgraph::{
    dot::Dot,
    stable_graph::{EdgeReference, Edges, Neighbors, NodeIndex, StableGraph},
    visit::{EdgeRef, IntoNodeIdentifiers},
    Directed, Direction,
};
use static_assertions::const_assert;
use thiserror::Error;

use crate::{EdgeInfo, NodeInfo, Operation, Render};

/**
 * A wrapper for ascertaining the structure of the underlying graph.
 * This type is used in [`forward_traverse`] and
 * [`reverse_traverse`] callbacks.
 */
pub struct GraphQuery<'a, N, E>(&'a StableGraph<N, E>);

impl<'a, N, E> From<&'a StableGraph<N, E>> for GraphQuery<'a, N, E> {
    fn from(x: &'a StableGraph<N, E>) -> Self {
        Self(x)
    }
}

impl<'a, N, E> GraphQuery<'a, N, E> {
    /**
     * Creates a new [`GraphQuery`] from a reference to a
     * [`StableGraph`].
     */
    pub fn new(ir: &'a StableGraph<N, E>) -> Self {
        Self(ir)
    }

    /**
     * Gets a node from its index.
     */
    pub fn get_node(&self, x: NodeIndex) -> Option<&N> {
        self.0.node_weight(x)
    }

    /**
     * Gets information about the immediate parent or child nodes of
     * the node at the given index.
     *
     * # Remarks
     * [`Direction::Outgoing`] gives children, while
     * [`Direction::Incoming`] gives parents.
     */
    pub fn neighbors_directed(&self, x: NodeIndex, direction: Direction) -> Neighbors<E> {
        self.0.neighbors_directed(x, direction)
    }

    /**
     * Gets edges pointing at the parent or child nodes of the node at
     * the given index.
     *
     * # Remarks
     * [`Direction::Outgoing`] gives children, while
     * [`Direction::Incoming`] gives parents.
     */
    pub fn edges_directed(&self, x: NodeIndex, direction: Direction) -> Edges<E, Directed> {
        self.0.edges_directed(x, direction)
    }
}

/**
 * A list of transformations that should be applied to the graph.
 */
pub trait TransformList<N, E>
where
    N: Clone,
    E: Clone,
{
    /**
     * Apply the transformations and return any added nodes.
     *
     * # Remarks
     * This consumes the transform list.
     */
    fn apply(self, graph: &mut StableGraph<N, E>) -> Vec<NodeIndex>;
}

// Make a surrogate implementation of the trait for traversal functions
// that don't mutate the graph.
impl<N, E> TransformList<N, E> for ()
where
    N: Clone,
    E: Clone,
{
    fn apply(self, _graph: &mut StableGraph<N, E>) -> Vec<NodeIndex> {
        vec![]
    }
}

/**
 * Call the supplied callback for each node in the given graph in
 * topological order.
 */
pub fn forward_traverse<N, E, F, Err>(graph: &StableGraph<N, E>, callback: F) -> Result<(), Err>
where
    N: Clone,
    E: Clone,
    F: FnMut(GraphQuery<N, E>, NodeIndex) -> Result<(), Err>,
{
    let graph: *const StableGraph<N, E> = graph;

    // Traverse won't mutate the graph since F returns ().
    unsafe { traverse(graph as *mut StableGraph<N, E>, true, callback) }
}

/**
 * Call the supplied callback for each node in the given graph in
 * reverse topological order.
 */
pub fn reverse_traverse<N, E, F, Err>(graph: &StableGraph<N, E>, callback: F) -> Result<(), Err>
where
    N: Clone,
    E: Clone,
    F: FnMut(GraphQuery<N, E>, NodeIndex) -> Result<(), Err>,
{
    let graph: *const StableGraph<N, E> = graph;

    // Traverse won't mutate the graph since F returns ().
    unsafe { traverse(graph as *mut StableGraph<N, E>, false, callback) }
}

/**
 * A specialized topological DAG traversal that allows the following graph
 * mutations during traversal:
 * * Delete the current node
 * * Insert nodes after current node
 * * Add new nodes with no dependencies
 *
 * Any other graph mutation will likely result in unvisited nodes.
 *
 * * `callback`: A closure that receives the current node index and an
 *   object allowing you to make graph queries. This closure returns a    
 *   transform list or an error.
 *   On success, [`reverse_traverse`] will apply these transformations
 *   before continuing the traversal. Errors will be propagated to the
 *   caller.
 */
pub fn forward_traverse_mut<N, E, F, T, Err>(
    graph: &mut StableGraph<N, E>,
    callback: F,
) -> Result<(), Err>
where
    N: Clone,
    E: Clone,
    T: TransformList<N, E>,
    F: FnMut(GraphQuery<N, E>, NodeIndex) -> Result<T, Err>,
{
    unsafe { traverse(graph, true, callback) }
}

/**
 * A specialized reverse topological DAG traversal that allows the following graph
 * mutations during traversal:
 * * Delete the current node
 * * Insert nodes after current node
 * * Add new nodes with no dependencies
 *
 * Any other graph mutation will likely result in unvisited nodes.
 *
 * * `callback`: A closure that receives the current node index and an
 *   object allowing you to make graph queries. This closure returns a    
 *   transform list or an error.
 *   On success, [`reverse_traverse`] will apply these transformations
 *   before continuing the traversal. Errors will be propagated to the
 *   caller.
 */
pub fn reverse_traverse_mut<N, E, F, T, Err>(
    graph: &mut StableGraph<N, E>,
    callback: F,
) -> Result<(), Err>
where
    N: Clone,
    E: Clone,
    T: TransformList<N, E>,
    F: FnMut(GraphQuery<N, E>, NodeIndex) -> Result<T, Err>,
{
    unsafe { traverse(graph, false, callback) }
}

/**
 * Internal traversal implementation that allows for mutable traversal.
 * If the callback always returns an empty transform list or (), then
 * graph won't be mutated.
 */
unsafe fn traverse<N, E, T, F, Err>(
    graph: *mut StableGraph<N, E>,
    forward: bool,
    mut callback: F,
) -> Result<(), Err>
where
    N: Clone,
    E: Clone,
    F: FnMut(GraphQuery<N, E>, NodeIndex) -> Result<T, Err>,
    T: TransformList<N, E>,
{
    // The one unsafe line in the function...
    let graph = &mut *graph;
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

    let mut ready_nodes: VecDeque<NodeIndex> = graph
        .node_identifiers()
        .filter(|&x| graph.neighbors_directed(x, prev_direction).next().is_none())
        .collect();

    ready.extend(ready_nodes.iter());

    while let Some(n) = ready_nodes.pop_front() {
        visited.insert(n);

        // Remember the next nodes from the current node in case it gets deleted.
        let next_nodes: Vec<NodeIndex> = graph.neighbors_directed(n, next_direction).collect();

        let transforms = callback(GraphQuery(graph), n)?;

        // Apply the transforms the callback produced
        let added_nodes = transforms.apply(graph);

        let node_ready = |n: NodeIndex| {
            graph
                .neighbors_directed(n, prev_direction)
                .all(|m| visited.contains(&m))
        };

        // If the node still exists, push all its ready dependents
        if graph.contains_node(n) {
            for i in graph.neighbors_directed(n, next_direction) {
                if !ready.contains(&i) && node_ready(i) {
                    ready.insert(i);
                    ready_nodes.push_back(i);
                }
            }
        }

        // Iterate through the next nodes that existed before visiting this node.
        for i in next_nodes {
            if !ready.contains(&i) && node_ready(i) {
                ready.insert(i);
                ready_nodes.push_back(i);
            }
        }

        // Check for and sources/sinks the callback may have added.
        for i in added_nodes {
            if graph.neighbors_directed(i, prev_direction).next().is_none() {
                ready.insert(i);
                ready_nodes.push_back(i);
            }
        }
    }

    Ok(())
}

impl<N, E> Render for StableGraph<N, E>
where
    N: Render + std::fmt::Debug,
    E: Render + std::fmt::Debug,
{
    fn render(&self) -> String {
        let data = Dot::with_attr_getters(
            self,
            &[
                petgraph::dot::Config::NodeNoLabel,
                petgraph::dot::Config::EdgeNoLabel,
            ],
            &|_, e| format!("label=\"{}\"", e.weight().render()),
            &|_, n| {
                let (index, info) = n;

                format!("label=\"{}: {}\"", index.index(), info.render())
            },
        );

        format!("{data:?}")
    }
}

#[derive(Clone, Copy, Debug, Error, PartialEq, Eq)]
/**
 * An error that can occur when querying various aspects about an
 * operation graph.
 */
pub enum GraphQueryError {
    #[error("The given graph node wasn't a binary operation")]
    /**
     * The given operation is not a binary operation.
     */
    NotBinaryOperation,

    #[error("The given graph node wasn't a unary operation")]
    /**
     * The given graph node wasn't a unary operation.
     */
    NotUnaryOperation,

    #[error("The given graph node wasn't an unordered operation")]
    /**
     * The given graph node wasn't an unordered operation.
     */
    NotUnorderedOperation,

    #[error("The given graph node wasn't an ordered operation")]
    /**
     * The given graph node wasn't an ordered operation.
     */
    NotOrderedOperation,

    #[error("No node exists at the given index")]
    /**
     * No node exists at the given index.
     */
    NoSuchNode,

    #[error("The given node doesn't have 1 left and 1 right edge")]
    /**
     * The given node doesn't have 1 left and 1 right edge.
     */
    IncorrectBinaryOperandEdges,

    #[error("The given node doesn't have exactly 1 unary edge")]
    /**
     * The given node doesn't have exactly 1 unary edge.
     */
    IncorrectUnaryOperandEdge,

    #[error("The given node has a non-unordered edge")]
    /**
     * The given node has a non-unordered edge.
     */
    IncorrectUnorderedOperandEdge,

    #[error("The given node has a non-ordered edge")]
    /**
     * The given node has a non-ordered edge.
     */
    IncorrectOrderedOperandEdge,
}

const_assert!(std::mem::size_of::<GraphQueryError>() <= 8);

impl<'a, O> GraphQuery<'a, NodeInfo<O>, EdgeInfo>
where
    O: Operation,
{
    /**
     * Returns the left and right node indices to a binary operation.
     *
     * # Errors
     * - No node exists at the given index.
     * - The node at the given index isn't a binary operation.
     * - The node at the given index doesn't have a 1 left and 1 right parent
     */
    pub fn get_binary_operands(
        &self,
        index: NodeIndex,
    ) -> Result<(NodeIndex, NodeIndex), GraphQueryError> {
        let node = self.get_node(index).ok_or(GraphQueryError::NoSuchNode)?;

        if !node.operation.is_binary() {
            return Err(GraphQueryError::NotBinaryOperation);
        }

        let parent_edges = self
            .edges_directed(index, Direction::Incoming)
            .collect::<Vec<EdgeReference<EdgeInfo>>>();

        if parent_edges.len() != 2 {
            return Err(GraphQueryError::IncorrectBinaryOperandEdges);
        }

        let left = parent_edges.iter().find_map(|e| {
            if matches!(e.weight(), EdgeInfo::Left) {
                Some(e.source())
            } else {
                None
            }
        });

        let right = parent_edges.iter().find_map(|e| {
            if matches!(e.weight(), EdgeInfo::Right) {
                Some(e.source())
            } else {
                None
            }
        });

        left.zip(right)
            .ok_or(GraphQueryError::IncorrectBinaryOperandEdges)
    }

    /**
     * Returns the unary operand node index to a unary operation.
     *
     * # Errors
     * - No node exists at the given index.
     * - The node at the given index isn't a unary operation.
     * - The node at the given index doesn't have a single unary operand.
     */
    pub fn get_unary_operand(&self, index: NodeIndex) -> Result<NodeIndex, GraphQueryError> {
        let node = self.get_node(index).ok_or(GraphQueryError::NoSuchNode)?;

        if !node.operation.is_unary() {
            return Err(GraphQueryError::NotUnaryOperation);
        }

        let parent_edges = self
            .edges_directed(index, Direction::Incoming)
            .collect::<Vec<EdgeReference<EdgeInfo>>>();

        if parent_edges.len() != 1 || !matches!(&parent_edges[0].weight(), EdgeInfo::Unary) {
            return Err(GraphQueryError::IncorrectBinaryOperandEdges);
        }

        let left = parent_edges.first();

        Ok(left
            .ok_or(GraphQueryError::IncorrectUnaryOperandEdge)?
            .source())
    }

    /**
     * Returns the unordered operands to the given operation.
     *
     * # Remarks
     * As these operands are unordered, their order is undefined. Use
     * [`EdgeInfo::Ordered`] and call
     * [`GraphQuery::get_ordered_operands`] if you need a defined order.
     *
     * * # Errors
     * - No node exists at the given index.
     * - The node at the given index isn't a unary operation.
     * - The node at the given index doesn't have a single unary operand.
     */
    pub fn get_unordered_operands(
        &self,
        index: NodeIndex,
    ) -> Result<Vec<NodeIndex>, GraphQueryError> {
        let node = self.get_node(index).ok_or(GraphQueryError::NoSuchNode)?;

        if !node.operation.is_unordered() {
            return Err(GraphQueryError::NotUnorderedOperation);
        }

        let parent_edges = self
            .edges_directed(index, Direction::Incoming)
            .collect::<Vec<EdgeReference<EdgeInfo>>>();

        if !parent_edges
            .iter()
            .all(|e| matches!(e.weight(), EdgeInfo::Unordered))
        {
            return Err(GraphQueryError::IncorrectUnorderedOperandEdge);
        }

        Ok(parent_edges.iter().map(|x| x.source()).collect())
    }

    /**
     * Returns the unordered operands to the given operation.
     *
     * # Remarks
     * The operands node indices are returned in order.
     *
     * * # Errors
     * - No node exists at the given index.
     * - The node at the given index isn't a unary operation.
     * - The node at the given index doesn't have a single unary operand.
     */
    pub fn get_ordered_operands(
        &self,
        index: NodeIndex,
    ) -> Result<Vec<NodeIndex>, GraphQueryError> {
        let node = self.get_node(index).ok_or(GraphQueryError::NoSuchNode)?;

        if !node.operation.is_ordered() {
            return Err(GraphQueryError::NotOrderedOperation);
        }

        let mut parent_edges = self
            .edges_directed(index, Direction::Incoming)
            .map(|x| match x.weight() {
                EdgeInfo::Ordered(arg_id) => Ok(SortableEdge(x.source(), *arg_id)),
                _ => Err(GraphQueryError::IncorrectOrderedOperandEdge),
            })
            .collect::<Result<Vec<SortableEdge>, _>>()?;

        #[derive(Eq)]
        struct SortableEdge(NodeIndex, usize);

        impl PartialEq for SortableEdge {
            fn eq(&self, other: &Self) -> bool {
                self.1 == other.1
            }
        }

        impl PartialOrd for SortableEdge {
            fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
                Some(self.cmp(other))
            }
        }

        impl Ord for SortableEdge {
            fn cmp(&self, other: &Self) -> std::cmp::Ordering {
                // PartialCmp will always return Some(_) for usize,
                // which is the thing we're comparing.
                self.1.partial_cmp(&other.1).unwrap()
            }
        }

        // Sort the edges by the argument index.
        parent_edges.sort();

        // Check that the argument indices form a range 0..N
        for (i, e) in parent_edges.iter().enumerate() {
            if e.1 != i {
                return Err(GraphQueryError::IncorrectOrderedOperandEdge);
            }
        }

        // Finally, return the parent node indices sorted by their
        // argument index
        Ok(parent_edges.iter().map(|x| x.0).collect())
    }
}

#[cfg(test)]
mod tests {
    use std::convert::Infallible;

    use super::*;
    use crate::{
        transforms::{GraphTransforms, Transform},
        Context, Operation as OperationTrait,
    };

    #[derive(Clone, Debug, Hash, PartialEq, Eq)]
    enum Operation {
        Add,
        Mul,
        In,
    }

    impl OperationTrait for Operation {
        fn is_binary(&self) -> bool {
            matches!(self, Self::Add | Self::Mul)
        }

        fn is_commutative(&self) -> bool {
            matches!(self, Self::Add | Self::Mul)
        }

        fn is_unary(&self) -> bool {
            false
        }

        fn is_unordered(&self) -> bool {
            false
        }

        fn is_ordered(&self) -> bool {
            false
        }
    }

    type TestGraph = Context<Operation, ()>;

    fn create_simple_dag() -> TestGraph {
        let mut graph = TestGraph::new(());

        let in_1 = graph.add_node(Operation::In);
        let in_2 = graph.add_node(Operation::In);
        let add = graph.add_binary_operation(Operation::Add, in_1, in_2);
        let in_3 = graph.add_node(Operation::In);
        graph.add_binary_operation(Operation::Mul, add, in_3);

        graph
    }

    #[test]
    fn can_forward_traverse() {
        let ir = create_simple_dag();

        let mut visited = vec![];

        forward_traverse(&ir.graph, |_, n| {
            visited.push(n);

            Ok::<_, Infallible>(())
        })
        .unwrap();

        assert_eq!(
            visited,
            vec![
                // Inputs first visited in order
                NodeIndex::from(0),
                NodeIndex::from(1),
                NodeIndex::from(3),
                // Then the addition
                NodeIndex::from(2),
                // And finally the multiplication which depends on the addition
                NodeIndex::from(4)
            ]
        );
    }

    #[test]
    fn can_build_simple_dag() {
        let ir = create_simple_dag();

        assert_eq!(ir.graph.node_count(), 5);

        let nodes = ir
            .graph
            .node_identifiers()
            .map(|i| (i, &ir.graph[i]))
            .collect::<Vec<(NodeIndex, &NodeInfo<Operation>)>>();

        assert_eq!(nodes[0].1.operation, Operation::In);
        assert_eq!(nodes[1].1.operation, Operation::In);
        assert_eq!(nodes[2].1.operation, Operation::Add);
        assert_eq!(nodes[3].1.operation, Operation::In);
        assert_eq!(nodes[4].1.operation, Operation::Mul);

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
    fn can_reverse_traverse() {
        let ir = create_simple_dag();

        let mut visited = vec![];

        reverse_traverse(&ir.graph, |_, n| {
            visited.push(n);
            Ok::<_, Infallible>(())
        })
        .unwrap();

        assert_eq!(
            visited,
            vec![
                // First the mul (4), which depends on (2, 3)
                NodeIndex::from(4),
                // The RHS of the mul (4)
                NodeIndex::from(3),
                // Then the LHS of the mul, which is the add (2)
                NodeIndex::from(2),
                // Then the add inputs
                NodeIndex::from(1),
                NodeIndex::from(0),
            ]
        );
    }

    #[test]
    fn can_delete_during_traversal() {
        let mut ir = create_simple_dag();

        let mut visited = vec![];

        reverse_traverse_mut(&mut ir.graph, |_, n| {
            visited.push(n);
            // Delete the addition
            if n.index() == 2 {
                let mut transforms = GraphTransforms::new();
                transforms.push(Transform::RemoveNode(n.into()));

                Ok::<_, Infallible>(transforms)
            } else {
                Ok::<_, Infallible>(GraphTransforms::default())
            }
        })
        .unwrap();

        // we should end up with the same order as without the deletion,
        // as we still mark the addition as visited
        assert_eq!(
            visited,
            vec![
                NodeIndex::from(4),
                NodeIndex::from(3),
                NodeIndex::from(2),
                NodeIndex::from(1),
                NodeIndex::from(0),
            ]
        );
    }

    #[test]
    fn can_append_during_traversal() {
        let mut ir = create_simple_dag();

        let mut visited = vec![];

        forward_traverse_mut(&mut ir.graph, |_, n| {
            visited.push(n);

            // Add a multplication
            if n.index() == 2 {
                let mut transforms: GraphTransforms<NodeInfo<Operation>, EdgeInfo> =
                    GraphTransforms::new();
                let mul = transforms.push(Transform::AddNode(NodeInfo {
                    operation: Operation::Mul,
                }));
                transforms.push(Transform::AddEdge(n.into(), mul.into(), EdgeInfo::Left));
                transforms.push(Transform::AddEdge(
                    NodeIndex::from(1).into(),
                    mul.into(),
                    EdgeInfo::Right,
                ));

                let ret = transforms.clone();

                transforms.apply(&mut create_simple_dag().graph.0);

                Ok::<_, Infallible>(ret)
            } else {
                Ok::<_, Infallible>(GraphTransforms::default())
            }
        })
        .unwrap();

        // The difference from the forward traversal without append should just be the new node
        // inserted right before the mul (4). this is because, while the new node doesn't have any
        // unvisited dependencies, it still gets added to the _end_ of the ready queue. The (4)
        // node still comes later because, at the time of the append, that node is _not_ yet ready
        // and thus not yet in the queue.
        assert_eq!(
            visited,
            vec![
                NodeIndex::from(0),
                NodeIndex::from(1),
                NodeIndex::from(3),
                NodeIndex::from(2),
                NodeIndex::from(5),
                NodeIndex::from(4),
            ]
        );
    }
}
