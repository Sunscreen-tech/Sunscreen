use crate::{
    types::{intern::FheLiteral, ops::*, Cipher, FheType, LaneCount, NumCiphertexts, SwapRows},
    with_ctx, INDEX_ARENA,
};
use petgraph::stable_graph::NodeIndex;

use std::ops::{Add, Div, Mul, Neg, Shl, Shr, Sub};

#[derive(Debug, Copy, Clone, PartialEq, Eq)]
/**
 * A type that wraps an FheType during graph construction. It is an implementation
 * detail and you should not construct these directly.
 * Outside of very specific semantics, use-after-free and other undefined behaviors may occur.
 *
 * # Remarks
 * This type serves as an anchor so users can apply +, *, -, /, <<, and >> operators
 * on types inside an FHE program function. If the underlying type `T` implements the
 * `GraphCipherAdd`, `GraphCipherMul`, etc trait, then `FheProgramNode<T>` implements
 * [`std::ops::Add`], [`std::ops::Mul`], etc and proxies to T's underlying
 * implementation.
 *
 * This type impls the Copy trait so users don't have to call .clone() all the time.
 * Unfortunately, this rules out the clean implementation of using a `Vec<NodeIndex>`
 * to store the graph nodes T represents; [`Vec`] does not impl [`Copy`], and thus it
 * cannot exist in this type. To circumvent this limitation, we use a threadlocal
 * arena of [`NodeIndex`](petgraph::stable_graph::NodeIndex) to allocate and copy
 * slices. This requires we lie about the lifetime of ids, which isn't actually 'static,
 * but rather until we clear the arena. We clean the arena in the FHE program macro after
 * FHE program construction and thus after all FheProgramNodes have gone out of scope.
 *
 * You should never explicitly construct these outside of e.g.
 * FHE type GraphCipherPlainAdd traits, which run during graph
 * construction.
 *
 * # Undefined behavior
 * These types must be constructed while a [`crate::CURRENT_CTX`] refers to a valid
 * [`crate::Context`]. Furthermore, no [`FheProgramNode`] should outlive the said context.
 * Violating any of these conditions may result in memory corruption or
 * use-after-free.
 */
pub struct FheProgramNode<T: NumCiphertexts> {
    /**
     * The ids on this node. The 'static lifetime on this slice is a lie. The sunscreen
     * compiler must ensure that no FheProgramNode exists after FHE program construction.
     */
    pub ids: &'static [NodeIndex],

    _phantom: std::marker::PhantomData<T>,
}

impl<T: NumCiphertexts> FheProgramNode<T> {
    /**
     * Creates a new FHE program node with the given node index.
     *
     * These are an implementation detail needed while constructing the
     * FHE program graph
     * and should not be constructed at any other time. You should never
     * need to directly create a [`FheProgramNode`].
     *
     * # Remarks
     * This type internally captures a slice rather than directly
     * storing its own Vec. We do this so the type can impl Copy and
     * composing FHE programs is natural without the user needing to
     * call clone() all the time.
     *
     * # Undefined behavior
     * This type references memory in a bump allocator. Failing to
     * ensure FheProgramNodes never outlive the backing context, will
     * result in use-after-free.
     */
    pub fn new(ids: &[NodeIndex]) -> Self {
        INDEX_ARENA.with(|allocator| {
            let allocator = allocator.borrow();
            let ids_dest = allocator.alloc_slice_copy(ids);

            ids_dest.copy_from_slice(ids);

            // The memory in the bump allocator is valid until we call reset, which
            // we do after creating the FHE program. At this time, no FheProgramNodes should
            // remain.
            // We invoke the dark transmutation ritual to turn a finite lifetime into a 'static.
            Self {
                ids: unsafe { std::mem::transmute(ids_dest) },
                _phantom: std::marker::PhantomData,
            }
        })
    }

    /**
     * Denote this node as an output by appending an output FHE program node.
     *
     * You should not call this, but rather allow the [`fhe_program`](crate::fhe_program) macro to do this on your behalf.
     *
     * # Undefined behavior
     * This type references memory in a backing [`crate::Context`] and without carefully ensuring FheProgramNodes
     * never outlive the backing context, use-after-free can occur.
     *
     */
    pub fn output(&self) -> Self {
        let mut ids = Vec::with_capacity(self.ids.len());

        for i in 0..self.ids.len() {
            ids.push(with_ctx(|ctx| ctx.add_output(self.ids[i])));
        }

        FheProgramNode::new(&ids)
    }

