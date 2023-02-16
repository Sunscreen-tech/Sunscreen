use std::fmt::Debug;
use std::ops::{Deref, DerefMut};

use petgraph::algo::is_isomorphic_matching;
use petgraph::stable_graph::{NodeIndex, StableGraph};
use petgraph::visit::{EdgeRef, IntoEdgeReferences, IntoNodeReferences};
use petgraph::Graph;
use serde::{Deserialize, Serialize};

use crate::{Operation, Render};

#[derive(Clone, Deserialize, Serialize, Debug, PartialEq, Eq)]
/**
 * Information about a node in the compilation graph.
 */
pub struct NodeInfo<O>
where
    O: Operation,
{
    /**
     * The operation this node performs.
     */
    pub operation: O,
}

impl<O> NodeInfo<O>
where
    O: Operation,
{
    /**
     * Creates a new [`NodeInfo`].
     */
    pub fn new(operation: O) -> Self {
        Self { operation }
    }
}

impl<O> Render for NodeInfo<O>
where
    O: Operation,
{
    fn render(&self) -> String {
        format!("{self:?}")
    }
}

impl<O> ToString for NodeInfo<O>
where
    O: Operation,
{
    fn to_string(&self) -> String {
        self.render()
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize)]
/**
 * Information about how one compiler graph node relates to another.
 */
pub enum EdgeInfo {
    /**
     * The source node is the left operand of the target.
     */
    Left,

    /**
     * The source node is the right operand of the target.
     */
    Right,

    /**
     * The source node is the only unary operand of the target.
     */
    Unary,

    /**
     * The source node is one of N unordered operands.
     */
    Unordered,

    /**
     * The source is node is i of N ordered operands.
     */
    Ordered(usize),
}

impl EdgeInfo {
    /**
     * Whether or not this edge is a left operand.
     */
    pub fn is_left(&self) -> bool {
        matches!(self, Self::Left)
    }

    /**
     * Whether or not this edge is a right operand.
     */
    pub fn is_right(&self) -> bool {
        matches!(self, Self::Right)
    }

    /**
     * Whether or not this edge is a unary operand.
     */
    pub fn is_unary(&self) -> bool {
        matches!(self, Self::Unary)
    }
}

impl Render for EdgeInfo {
    fn render(&self) -> String {
        format!("{self:?}")
    }
}

#[derive(Clone, Deserialize, Serialize)]
/**
 * The result of a frontend compiler.
 */
pub struct CompilationResult<O>(pub StableGraph<NodeInfo<O>, EdgeInfo>)
where
    O: Operation;

impl<O> Deref for CompilationResult<O>
where
    O: Operation,
{
    type Target = StableGraph<NodeInfo<O>, EdgeInfo>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<O> PartialEq for CompilationResult<O>
where
    O: Operation,
{
    /// FOR TESTING ONLY!!!
    /// Graph isomorphism is an NP-Complete problem!
    fn eq(&self, b: &Self) -> bool {
        is_isomorphic_matching(
            &Graph::from(self.0.clone()),
            &Graph::from(b.0.clone()),
            |n1, n2| n1 == n2,
            |e1, e2| e1 == e2,
        )
    }
}

impl<O> Debug for CompilationResult<O>
where
    O: Operation,
{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "Nodes = [")?;

        for (i, n) in self.node_references() {
            writeln!(f, "  {i:?}: {n:?}")?;
        }

        writeln!(f, "]")?;

        writeln!(f, "Edges = [")?;

        for i in self.edge_references() {
            writeln!(f, "  {:?}->{:?}: {:?}", i.source(), i.target(), i.weight())?;
        }

        writeln!(f, "]")
    }
}

impl<O> DerefMut for CompilationResult<O>
where
    O: Operation,
{
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl<O> CompilationResult<O>
where
    O: Operation,
{
    /**
     * Create a new [`CompilationResult`]
     */
    pub fn new() -> Self {
        Self(StableGraph::new())
    }
}

impl<O> Default for CompilationResult<O>
where
    O: Operation,
{
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
/**
 * A compilation context. This stores the current parse graph.
 */
pub struct Context<O, D>
where
    O: Operation,
{
    /**
     * The parse graph.
     */
    pub graph: CompilationResult<O>,

    #[allow(unused)]
    /**
     * Data given by the consumer.
     */
    pub data: D,
}

impl<O, D> Context<O, D>
where
    O: Operation,
{
    /**
     * Create a new [`Context`].
     */
    pub fn new(data: D) -> Self {
        Self {
            graph: CompilationResult::<O>::new(),
            data,
        }
    }

    /**
     * Add a node to the parse graph.
     */
    pub fn add_node(&mut self, operation: O) -> NodeIndex {
        self.graph.add_node(NodeInfo { operation })
    }

    /**
     * Add a binary operation node to the parse graph and edges for
     * the left and right operands.
     */
    pub fn add_binary_operation(
        &mut self,
        operation: O,
        left: NodeIndex,
        right: NodeIndex,
    ) -> NodeIndex {
        let node = self.add_node(operation);

        self.graph.add_edge(left, node, EdgeInfo::Left);
        self.graph.add_edge(right, node, EdgeInfo::Right);

        node
    }

    /**
     * Add a unary operation node to the parse graph and an edge for
     * the unary operand.
     */
    pub fn add_unary_operation(&mut self, operation: O, parent: NodeIndex) -> NodeIndex {
        let node = self.add_node(operation);

        self.graph.add_edge(parent, node, EdgeInfo::Unary);

        node
    }

    /**
     * Add an edge between `from` and `to`.
     */
    pub fn add_edge(&mut self, from: NodeIndex, to: NodeIndex, edge: EdgeInfo) {
        self.graph.add_edge(from, to, edge);
    }
}
