use petgraph::stable_graph::NodeIndex;

use std::{
    marker::PhantomData,
    ops::{Add, Div, Mul, Neg, Rem, Sub},
};

use crate::{
    types::zkp::{AddVar, DivVar, IntoProgramNode, MulVar, NegVar, RemVar, SubVar, ZkpType},
    zkp::{with_zkp_ctx, ZkpContextOps},
    INDEX_ARENA,
};

use super::{ConstrainCmpVarVar, ConstrainEqVarVar};

#[derive(Clone, Copy)]
/**
 * An implementation detail of the ZKP compiler. Each expression in a ZKP
 * program is expressed in terms of `ProgramNode`, which proxy and compose
 * the parse graph for a ZKP program.
 *
 * They proxy operations (+, -, /, etc) to their underlying type T to
 * manipulate the program graph as appropriate.
 *
 * # Remarks
 * For internal use only.
 */
pub struct ProgramNode<T>
where
    T: ZkpType,
{
    /**
     * The indices in the graph that compose the type backing this
     * `ProgramNode`.
     */
    pub ids: &'static [NodeIndex],
    _phantom: PhantomData<T>,
}

impl<T> ProgramNode<T>
where
    T: ZkpType,
{
    /**
     * Create a new Program node from the given indicies in the
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
     * Creates a public program input of type T.
     */
    pub fn public_input() -> Self {
        let mut ids = Vec::with_capacity(T::NUM_NATIVE_FIELD_ELEMENTS);

        for _ in 0..T::NUM_NATIVE_FIELD_ELEMENTS {
            ids.push(with_zkp_ctx(|ctx| ctx.add_public_input()));
        }

        Self::new(&ids)
    }

    /**
     * Creates a private program input of type T.
     */
    pub fn private_input() -> Self {
        let mut ids = Vec::with_capacity(T::NUM_NATIVE_FIELD_ELEMENTS);

        for _ in 0..T::NUM_NATIVE_FIELD_ELEMENTS {
            ids.push(with_zkp_ctx(|ctx| ctx.add_private_input()));
        }

        Self::new(&ids)
    }

    /**
     * Creates a constant program input of type T.
     */
    pub fn constant_input() -> Self {
        let mut ids = Vec::with_capacity(T::NUM_NATIVE_FIELD_ELEMENTS);

        for _ in 0..T::NUM_NATIVE_FIELD_ELEMENTS {
            ids.push(with_zkp_ctx(|ctx| ctx.add_constant_input()));
        }

        Self::new(&ids)
    }
}

impl<T> Add<ProgramNode<T>> for ProgramNode<T>
where
    T: AddVar + ZkpType,
{
    type Output = Self;

    fn add(self, rhs: Self) -> Self::Output {
        <T as AddVar>::add(self, rhs)
    }
}

impl<T> Mul<ProgramNode<T>> for ProgramNode<T>
where
    T: MulVar + ZkpType,
{
    type Output = Self;

    fn mul(self, rhs: Self) -> Self::Output {
        <T as MulVar>::mul(self, rhs)
    }
}

impl<T> Div<ProgramNode<T>> for ProgramNode<T>
where
    T: DivVar + ZkpType,
{
    type Output = Self;

    fn div(self, rhs: Self) -> Self::Output {
        <T as DivVar>::div(self, rhs)
    }
}

impl<T> Rem<ProgramNode<T>> for ProgramNode<T>
where
    T: RemVar + ZkpType,
{
    type Output = Self;

    fn rem(self, rhs: Self) -> Self::Output {
        <T as RemVar>::rem(self, rhs)
    }
}

impl<T> Sub<ProgramNode<T>> for ProgramNode<T>
where
    T: SubVar + ZkpType,
{
    type Output = Self;

    fn sub(self, rhs: Self) -> Self::Output {
        <T as SubVar>::sub(self, rhs)
    }
}

impl<T> Neg for ProgramNode<T>
where
    T: NegVar + ZkpType,
{
    type Output = Self;

    fn neg(self) -> Self::Output {
        <T as NegVar>::neg(self)
    }
}