    /**
     * Returns the plain modulus parameter for the given BFV scheme
     */
    pub fn get_plain_modulus() -> u64 {
        with_ctx(|ctx| ctx.params.plain_modulus)
    }
}

// cipher + cipher
impl<T> Add for FheProgramNode<Cipher<T>>
where
    T: FheType + GraphCipherAdd<Left = T, Right = T>,
{
    type Output = Self;

    fn add(self, rhs: Self) -> Self::Output {
        T::graph_cipher_add(self, rhs)
    }
}

// cipher + plain
impl<T> Add<FheProgramNode<T>> for FheProgramNode<Cipher<T>>
where
    T: FheType + GraphCipherPlainAdd<Left = T, Right = T>,
{
    type Output = Self;

    fn add(self, rhs: FheProgramNode<T>) -> Self::Output {
        T::graph_cipher_plain_add(self, rhs)
    }
}

// plain + cipher
impl<T> Add<FheProgramNode<Cipher<T>>> for FheProgramNode<T>
where
    T: FheType + GraphCipherPlainAdd<Left = T, Right = T>,
{
    type Output = FheProgramNode<Cipher<T>>;

    fn add(self, rhs: FheProgramNode<Cipher<T>>) -> Self::Output {
        T::graph_cipher_plain_add(rhs, self)
    }
}

// cipher + literal
impl<T, U> Add<T> for FheProgramNode<Cipher<U>>
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
impl<T> Add<FheProgramNode<Cipher<T>>> for u64
where
    T: FheType + GraphCipherConstAdd<Left = T, Right = u64> + TryFrom<u64>,
{
    type Output = FheProgramNode<Cipher<T>>;

    fn add(self, rhs: FheProgramNode<Cipher<T>>) -> Self::Output {
        T::graph_cipher_const_add(rhs, self)
    }
}

// literal + cipher
impl<T> Add<FheProgramNode<Cipher<T>>> for i64
where
    T: FheType + GraphCipherConstAdd<Left = T, Right = i64> + TryFrom<i64>,
{
    type Output = FheProgramNode<Cipher<T>>;

    fn add(self, rhs: FheProgramNode<Cipher<T>>) -> Self::Output {
        T::graph_cipher_const_add(rhs, self)
    }
}

// literal + cipher
impl<T> Add<FheProgramNode<Cipher<T>>> for f64
where
    T: FheType + GraphCipherConstAdd<Left = T, Right = f64> + TryFrom<f64>,
{
    type Output = FheProgramNode<Cipher<T>>;

    fn add(self, rhs: FheProgramNode<Cipher<T>>) -> Self::Output {
        T::graph_cipher_const_add(rhs, self)
    }
}

// cipher - cipher
impl<T> Sub for FheProgramNode<Cipher<T>>
where
    T: FheType + GraphCipherSub<Left = T, Right = T>,
{
    type Output = Self;

    fn sub(self, rhs: Self) -> Self::Output {
        T::graph_cipher_sub(self, rhs)
    }
}

// cipher - plaintext
impl<T> Sub<FheProgramNode<T>> for FheProgramNode<Cipher<T>>
where
    T: FheType + GraphCipherPlainSub<Left = T, Right = T>,
{
    type Output = Self;

    fn sub(self, rhs: FheProgramNode<T>) -> Self::Output {
        T::graph_cipher_plain_sub(self, rhs)
    }
}

// plaintext - cipher
impl<T> Sub<FheProgramNode<Cipher<T>>> for FheProgramNode<T>
where
    T: FheType + GraphPlainCipherSub<Left = T, Right = T>,
{
    type Output = FheProgramNode<Cipher<T>>;

    fn sub(self, rhs: FheProgramNode<Cipher<T>>) -> Self::Output {
        T::graph_plain_cipher_sub(self, rhs)
    }
}

