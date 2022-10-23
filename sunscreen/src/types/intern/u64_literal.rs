use crate::{with_ctx, Literal};
use petgraph::stable_graph::NodeIndex;

#[derive(Clone, Copy)]
/**
 * A reference to a u64 literal in an Fhe Program graph.
 */
pub struct U64LiteralRef {}

impl U64LiteralRef {
    /**
     * Creates a reference to the given literal. If the given literal already exists in the current
     * graph, a reference to the existing literal is returned.
     */
    pub fn node(val: u64) -> NodeIndex {
        with_ctx(|ctx| ctx.add_literal(Literal::U64(val)))
    }
}
