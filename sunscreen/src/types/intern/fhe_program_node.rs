use crate::{
    fhe::with_fhe_ctx,
    types::{
        intern::FheLiteral, ops::*, Cipher, FheType, LaneCount, NumCiphertexts, SwapRows, Type,
        TypeName,
    },
    INDEX_ARENA,
};
use paste::paste;
use petgraph::stable_graph::NodeIndex;
use sunscreen_runtime::TypeNameInstance;

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
 * These types must be constructed while [`CURRENT_FHE_CTX`][crate::fhe::CURRENT_FHE_CTX] refers to a valid
 * [`FheContext`](crate::fhe::FheContext). Furthermore, no [`FheProgramNode`] should outlive the said context.
 * Violating any of these conditions may result in memory corruption or
 * use-after-free.
 */
pub struct FheProgramNode<T: NumCiphertexts, S = ()> {
    /// The ids on this node. The 'static lifetime on this slice is a lie. The sunscreen
    /// compiler must ensure that no FheProgramNode exists after FHE program construction.
    pub ids: &'static [NodeIndex],

    /// Typically unused, but can be added to store value-level information on the graph nodes.
    stage: S,

    /// Marks the type of the value that this graph node corresponds to.
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
        Self::new_with_stage(ids, ())
    }
}

impl<T: NumCiphertexts, S> FheProgramNode<T, S> {
    fn new_with_stage(ids: &[NodeIndex], stage: S) -> Self {
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
                stage,
                _phantom: std::marker::PhantomData,
            }
        })
    }

    /**
     * Returns the plain modulus parameter for the given BFV scheme
     */
    pub fn get_plain_modulus() -> u64 {
        with_fhe_ctx(|ctx| ctx.data.plain_modulus)
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

// TODO can these literal impls be combined into `L: FheLiteral` ?

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

impl<T> NumCiphertexts for FheProgramNode<T>
where
    T: NumCiphertexts,
{
    const NUM_CIPHERTEXTS: usize = T::NUM_CIPHERTEXTS;
}

impl<T> TypeName for FheProgramNode<T>
where
    T: TypeName + NumCiphertexts,
{
    fn type_name() -> Type {
        T::type_name()
    }
}

/// This type comes in handy when constructing values that start off as literals but turn into
/// ciphertexts; e.g. `let sum = 0; sum = sum + cipher`.
///
/// # Warning
/// It is illegal to output an `FheProgramNode<Indeterminate, S>` with `S == Stage::Literal`.
pub enum Stage {
    /// Initial stage of indeterminate type: literal/plaintext
    Literal,
    /// Ciphertext stage: occurs after any operations with ciphertext
    Cipher,
}

/// Used in tandem with `Stage`. Ultimately, the purpose is to allow a single type to span
/// plaintexts and ciphertexts. The only requirement is that, upon output, the type must resolve to
/// a ciphertext.
pub struct Indeterminate<L: FheLiteral, T: FheType> {
    _lit: std::marker::PhantomData<L>,
    _type: std::marker::PhantomData<T>,
}

impl<L, T> TypeNameInstance for Indeterminate<L, T>
where
    L: FheLiteral,
    T: FheType + TypeName,
{
    fn type_name_instance(&self) -> Type {
        T::type_name()
    }
}

impl<L, T> NumCiphertexts for Indeterminate<L, T>
where
    L: FheLiteral,
    T: FheType + NumCiphertexts,
{
    const NUM_CIPHERTEXTS: usize = T::NUM_CIPHERTEXTS;
}

// TODO turn this into `fhe_var!` macro
/// Create a new fhe program variable from any supported literal type.
pub fn fhe_var<L, T>(lit: L) -> FheProgramNode<Indeterminate<L, T>, Stage>
where
    L: FheLiteral,
    T: FheType + GraphCipherInsert<Lit = L, Val = T>,
{
    let node = T::graph_cipher_insert(lit);
    coerce(node, Stage::Literal)
}

// TODO make this automatic somehow?
/// Output your fhe program variable as a ciphertext. This will fail (at fhe program compile time)
/// if the variable is still a literal. You can also use `.into()` to accomplish the same thing.
pub fn fhe_out<L, T>(var: FheProgramNode<Indeterminate<L, T>, Stage>) -> FheProgramNode<Cipher<T>>
where
    L: FheLiteral,
    T: FheType,
{
    match var.stage {
        Stage::Literal => panic!("User created FHE variables must undergo arithmetic operations with ciphertexts before they are returned as output."),
        Stage::Cipher => {
            FheProgramNode {
                ids: var.ids,
                stage: (),
                _phantom: std::marker::PhantomData,
            }
        }
    }
}

impl<L, T> From<FheProgramNode<Indeterminate<L, T>, Stage>> for FheProgramNode<Cipher<T>>
where
    L: FheLiteral,
    T: FheType,
{
    fn from(value: FheProgramNode<Indeterminate<L, T>, Stage>) -> Self {
        fhe_out(value)
    }
}

/// WARNING: This is an unsafe function. It allows casting graph nodes arbitrarily. Use with
/// caution.
fn coerce<B: NumCiphertexts, T, A: NumCiphertexts, S>(
    a: FheProgramNode<A, S>,
    t: T,
) -> FheProgramNode<B, T> {
    FheProgramNode {
        ids: a.ids,
        stage: t,
        _phantom: std::marker::PhantomData,
    }
}

macro_rules! impl_indeterminate_arithmetic_op {
    ($($op:ident),+) => {
        $(
            paste! {
                // literal|cipher <> cipher outputs literal|[cipher]
                impl<L, T> $op<FheProgramNode<Cipher<T>>> for FheProgramNode<Indeterminate<L, T>, Stage>
                where
                    T: FheType + [<GraphCipherPlain $op>]<Left = T, Right = T> + [<GraphCipher $op>]<Left = T, Right = T>,
                    L: FheLiteral,
                {
                    type Output = Self;

                    fn [<$op:lower>](self, rhs: FheProgramNode<Cipher<T>>) -> Self::Output {
                        let node = match self.stage {
                            Stage::Literal => {
                                let lit_node = coerce(self, ());
                                // N.B. we've already added this literal as a plaintext node
                                T::[<graph_cipher_plain_ $op:lower>](rhs, lit_node)
                            }
                            Stage::Cipher => {
                                let cipher_node = coerce(self, ());
                                T::[<graph_cipher_ $op:lower>](rhs, cipher_node)
                            }
                        };
                        // No matter what `self.stage` currently is, it is being operated on with a
                        // ciphertext, so its next stage is cipher.
                        coerce(node, Stage::Cipher)
                    }
                }

                // cipher <> literal|cipher outputs literal|[cipher]
                impl<L, T> $op<FheProgramNode<Indeterminate<L, T>, Stage>> for FheProgramNode<Cipher<T>>
                where
                    T: FheType + [<GraphCipherPlain $op>]<Left = T, Right = T> + [<GraphCipher $op>]<Left = T, Right = T>,
                    L: FheLiteral,
                {
                    // A little bit of pick your poison here. However it is more likely that the
                    // user is mutating an `fhe_var` than a normal ciphertext. Worst case, they call
                    // `.into()` on the resulting node.
                    type Output = FheProgramNode<Indeterminate<L, T>, Stage>;

                    fn [<$op:lower>](self, rhs: FheProgramNode<Indeterminate<L, T>, Stage>) -> Self::Output {
                        let node = match rhs.stage {
                            Stage::Literal => {
                                let lit_node = coerce(rhs, ());
                                // N.B. we've already added this literal as a plaintext node
                                T::[<graph_cipher_plain_ $op:lower>](self, lit_node)
                            }
                            Stage::Cipher => {
                                let cipher_node = coerce(rhs, ());
                                T::[<graph_cipher_ $op:lower>](self, cipher_node)
                            }
                        };
                        // No matter what `rhs.stage` currently is, it is being added to a ciphertext, so its next
                        // stage is cipher.
                        coerce(node, Stage::Cipher)
                    }
                }
            }
        )+
    };
}

impl_indeterminate_arithmetic_op! {Add, Sub, Mul, Div}
