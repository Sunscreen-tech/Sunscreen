mod integer;

use crate::{with_ctx, Literal};

use petgraph::stable_graph::NodeIndex;
pub use semver::Version;
use serde::{
    de::{self, Visitor},
    Deserialize, Deserializer, Serialize, Serializer,
};

pub use integer::Unsigned;

/**
 * Denotes the given rust type is an encoding in an FHE scheme
 */
pub trait FheType {}

/**
 * Denotes the given type is valid under the [SchemeType::BFV](crate::SchemeType::Bfv).
 */
pub trait BfvType: FheType {}

#[derive(Clone, Copy, Serialize, Deserialize)]
/**
 * A reference to a u64 literal in a circuit graph.
 */
pub struct U64LiteralRef {}

impl FheType for U64LiteralRef {}
impl BfvType for U64LiteralRef {}

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

/**
 * A type which represents the fully qualified name and version of a datatype.
 */
#[derive(Debug, Clone, PartialEq)]
pub struct Type {
    /**
     * The fully qualified name of the type (including crate name)
     */
    pub name: String,

    /**
     * The semantic version of this type.
     */
    pub version: Version,
}

impl Serialize for Type {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let type_string = format!("{},{}", self.name, self.version);

        serializer.serialize_str(&type_string)
    }
}

struct TypeNameVisitor;

impl<'de> Visitor<'de> for TypeNameVisitor {
    type Value = String;

    fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(formatter, "A string of the form foo::bar::Baz,1.2.3")
    }

    fn visit_str<E>(self, s: &str) -> std::result::Result<Self::Value, E>
    where
        E: de::Error,
    {
        if s.split(",").count() != 2 {
            Err(de::Error::invalid_value(de::Unexpected::Str(s), &self))
        } else {
            Ok(s.to_owned())
        }
    }
}

impl<'de> Deserialize<'de> for Type {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let type_string = deserializer.deserialize_string(TypeNameVisitor)?;

        let mut splits = type_string.split(",");

        let typename = splits.next().unwrap();
        let version = Version::parse(splits.next().unwrap())
            .map_err(|e| de::Error::custom(format!("Failed to parse version: {}", e)))?;

        Ok(Self {
            name: typename.to_owned(),
            version,
        })
    }
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