impl<T> IntoProgramNode for ProgramNode<T>
where
    T: ZkpType,
{
    type Output = T;

    fn into_program_node(self) -> ProgramNode<Self::Output> {
        self
    }
}

/**
 * Constrain this value to a value on the RHS.
 */
pub trait ConstrainEq<Rhs> {
    /**
     * The return value will be `ProgramNode<Self::Output>`
     */
    type Output: ZkpType;

    /**
     * Constrains this value to equal the right hand side.
     */
    fn constrain_eq(self, rhs: Rhs) -> ProgramNode<Self::Output>;
}

impl<T, U, V> ConstrainEq<T> for U
where
    T: ZkpType + Sized + IntoProgramNode<Output = V>,
    U: IntoProgramNode<Output = V> + Sized,
    V: ZkpType + Sized + ConstrainEqVarVar,
{
    type Output = V;

    /**
     * Constrains this native field to equal the right hand side
     */
    fn constrain_eq(self, rhs: T) -> ProgramNode<Self::Output> {
        V::constrain_eq(self.into_program_node(), rhs.into_program_node())
    }
}

/**
 * Comparison constraints (e.g. lt, le, gt, ge).
 */
pub trait ConstrainCmp<Rhs> {
    /**
     * Constrain that this value is less than or equal than the RHS.
     *
     * # Remarks
     * The number of bits is the maximum number of bits required to
     * represent `rhs - lhs` as an unsigned integer. This allows you
     * to dramatically reduce the number of constrains to perform a
     * comparison.
     *
     * The maximum value for bits is f - 1 where f is the size of
     * the backend field.
     */
    fn constrain_le_bounded(self, rhs: Rhs, bits: usize);

        /**
     * Constrain that this value is less than or equal than the RHS.
     *
     * # Remarks
     * The number of bits is the maximum number of bits required to
     * represent `rhs - lhs` as an unsigned integer. This allows you
     * to dramatically reduce the number of constrains to perform a
     * comparison.
     *
     * The maximum value for bits is f - 1 where f is the size of
     * the backend field.
     */
    fn constrain_lt_bounded(self, rhs: Rhs, bits: usize);

        /**
     * Constrain that this value is less than or equal than the RHS.
     *
     * # Remarks
     * The number of bits is the maximum number of bits required to
     * represent `rhs - lhs` as an unsigned integer. This allows you
     * to dramatically reduce the number of constrains to perform a
     * comparison.
     *
     * The maximum value for bits is f - 1 where f is the size of
     * the backend field.
     */
    fn constrain_ge_bounded(self, rhs: Rhs, bits: usize);

        /**
     * Constrain that this value is less than or equal than the RHS.
     *
     * # Remarks
     * The number of bits is the maximum number of bits required to
     * represent `rhs - lhs` as an unsigned integer. This allows you
     * to dramatically reduce the number of constrains to perform a
     * comparison.
     *
     * The maximum value for bits is f - 1 where f is the size of
     * the backend field.
     */
    fn constrain_gt_bounded(self, rhs: Rhs, bits: usize);
}

impl<T, U, V> ConstrainCmp<T> for U
where
    T: Sized + IntoProgramNode<Output = V>,
    U: IntoProgramNode<Output = V> + Sized,
    V: ZkpType + Sized + ConstrainCmpVarVar,
{
    fn constrain_le_bounded(self, rhs: T, bits: usize) {
        V::constrain_le_bounded(self.into_program_node(), rhs.into_program_node(), bits);
    }

    fn constrain_lt_bounded(self, rhs: T, bits: usize) {
        V::constrain_lt_bounded(self.into_program_node(), rhs.into_program_node(), bits);
    }

    fn constrain_ge_bounded(self, rhs: T, bits: usize) {
        V::constrain_ge_bounded(self.into_program_node(), rhs.into_program_node(), bits);
    }

    fn constrain_gt_bounded(self, rhs: T, bits: usize) {
        V::constrain_gt_bounded(self.into_program_node(), rhs.into_program_node(), bits);
    }
}
