use petgraph::stable_graph::NodeIndex;

use crate::graph::TransformList;

/**
 * The index type for referring to nodes in the current transform list
 * that have not yet been added to the graph.
 */
pub type DeferredIndex = usize;

#[derive(Clone, Copy)]
/**
 * The index of a graph node, either in the compilation graph or
 * resulting from a previous unapplied transformation.
 */
pub enum TransformNodeIndex {
    /**
     * Refers to the node in the compilation graph at the contained
     * index.
     */
    NodeIndex(NodeIndex),

    /**
     * Refers to the node resulting from a previous [`Transform::AddNode`]
     * transform.
     */
    DeferredIndex(DeferredIndex),
}

/**
 * A request to transform the graph as appropriate.
 */
pub enum Transform<N, E> {
    /**
     * Add an edge between two nodes at the given edges.
     *
     * # Remarks
     * The tuple is of the form (from, to, edge).
     */
    AddEdge(TransformNodeIndex, TransformNodeIndex, E),

    /**
     * Add the given node to the compilation graph.
     */
    AddNode(N),

    /**
     * Remove the node at the given index. This will implicitly remove
     * any edges referencing the node.
     */
    RemoveNode(TransformNodeIndex),

    /**
     * Remove an edge between two nodes.
     *
     * # Remarks
     * The tuple is of the form (from, to)
     */
    RemoveEdge(TransformNodeIndex, TransformNodeIndex),
}

/**
 * A datastructure for holding a sequence of graph transformations.
 */
pub struct GraphTransforms<N, E> {
    transforms: Vec<Transform<N, E>>,
    inserted_node_ids: Vec<Option<NodeIndex>>,
}

impl<N, E> GraphTransforms<N, E> {
    /**
     * Creates a new [`GraphTransforms`].
     */
    pub fn new() -> Self {
        Self {
            transforms: vec![],
            inserted_node_ids: vec![],
        }
    }

    fn materialize_index(&self, id: TransformNodeIndex) -> NodeIndex {
        match id {
            TransformNodeIndex::NodeIndex(x) => x,
            TransformNodeIndex::DeferredIndex(x) => {
                self.inserted_node_ids[x].expect("Invalid transform node id.")
            }
        }
    }

    /**
     * Pushes a transform into the list and returns the index of the
     * pushed transform suitable for use in
     * [`TransformNodeIndex::DeferredIndex`].
     * This allows you to reference nodes that haven't yet been added to
     * the graph in subsequent transforms.
     *
     * # Remarks
     * It goes without saying, if the pushed transform isn't
     * [`Transform::AddNode`], you shouldn't attempt to use this index.
     */
    pub fn push(&mut self, t: Transform<N, E>) -> DeferredIndex {
        self.transforms.push(t);

        self.transforms.len() - 1
    }
}

impl<N, E> Default for GraphTransforms<N, E>
where
    N: Copy,
    E: Copy,
{
    fn default() -> Self {
        Self::new()
    }
}

impl<N, E> TransformList<N, E> for GraphTransforms<N, E>
where
    N: Copy,
    E: Copy,
{
    fn apply(&mut self, graph: &mut petgraph::stable_graph::StableGraph<N, E>) {
        for t in &self.transforms {
            let inserted_node = match t {
                Transform::AddNode(n) => Some(graph.add_node(*n)),
                Transform::AddEdge(start, end, info) => {
                    let start = self.materialize_index(*start);
                    let end = self.materialize_index(*end);

                    graph.add_edge(start, end, *info);

                    None
                }
                Transform::RemoveEdge(start, end) => {
                    let start = self.materialize_index(*start);
                    let end = self.materialize_index(*end);
                    let edge = graph.find_edge(start, end).expect("No such edge");

                    graph.remove_edge(edge);

                    None
                }
                Transform::RemoveNode(n) => {
                    let n = self.materialize_index(*n);
                    graph.remove_node(n);

                    None
                }
            };

            self.inserted_node_ids.push(inserted_node);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use petgraph::stable_graph::StableGraph;

    #[test]
    fn can_transform_graph() {
        use TransformNodeIndex::*;

        let mut graph: StableGraph<(), ()> = StableGraph::new();

        let n0 = graph.add_node(());
        let n1 = graph.add_node(());
        let n2 = graph.add_node(());
        let n3 = graph.add_node(());

        graph.add_edge(n0, n1, ());
        graph.add_edge(n1, n2, ());
        graph.add_edge(n3, n2, ());

        let mut transforms: GraphTransforms<(), ()> = GraphTransforms::new();

        let n4 = TransformNodeIndex::DeferredIndex(transforms.push(Transform::AddNode(())));
        transforms.push(Transform::AddEdge(NodeIndex(n2), n4, ()));
        transforms.push(Transform::RemoveEdge(NodeIndex(n3), NodeIndex(n2)));
        transforms.push(Transform::RemoveNode(NodeIndex(n1)));

        transforms.apply(&mut graph);

        assert_eq!(graph.node_count(), 4);
        assert_eq!(graph.edge_count(), 1);
    }
}
