use std::fmt::Debug;
use std::ops::{Deref, DerefMut};

use petgraph::algo::is_isomorphic_matching;
use petgraph::stable_graph::{NodeIndex, StableGraph};
use petgraph::visit::{EdgeRef, IntoEdgeReferences, IntoNodeReferences};
use petgraph::Graph;

use crate::{Operation, Render};
use serde::{Deserialize, Serialize};

#[cfg(feature = "debugger")]
use crate::lookup::{GroupLookup, StackFrameLookup};

#[cfg(feature = "debugger")]
use backtrace::Backtrace;

#[cfg(feature = "debugger")]
use std::hash::{Hash, Hasher};

#[cfg(feature = "debugger")]
use std::collections::hash_map::DefaultHasher;

/**
 * Stores debug information about groups and stack traces.
 */
#[cfg(feature = "debugger")]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DebugData {
    /**
     * Used for looking up stack traces given a node's `stack_id`.
     */
    pub stack_lookup: StackFrameLookup,
    /**
     * Used for looking up group data given a node's `group_id`.
     */
    pub group_lookup: GroupLookup,

    /**
     * Used to assign a node's `stack_id`.
     */
    pub stack_counter: u64,

    /**
     * Used to assign a node's `group_id`.
     */
    pub group_counter: u64,
}

#[cfg(feature = "debugger")]
impl DebugData {
    /**
     * Creates a new `DebugData` instance.
     */
    pub fn new() -> Self {
        DebugData {
            stack_lookup: StackFrameLookup::new(),
            group_lookup: GroupLookup::new(),
            group_counter: 0,
            stack_counter: 0,
        }
    }
}

#[cfg(feature = "debugger")]
impl Default for DebugData {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Clone, Deserialize, Serialize, Debug, Eq)]
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

    #[cfg(feature = "debugger")]
    /**
     * The group ID associated with the ProgramNode.
     */
    pub group_id: u64,

    #[cfg(feature = "debugger")]
    /**
     * The stack ID associated with the ProgramNode.
     */
    pub stack_id: u64,
}

impl<O: Operation> PartialEq for NodeInfo<O> {
    fn eq(&self, other: &Self) -> bool {
        self.operation.eq(&other.operation)
    }
}

impl<O> NodeInfo<O>
where
    O: Operation,
{
    /**
     * Creates a new [`NodeInfo`] without debug information.
     */
    #[cfg(not(feature = "debugger"))]
    pub fn new(operation: O) -> Self {
        Self { operation }
    }

    /**
     * Creates a new [`NodeInfo`] with debug information.
     */
    #[cfg(feature = "debugger")]
    pub fn new(operation: O, group_id: u64, stack_id: u64) -> Self {
        Self {
            operation,
            group_id,
            stack_id,
        }
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
    Ordered {
        /**
         * The value of the edge.
         */
        value: usize,
    },
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
pub struct CompilationResult<O>
where
    O: Operation,
{
    /**
     * The compilation graph.
     */
    pub graph: StableGraph<NodeInfo<O>, EdgeInfo>,

    /**
     * Stores group data and stack traces.
     */
    #[cfg(feature = "debugger")]
    pub metadata: DebugData,
}

impl<O> Deref for CompilationResult<O>
where
    O: Operation,
{
    type Target = StableGraph<NodeInfo<O>, EdgeInfo>;

    fn deref(&self) -> &Self::Target {
        &self.graph
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
            &Graph::from(self.graph.clone()),
            &Graph::from(b.graph.clone()),
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
        &mut self.graph
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
        Self {
            graph: StableGraph::new(),
            #[cfg(feature = "debugger")]
            metadata: DebugData::new(),
        }
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

/**
 * Program groups are given names as strings.
 */
pub type Group = String;

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

    #[cfg(feature = "debugger")]
    /**
     * Represents the program context. Tracks groups of nodes in the compilation graph.
     */
    pub group_stack: Vec<Group>,

    #[cfg(feature = "debugger")]
    /// The next id suffix appended to a group
    pub next_group_id: u64,
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
            #[cfg(feature = "debugger")]
            group_stack: Vec::new(),
            #[cfg(feature = "debugger")]
            next_group_id: 0,
        }
    }

    /**
     * Add a node to the parse graph.
     */
    pub fn add_node(&mut self, operation: O) -> NodeIndex {
        #[cfg(feature = "debugger")]
        {
            // Capture backtrace and insert into lookup
            let bt = Backtrace::new();
            let mut hasher = DefaultHasher::new();
            let stack_frames = self
                .graph
                .metadata
                .stack_lookup
                .backtrace_to_stackframes(bt);
            stack_frames.hash(&mut hasher);
            let hash = hasher.finish();

            let stack_id = *self
                .graph
                .metadata
                .stack_lookup
                .data_id_lookup
                .entry(hash)
                .or_insert_with(|| {
                    self.graph.metadata.stack_counter += 1;
                    self.graph.metadata.stack_counter
                });

            let group_id = self.graph.metadata.group_counter;

            self.graph
                .metadata
                .stack_lookup
                .id_data_lookup
                .entry(stack_id)
                .or_insert(stack_frames);

            self.graph.add_node(NodeInfo {
                operation,
                group_id,
                stack_id,
            })
        }
        #[cfg(not(feature = "debugger"))]
        {
            self.graph.add_node(NodeInfo { operation })
        }
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
