use crate::{
    types::{intern::FheLiteral, ops::*, Cipher, FheType, NumCiphertexts},
    with_ctx, INDEX_ARENA,
};
use petgraph::stable_graph::NodeIndex;

use std::ops::{Add, Div, Mul, Sub};

#[derive(Debug, Copy, Clone, PartialEq, Eq)]
/**
 * A type that wraps an FheType during graph construction. It is an implementation
 * detail and you should not construct these directly.
 * Outside of very specific semantics, use-after-free and other undefined behaviors may occur.
 *
 * # Remarks
 * This type serves as an anchor so users can apply +, *, -, /, <<, and >> operators
 * on types inside a circuit function. If the underlying type `T` implements the
 * `GraphCipherAdd`, `GraphCipherMul`, etc trait, then `CircuitNode<T>` implements
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
 * These types must be constructed while a [`crate::CURRENT_CTX`] refers to a valid
 * [`crate::Context`]. Furthermore, no [`CircuitNode`] should outlive the said context.
 * Violating any of these condicitions may result in memory corruption or
 * use-after-free.
 */
pub struct CircuitNode<T: NumCiphertexts> {
    /**
     * The ids on this node. The 'static lifetime on this slice is a lie. The sunscreen
     * compiler must ensure that no CircuitNode exists after circuit construction.
     */
    pub ids: &'static [NodeIndex],

    _phantom: std::marker::PhantomData<T>,
}

