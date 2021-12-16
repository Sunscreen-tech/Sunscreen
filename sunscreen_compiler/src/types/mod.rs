mod integer;

use crate::{with_ctx, Literal, INDEX_ARENA};

use petgraph::stable_graph::NodeIndex;
use serde::{Deserialize, Serialize};
pub use sunscreen_runtime::{
    BfvType, FheType, NumCiphertexts, TryFromPlaintext, TryIntoPlaintext, Type, TypeName,
    TypeNameInstance, Version,
};

pub use integer::{Signed, Unsigned};
use std::ops::{Add, Mul};

#[derive(Clone, Copy, Serialize, Deserialize)]
/**
 * A reference to a u64 literal in a circuit graph.
 */
pub struct U64LiteralRef {}

impl U64LiteralRef {
    /**
     * Creates a reference to the given literal. If the given literal already exists in the current
     * graph, a reference to the existing literal is returned.
     */
    pub fn new(val: u64) -> NodeIndex {
        with_ctx(|ctx| ctx.add_literal(Literal::U64(val)))
    }
}

#[derive(Debug, Copy, Clone, PartialEq, Eq)]
/**
 * A type that wraps an FheType during graph construction. It is an implementation
 * detail and you should not construct these directly.
 * Outside of very specific semantics, use-after-free and other undefined behaviors may occur.
 * 
 * # Remarks
 * This type serves as an anchor so users can apply +, *, -, /, <<, and >> operators
 * on types inside a circuit function. If the underlying type `T` implements the
 * [`GraphAdd`], [`GraphMul`], etc trait, then `CircuitNode<T>` implements
 * [`std::ops::Add`], [`std::ops::Mul`], etc and proxies to T's underlying
 * implementation.
 * 
 * This type impls the Copy trait so users don't have to call .clone() all the time.
 * Unfortunately, this rules out the clean implementation of using a `Vec<NodeIndex>`
 * to store the graph nodes T represents; [`Vec`] does not impl [`Copy`], and thus it
 * cannot exist in this type. To circumvent this limitation, we use a threadlocal
 * arena of [`NodeIndex`](petgraph::stable_graph::NodeIndex) to allocate and copy
 * slices. This requires we lie about the lifetime of ids, which isn't actually 'static,
 * but rather until we clear the arena. We clean the arena in the circuit macro after
 * circuit construction and thus after all CircuitNodes have gone out of scope.
 * 
 * # Undefined behavior
 * These types must be constructed while a [`CURRENT_CTX`] refers to a valid
 * [`Context`]. Furthermore, no [`CircuitNode`] should outlive the said context.
 * Violating any of these condicitions may result in memory corruption or
 * use-after-free.
 */
pub struct CircuitNode<T: FheType> {
    /**
     * The ids on this node. The 'static lifetime on this slice is a lie. The sunscreen
     * compiler must ensure that no CircuitNode exists after circuit construction.
     */
    pub ids: &'static [NodeIndex],

    _phantom: std::marker::PhantomData<T>,
}

impl <T: FheType> CircuitNode<T> {
    /**
     * Creates a new circuit node with the given node index.
     * 
     * These are an implementation detail needed while constructing the circuit graph
     * and should not be constructed at any other time. Thus, you should never
     * directly create a [`CircuitNode`].
     * 
     * # Remarks
     * This type internally captures a slice rather than directly storing its own Vec. We do this
     * so the type can impl Copy and composing circuits is natural without the user needing to call
     * clone() all the time.
     * 
     * # Undefined behavior
     * This type references memory in a backing [`Context`] and without carefully ensuring CircuitNodes
     * never outlive the backing context, use-after-free can occur.
     * 
     */
    pub fn new(ids: &[NodeIndex]) -> Self {
        INDEX_ARENA.with(|allocator| {
            let allocator = allocator.borrow();   
            let ids_dest = allocator.alloc_slice_copy(ids);

            ids_dest.copy_from_slice(ids);

            // The memory in the bump allocator is valid until we call reset, which
            // we do after creating the circuit. At this time, no CircuitNodes should
            // remain.
            Self {
                ids: unsafe { std::mem::transmute(ids_dest) },
                _phantom: std::marker::PhantomData,
            }
        })
    }

    /**
     * Creates a new CircuitNode denoted as an input to a circuit graph.
     * 
     * You should not call this, but rather allow the [`circuit`] macro to do this on your behalf.
     * 
     * # Undefined behavior
     * This type references memory in a backing [`Context`] and without carefully ensuring CircuitNodes
     * never outlive the backing context, use-after-free can occur.
     * 
     */
    pub fn input() -> Self {
        let mut ids = Vec::with_capacity(T::NUM_CIPHERTEXTS);

        for _ in 0..T::NUM_CIPHERTEXTS {
            ids.push(with_ctx(|ctx| ctx.add_input()));
        }
        
        CircuitNode::new(&ids)
    }

    /**
     * Denote this node as an output by appending an output circuit node.
     * 
     * You should not call this, but rather allow the [`circuit`] macro to do this on your behalf.
     * 
     * # Undefined behavior
     * This type references memory in a backing [`Context`] and without carefully ensuring CircuitNodes
     * never outlive the backing context, use-after-free can occur.
     * 
     */
    pub fn output(&self) -> Self {
        let mut ids = Vec::with_capacity(self.ids.len());

        for i in 0..self.ids.len() {
            ids.push(with_ctx(|ctx| ctx.add_output(self.ids[i])));
        }
        
        CircuitNode::new(&ids)
    }

    /**
     * Returns the plain modulus parameter for the given BFV scheme
     */
    pub fn get_plain_modulus() -> u64 {
        with_ctx(|ctx| ctx.params.plain_modulus)
    }
}

/**
 * Called when a circuit encounters a + operation.
 */
pub trait GraphAdd {
    /**
     * The type of the left operand
     */
    type Left: FheType;

    /**
     * The type of the right operand
     */
    type Right: FheType;

    /**
     * Process the + operation
     */
    fn graph_add(a: CircuitNode<Self::Left>, b: CircuitNode<Self::Right>) -> CircuitNode<Self::Left>;
}

/**
 * Called when a circuit encounters a * operation.
 */
pub trait GraphMul {
    /**
     * The type of the left operand
     */
    type Left: FheType;

    /**
     * The type of the right operand
     */
    type Right: FheType;

    /**
     * Process the * operation
     */
    fn graph_mul(a: CircuitNode<Self::Left>, b: CircuitNode<Self::Right>) -> CircuitNode<Self::Left>;
}

/**
 * Called when a circuit encounters a / operation.
 */
pub trait GraphDiv {
    /**
     * The type of the left operand
     */
    type Left: FheType;

    /**
     * The type of the right operand
     */
    type Right: FheType;

    /**
     * Process the + operation
     */
    fn graph_mul(a: CircuitNode<Self::Left>, b: CircuitNode<Self::Right>) -> CircuitNode<Self::Left>;
}

impl <T> Add for CircuitNode<T> 
where T: FheType + GraphAdd<Left=T, Right=T>
{
    type Output = Self;

    fn add(self, rhs: Self) -> Self::Output {
        T::graph_add(self, rhs)
    }
}

impl <T> Mul for CircuitNode<T> 
where T: FheType + GraphMul<Left=T, Right=T>
{
    type Output = Self;

    fn mul(self, rhs: Self) -> Self::Output {
        T::graph_mul(self, rhs)
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
