use petgraph::stable_graph::NodeIndex;

use std::{
    marker::PhantomData,
    ops::{Add, Div, Mul, Neg, Rem, Sub},
};

use crate::{
    fe_compiler::ZkpContextOps,
    types::{NumFieldElements, INDEX_ARENA},
    with_zkp_ctx,
};

use super::{AddVar, DivVar, MulVar, NativeField, NegVar, RemVar, SubVar, ZkpType};

#[derive(Clone, Copy)]
pub struct ProgramNode<T>
where
    T: ZkpType,
{
    pub ids: &'static [NodeIndex],
    _phantom: PhantomData<T>,
}

impl<T> ProgramNode<T>
where
    T: ZkpType,
{
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
    pub fn input() -> Self {
        let mut ids = Vec::with_capacity(T::NUM_NATIVE_FIELD_ELEMENTS);

        for _ in 0..T::NUM_NATIVE_FIELD_ELEMENTS {
            ids.push(with_zkp_ctx(|ctx| ctx.add_public_input()));
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