impl<T: NumCiphertexts> CircuitNode<T> {
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
     * This type references memory in a backing [`crate::Context`] and without carefully ensuring CircuitNodes
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
     * Denote this node as an output by appending an output circuit node.
     *
     * You should not call this, but rather allow the [`crate::circuit`] macro to do this on your behalf.
     *
     * # Undefined behavior
     * This type references memory in a backing [`crate::Context`] and without carefully ensuring CircuitNodes
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

// cipher + cipher
impl<T> Add for CircuitNode<Cipher<T>>
where
    T: FheType + GraphCipherAdd<Left = T, Right = T>,
{
    type Output = Self;

    fn add(self, rhs: Self) -> Self::Output {
        T::graph_cipher_add(self, rhs)
    }
}

// cipher + plain
impl<T> Add<CircuitNode<T>> for CircuitNode<Cipher<T>>
where
    T: FheType + GraphCipherPlainAdd<Left = T, Right = T>,
{
    type Output = Self;

    fn add(self, rhs: CircuitNode<T>) -> Self::Output {
        T::graph_cipher_plain_add(self, rhs)
    }
}

// plain + cipher
impl<T> Add<CircuitNode<Cipher<T>>> for CircuitNode<T>
where
    T: FheType + GraphCipherPlainAdd<Left = T, Right = T>,
{
    type Output = CircuitNode<Cipher<T>>;

    fn add(self, rhs: CircuitNode<Cipher<T>>) -> Self::Output {
        T::graph_cipher_plain_add(rhs, self)
    }
}

// cipher + literal
impl<T, U> Add<T> for CircuitNode<Cipher<U>>
where
    U: FheType + GraphCipherConstAdd<Left = U, Right = T>,
    T: FheLiteral,
{
    type Output = Self;

    fn add(self, rhs: T) -> Self::Output {
        U::graph_cipher_const_add(self, rhs)
    }
}

// literal + cipher
impl<T> Add<CircuitNode<Cipher<T>>> for u64
where
    T: FheType + GraphCipherConstAdd<Left = T, Right = u64> + From<u64>,
{
    type Output = CircuitNode<Cipher<T>>;

    fn add(self, rhs: CircuitNode<Cipher<T>>) -> Self::Output {
        T::graph_cipher_const_add(rhs, self)
    }
}

// literal + cipher
impl<T> Add<CircuitNode<Cipher<T>>> for i64
where
    T: FheType + GraphCipherConstAdd<Left = T, Right = i64> + From<i64>,
{
    type Output = CircuitNode<Cipher<T>>;

    fn add(self, rhs: CircuitNode<Cipher<T>>) -> Self::Output {
        T::graph_cipher_const_add(rhs, self)
    }
}

// literal + cipher
impl<T> Add<CircuitNode<Cipher<T>>> for f64
where
    T: FheType + GraphCipherConstAdd<Left = T, Right = f64> + From<f64>,
{
    type Output = CircuitNode<Cipher<T>>;

    fn add(self, rhs: CircuitNode<Cipher<T>>) -> Self::Output {
        T::graph_cipher_const_add(rhs, self)
    }
}

// cipher - cipher
impl<T> Sub for CircuitNode<Cipher<T>>
where
    T: FheType + GraphCipherSub<Left = T, Right = T>,
{
    type Output = Self;

    fn sub(self, rhs: Self) -> Self::Output {
        T::graph_cipher_sub(self, rhs)
    }
}

// cipher - plaintext
impl<T> Sub<CircuitNode<T>> for CircuitNode<Cipher<T>>
where
    T: FheType + GraphCipherPlainSub<Left = T, Right = T>,
{
    type Output = Self;

    fn sub(self, rhs: CircuitNode<T>) -> Self::Output {
        T::graph_cipher_plain_sub(self, rhs)
    }
}

// cipher - literal
impl<T, U> Sub<T> for CircuitNode<Cipher<U>>
where
    U: FheType + GraphCipherConstSub<Left = U, Right = T>,
    T: FheLiteral,
{
    type Output = Self;

    fn sub(self, rhs: T) -> Self::Output {
        U::graph_cipher_const_sub(self, rhs)
    }
}

// cipher * cipher
impl<T> Mul for CircuitNode<Cipher<T>>
where
    T: FheType + GraphCipherMul<Left = T, Right = T>,
{
    type Output = Self;

    fn mul(self, rhs: Self) -> Self::Output {
        T::graph_cipher_mul(self, rhs)
    }
}

// cipher * plain
impl<T> Mul<CircuitNode<T>> for CircuitNode<Cipher<T>>
where
    T: FheType + GraphCipherPlainMul<Left = T, Right = T>,
{
    type Output = Self;

    fn mul(self, rhs: CircuitNode<T>) -> Self::Output {
        T::graph_cipher_plain_mul(self, rhs)
    }
}

// plain * cipher
impl<T> Mul<CircuitNode<Cipher<T>>> for CircuitNode<T>
where
    T: FheType + GraphCipherPlainMul<Left = T, Right = T>,
{
    type Output = CircuitNode<Cipher<T>>;

    fn mul(self, rhs: CircuitNode<Cipher<T>>) -> Self::Output {
        T::graph_cipher_plain_mul(rhs, self)
    }
}

// cipher * literal
impl<T, U> Mul<T> for CircuitNode<Cipher<U>>
where
    U: FheType + GraphCipherConstMul<Left = U, Right = T>,
    T: FheLiteral,
{
    type Output = Self;

    fn mul(self, rhs: T) -> Self::Output {
        U::graph_cipher_const_mul(self, rhs)
    }
}

// literal * cipher
impl<T> Mul<CircuitNode<Cipher<T>>> for u64
where
    T: FheType + GraphCipherConstMul<Left = T, Right = u64> + From<u64>,
{
    type Output = CircuitNode<Cipher<T>>;

    fn mul(self, rhs: CircuitNode<Cipher<T>>) -> Self::Output {
        T::graph_cipher_const_mul(rhs, self)
    }
}

// literal * cipher
impl<T> Mul<CircuitNode<Cipher<T>>> for i64
where
    T: FheType + GraphCipherConstMul<Left = T, Right = i64> + From<i64>,
{
    type Output = CircuitNode<Cipher<T>>;

    fn mul(self, rhs: CircuitNode<Cipher<T>>) -> Self::Output {
        T::graph_cipher_const_mul(rhs, self)
    }
}

// literal * cipher
impl<T> Mul<CircuitNode<Cipher<T>>> for f64
where
    T: FheType + GraphCipherConstMul<Left = T, Right = f64> + From<f64>,
{
    type Output = CircuitNode<Cipher<T>>;

    fn mul(self, rhs: CircuitNode<Cipher<T>>) -> Self::Output {
        T::graph_cipher_const_mul(rhs, self)
    }
}

impl<T> Div for CircuitNode<Cipher<T>>
where
    T: FheType + GraphCipherDiv<Left = T, Right = T>,
{
    type Output = Self;

    fn div(self, rhs: Self) -> Self::Output {
        T::graph_cipher_div(self, rhs)
    }
}

impl<T, U> Div<U> for CircuitNode<Cipher<T>>
where
    U: FheLiteral,
    T: FheType + GraphCipherConstDiv<Left = T, Right = U>,
{
    type Output = Self;

    fn div(self, rhs: U) -> Self::Output {
        T::graph_cipher_const_div(self, rhs)
    }
}
