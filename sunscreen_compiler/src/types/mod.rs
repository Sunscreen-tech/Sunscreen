mod integer;

use crate::{with_ctx, Literal};

use petgraph::stable_graph::NodeIndex;
use serde::{Deserialize, Serialize};
pub use sunscreen_runtime::{TryFromPlaintext, TryIntoPlaintext, Type, Version};

pub use integer::Unsigned;

/**
 * Denotes the given rust type is an encoding in an FHE scheme
 */
pub trait FheType: TypeName + TryFromPlaintext + TryIntoPlaintext {}

/**
 * Denotes the given type is valid under the [SchemeType::BFV](crate::SchemeType::Bfv).
 */
pub trait BfvType: FheType {}

#[derive(Clone, Copy, Serialize, Deserialize)]
/**
 * A reference to a u64 literal in a circuit graph.
 */
pub struct U64LiteralRef {}

//impl FheType for U64LiteralRef {}
//impl BfvType for U64LiteralRef {}

impl U64LiteralRef {
    /**
     * Creates a reference to the given literal. If the given literal already exists in the current
     * graph, a reference to the existing literal is returned.
     */
    pub fn new(val: u64) -> NodeIndex {
        with_ctx(|ctx| ctx.add_literal(Literal::U64(val)))
    }
}

#[derive(Copy, Clone, Debug, PartialEq, Eq)]
/**
 * A type that wraps an FheType during graph construction
 */
pub struct CircuitNode<T: FheType> {
    /**
     * The node's index
     */
    pub id: NodeIndex,

    _phantom: std::marker::PhantomData<T>,
}

impl<T: FheType> CircuitNode<T> {
    /**
     * Creates a new circuit node with the given node index.
     */
    pub fn new(id: NodeIndex) -> Self {
        Self {
            id,
            _phantom: std::marker::PhantomData,
        }
    }

    /**
     * Creates a new CircuitNode denoted as an input to a circuit graph.
     */
    pub fn input() -> Self {
        with_ctx(|ctx| Self::new(ctx.add_input()))
    }

    /**
     * Denote this node as an output by appending an output circuit node.
     */
    pub fn output(&self) -> Self {
        with_ctx(|ctx| Self::new(ctx.add_output(self.id)))
    }
}

/**
 * A trait the gives a name an version to a given type
 */
pub trait TypeName {
    /**
     * Returns the [`Type`] of the given Rust type.
     */
    fn type_name() -> Type;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_serialize_deserialize_typename() {
        let typename = Type {
            name: "foo::Bar".to_owned(),
            version: Version::new(42, 24, 6),
        };

        let serialized = serde_json::to_string(&typename).unwrap();
        let deserialized: Type = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.name, typename.name);
        assert_eq!(deserialized.version, typename.version);
    }
}
