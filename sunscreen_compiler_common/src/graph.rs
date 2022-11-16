use std::collections::HashSet;

use petgraph::{
    dot::Dot,
    stable_graph::{Edges, Neighbors, NodeIndex, StableGraph},
    visit::IntoNodeIdentifiers,
    Directed, Direction,
};

use crate::Render;

/**
 * A wrapper for ascertaining the structure of the underlying graph.
 * This type is used in [`forward_traverse`] and
 * [`reverse_traverse`] callbacks.
 */
pub struct GraphQuery<'a, N, E>(&'a StableGraph<N, E>);

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
     * Apply the transformations.
     */
    fn apply(&mut self, graph: &mut StableGraph<N, E>);
}

// Make a surrogate implementation of the trait for traversal functions
// that don't mutate the graph.
impl<N, E> TransformList<N, E> for () where N: Clone, E: Clone {
    fn apply(&mut self, graph: &mut StableGraph<N, E>) { }
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
pub fn forward_traverse<N, E, F, T, Err>(graph: &mut StableGraph<N, E>, callback: F) -> Result<(), Err>
where
    N: Clone,
    E: Clone,
    T: TransformList<N, E>,
    F: FnMut(GraphQuery<N, E>, NodeIndex) -> Result<T, Err>,
{
    traverse(graph, true, callback)
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
pub fn reverse_traverse<N, E, F, T, Err>(graph: &mut StableGraph<N, E>, callback: F)  -> Result<(), Err>
where
    N: Clone,
    E: Clone,
    T: TransformList<N, E>,
    F: FnMut(GraphQuery<N, E>, NodeIndex) -> Result<T, Err>,
{
    traverse(graph, false, callback)
}

fn traverse<N, E, T, F, Err>(graph: &mut StableGraph<N, E>, forward: bool, mut callback: F) -> Result<(), Err>
where
    N: Clone,
    E: Clone,
    F: FnMut(GraphQuery<N, E>, NodeIndex) -> Result<T, Err>,
    T: TransformList<N, E>,
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

    let mut ready_nodes: Vec<NodeIndex> = graph
        .node_identifiers()
        .filter(|&x| graph.neighbors_directed(x, prev_direction).next().is_none())
        .collect();

    ready.extend(ready_nodes.iter());

    while let Some(n) = ready_nodes.pop() {
        visited.insert(n);

        // Remember the next nodes from the current node in case it gets deleted.
        let next_nodes: Vec<NodeIndex> = graph.neighbors_directed(n, next_direction).collect();

        let mut transforms = callback(GraphQuery(graph), n)?;

        // Apply the transforms the callback produced
        transforms.apply(graph);

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
                    ready_nodes.push(i);
                }
            }
        }

        // Iterate through the next nodes that existed before visiting this node.
        for i in next_nodes {
            if !ready.contains(&i) && node_ready(i) {
                ready.insert(i);
                ready_nodes.push(i);
            }
        }

        // Iterate through any sources/sinks the callback may have added.
        let sources = graph
            .node_identifiers()
            .filter(|&x| graph.neighbors_directed(x, prev_direction).next().is_none());

        for i in sources {
            if !ready.contains(&i) {
                ready.insert(i);
                ready_nodes.push(i);
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

        format!("{:?}", data)
    }
}
