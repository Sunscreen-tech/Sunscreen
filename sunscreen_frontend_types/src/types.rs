use std::ops::{Add, Mul, Shl, Shr};

use petgraph::stable_graph::NodeIndex;
use serde::{Deserialize, Serialize};

use crate::{Context, Literal, CURRENT_CTX};

#[derive(Clone, Copy, Serialize, Deserialize)]
struct U64LiteralRef {}

impl FheType for U64LiteralRef {}
impl BfvType for U64LiteralRef {}

impl U64LiteralRef {
    pub fn new(val: u64) -> NodeIndex {
        with_ctx(|ctx| ctx.add_literal(Literal::U64(val)))
    }
}

/**
 * Denotes the given rust type is an encoding in an FHE scheme
 */
pub trait FheType {}

/**
 * Denotes the given type is valid under the [SchemeType::BFV](crate::SchemeType::Bfv).
 */
pub trait BfvType: FheType {}

impl CircuitNode<Unsigned> {
    /**
     * Returns the plain modulus parameter for the given BFV scheme
     */
    pub fn get_plain_modulus() -> u64 {
        with_ctx(|ctx| ctx.params.plain_modulus)
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

#[derive(Clone, Copy)]
/**
 * Represents a single unsigned integer encrypted as a ciphertext. Suitable for use
 * as an input or output for a Sunscreen circuit.
 */
pub struct Unsigned {
    /**
     * The internal graph node id of this input or output.
     */
    pub id: NodeIndex,
}

impl FheType for Unsigned {}
impl BfvType for Unsigned {}

impl Unsigned {}

impl Add for CircuitNode<Unsigned> {
    type Output = Self;

    fn add(self, other: Self) -> Self {
        with_ctx(|ctx| Self::new(ctx.add_addition(self.id, other.id)))
    }
}

impl Mul for CircuitNode<Unsigned> {
    type Output = Self;

    fn mul(self, other: Self) -> Self {
        with_ctx(|ctx| Self::new(ctx.add_multiplication(self.id, other.id)))
    }
}

impl Shl<u64> for CircuitNode<Unsigned> {
    type Output = Self;

    fn shl(self, n: u64) -> Self {
        let l = U64LiteralRef::new(n);

        with_ctx(|ctx| Self::new(ctx.add_rotate_left(self.id, l)))
    }
}

impl Shr<u64> for CircuitNode<Unsigned> {
    type Output = Self;

    fn shr(self, n: u64) -> Self {
        let l = U64LiteralRef::new(n);

        with_ctx(|ctx| Self::new(ctx.add_rotate_right(self.id, l)))
    }
}

fn with_ctx<F, R>(f: F) -> R
where
    F: FnOnce(&mut Context) -> R,
{
    CURRENT_CTX.with(|ctx| {
        let mut option = ctx.borrow_mut();
        let ctx = option
            .as_mut()
            .expect("Called Ciphertext::new() outside of a context.");

        f(ctx)
    })
}