// cipher - literal
impl<T, U> Sub<T> for FheProgramNode<Cipher<U>>
where
    U: FheType + GraphCipherConstSub<Left = U, Right = T>,
    T: FheLiteral,
{
    type Output = Self;

    fn sub(self, rhs: T) -> Self::Output {
        U::graph_cipher_const_sub(self, rhs)
    }
}

// literal - ciphertext
impl<T> Sub<FheProgramNode<Cipher<T>>> for u64
where
    T: FheType + GraphConstCipherSub<Left = u64, Right = T>,
{
    type Output = FheProgramNode<Cipher<T>>;

    fn sub(self, rhs: FheProgramNode<Cipher<T>>) -> Self::Output {
        T::graph_const_cipher_sub(self, rhs)
    }
}

// literal - ciphertext
impl<T> Sub<FheProgramNode<Cipher<T>>> for f64
where
    T: FheType + GraphConstCipherSub<Left = f64, Right = T>,
{
    type Output = FheProgramNode<Cipher<T>>;

    fn sub(self, rhs: FheProgramNode<Cipher<T>>) -> Self::Output {
        T::graph_const_cipher_sub(self, rhs)
    }
}

// literal - ciphertext
impl<T> Sub<FheProgramNode<Cipher<T>>> for i64
where
    T: FheType + GraphConstCipherSub<Left = i64, Right = T>,
{
    type Output = FheProgramNode<Cipher<T>>;

    fn sub(self, rhs: FheProgramNode<Cipher<T>>) -> Self::Output {
        T::graph_const_cipher_sub(self, rhs)
    }
}

// cipher * cipher
impl<T> Mul for FheProgramNode<Cipher<T>>
where
    T: FheType + GraphCipherMul<Left = T, Right = T>,
{
    type Output = Self;

    fn mul(self, rhs: Self) -> Self::Output {
        T::graph_cipher_mul(self, rhs)
    }
}

// cipher * plain
impl<T> Mul<FheProgramNode<T>> for FheProgramNode<Cipher<T>>
where
    T: FheType + GraphCipherPlainMul<Left = T, Right = T>,
{
    type Output = Self;

    fn mul(self, rhs: FheProgramNode<T>) -> Self::Output {
        T::graph_cipher_plain_mul(self, rhs)
    }
}

// plain * cipher
impl<T> Mul<FheProgramNode<Cipher<T>>> for FheProgramNode<T>
where
    T: FheType + GraphCipherPlainMul<Left = T, Right = T>,
{
    type Output = FheProgramNode<Cipher<T>>;

    fn mul(self, rhs: FheProgramNode<Cipher<T>>) -> Self::Output {
        T::graph_cipher_plain_mul(rhs, self)
    }
}

// cipher * literal
impl<T, U> Mul<T> for FheProgramNode<Cipher<U>>
where
    U: FheType + GraphCipherConstMul<Left = U, Right = T> + TryFrom<T>,
    T: FheLiteral,
{
    type Output = Self;

    fn mul(self, rhs: T) -> Self::Output {
        U::graph_cipher_const_mul(self, rhs)
    }
}

// literal * cipher
impl<T> Mul<FheProgramNode<Cipher<T>>> for u64
where
    T: FheType + GraphCipherConstMul<Left = T, Right = u64> + TryFrom<u64>,
{
    type Output = FheProgramNode<Cipher<T>>;

    fn mul(self, rhs: FheProgramNode<Cipher<T>>) -> Self::Output {
        T::graph_cipher_const_mul(rhs, self)
    }
}

// literal * cipher
impl<T> Mul<FheProgramNode<Cipher<T>>> for i64
where
    T: FheType + GraphCipherConstMul<Left = T, Right = i64> + TryFrom<i64>,
{
    type Output = FheProgramNode<Cipher<T>>;

    fn mul(self, rhs: FheProgramNode<Cipher<T>>) -> Self::Output {
        T::graph_cipher_const_mul(rhs, self)
    }
}

// literal * cipher
impl<T> Mul<FheProgramNode<Cipher<T>>> for f64
where
    T: FheType + GraphCipherConstMul<Left = T, Right = f64> + TryFrom<f64>,
{
    type Output = FheProgramNode<Cipher<T>>;

    fn mul(self, rhs: FheProgramNode<Cipher<T>>) -> Self::Output {
        T::graph_cipher_const_mul(rhs, self)
    }
}

