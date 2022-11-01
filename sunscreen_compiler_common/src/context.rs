use std::fmt::Debug;
use std::ops::{Deref, DerefMut};

use petgraph::stable_graph::{NodeIndex, StableGraph};
use petgraph::visit::{EdgeRef, IntoEdgeReferences, IntoNodeReferences};

use crate::{Operation, Render};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct NodeInfo<O>
where
    O: Operation,
{
    pub operation: O,
}

impl<O> Render for NodeInfo<O>
where
    O: Operation,
{
    fn render(&self) -> String {
        format!("{:?}", self)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EdgeInfo {
    Left,
    Right,
    Unary,
}

impl EdgeInfo {
    pub fn is_left(&self) -> bool {
        matches!(self, Self::Left)
    }

    pub fn is_right(&self) -> bool {
        matches!(self, Self::Right)
    }

    pub fn is_unary(&self) -> bool {
        matches!(self, Self::Unary)
    }
}

impl Render for EdgeInfo {
    fn render(&self) -> String {
        format!("{:?}", self)
    }
}

#[derive(Clone)]
pub struct FrontendCompilation<O>(pub StableGraph<NodeInfo<O>, EdgeInfo>)
where
    O: Operation;

impl<O> Deref for FrontendCompilation<O>
where
    O: Operation,
{
    type Target = StableGraph<NodeInfo<O>, EdgeInfo>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<O> Debug for FrontendCompilation<O>
where
    O: Operation,
{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "Nodes = [")?;

        for (i, n) in self.node_references() {
            writeln!(f, "  {:?}: {:?}", i, n)?;
        }

        writeln!(f, "]")?;

        writeln!(f, "Edges = [")?;

        for i in self.edge_references() {
            writeln!(f, "  {:?}->{:?}: {:?}", i.source(), i.target(), i.weight())?;
        }

        writeln!(f, "]")
    }
}

impl<O> DerefMut for FrontendCompilation<O>
where
    O: Operation,
{
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl<O> FrontendCompilation<O>
where
    O: Operation,
{
    pub fn new() -> Self {
        Self(StableGraph::new())
    }
}

pub struct Context<O>
where
    O: Operation,
{
    pub graph: FrontendCompilation<O>,

    #[allow(unused)]
    /**
     * Consumers can use this to uniquely number their inputs.
     */
    pub next_input_id: u32,
}

impl<O> Context<O>
where
    O: Operation,
{
    pub fn new() -> Self {
        Self {
            graph: FrontendCompilation::<O>::new(),
            next_input_id: 0,
        }
    }

    pub fn add_node(&mut self, operation: O) -> NodeIndex {
        self.graph.add_node(NodeInfo { operation })
    }

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

    pub fn add_unary_operation(&mut self, operation: O, parent: NodeIndex) -> NodeIndex {
        let node = self.add_node(operation);

        self.graph.add_edge(parent, node, EdgeInfo::Unary);

        node
    }
}