// ciphertext / ciphertext
impl<T> Div for FheProgramNode<Cipher<T>>
where
    T: FheType + GraphCipherDiv<Left = T, Right = T>,
{
    type Output = Self;

    fn div(self, rhs: Self) -> Self::Output {
        T::graph_cipher_div(self, rhs)
    }
}

// ciphertext / plaintext
impl<T> Div<FheProgramNode<T>> for FheProgramNode<Cipher<T>>
where
    T: FheType + GraphCipherPlainDiv<Left = T, Right = T>,
{
    type Output = Self;

    fn div(self, rhs: FheProgramNode<T>) -> Self::Output {
        T::graph_cipher_plain_div(self, rhs)
    }
}

// plaintext / ciphertext
impl<T> Div<FheProgramNode<Cipher<T>>> for FheProgramNode<T>
where
    T: FheType + GraphPlainCipherDiv<Left = T, Right = T>,
{
    type Output = FheProgramNode<Cipher<T>>;

    fn div(self, rhs: FheProgramNode<Cipher<T>>) -> Self::Output {
        T::graph_plain_cipher_div(self, rhs)
    }
}

// ciphertext / literal
impl<T, U> Div<U> for FheProgramNode<Cipher<T>>
where
    U: FheLiteral,
    T: FheType + GraphCipherConstDiv<Left = T, Right = U>,
{
    type Output = Self;

    fn div(self, rhs: U) -> Self::Output {
        T::graph_cipher_const_div(self, rhs)
    }
}

// literal / cipher
impl<T> Div<FheProgramNode<Cipher<T>>> for f64
where
    T: FheType + GraphConstCipherDiv<Left = f64, Right = T> + TryFrom<f64>,
{
    type Output = FheProgramNode<Cipher<T>>;

    fn div(self, rhs: FheProgramNode<Cipher<T>>) -> Self::Output {
        T::graph_const_cipher_div(self, rhs)
    }
}

// literal / cipher
impl<T> Div<FheProgramNode<Cipher<T>>> for i64
where
    T: FheType + GraphConstCipherDiv<Left = i64, Right = T> + TryFrom<f64>,
{
    type Output = FheProgramNode<Cipher<T>>;

    fn div(self, rhs: FheProgramNode<Cipher<T>>) -> Self::Output {
        T::graph_const_cipher_div(self, rhs)
    }
}

// literal / cipher
impl<T> Div<FheProgramNode<Cipher<T>>> for u64
where
    T: FheType + GraphConstCipherDiv<Left = u64, Right = T> + TryFrom<f64>,
{
    type Output = FheProgramNode<Cipher<T>>;

    fn div(self, rhs: FheProgramNode<Cipher<T>>) -> Self::Output {
        T::graph_const_cipher_div(self, rhs)
    }
}

// -ciphertext
impl<T> Neg for FheProgramNode<Cipher<T>>
where
    T: FheType + GraphCipherNeg<Val = T>,
{
    type Output = Self;

    fn neg(self) -> Self::Output {
        T::graph_cipher_neg(self)
    }
}

// ciphertext
impl<T> SwapRows for FheProgramNode<Cipher<T>>
where
    T: FheType + GraphCipherSwapRows,
{
    type Output = Self;

    fn swap_rows(self) -> Self::Output {
        T::graph_cipher_swap_rows(self)
    }
}

impl<T> LaneCount for FheProgramNode<Cipher<T>>
where
    T: FheType + LaneCount,
{
    fn lane_count() -> usize {
        T::lane_count()
    }
}

impl<T> Shl<u64> for FheProgramNode<Cipher<T>>
where
    T: FheType + GraphCipherRotateLeft,
{
    type Output = Self;

    fn shl(self, x: u64) -> Self {
        T::graph_cipher_rotate_left(self, x)
    }
}

impl<T> Shr<u64> for FheProgramNode<Cipher<T>>
where
    T: FheType + GraphCipherRotateRight,
{
    type Output = Self;

    fn shr(self, x: u64) -> Self {
        T::graph_cipher_rotate_right(self, x)
    }
}
