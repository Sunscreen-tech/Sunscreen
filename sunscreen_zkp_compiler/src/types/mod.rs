mod bit;
mod native_field;
mod program_node;

pub use bit::*;
pub use native_field::*;
pub use program_node::*;

use std::cell::RefCell;

thread_local! {
    /**
     * An arena containing slices of indicies. An implementation detail of the
     * [`fhe_program`] macro.
     */
    pub static INDEX_ARENA: RefCell<bumpalo::Bump> = RefCell::new(bumpalo::Bump::new());
}

pub trait AddVar
where
    Self: Sized + ZkpType,
{
    fn add(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self>;
}

pub trait MulVar
where
    Self: Sized + ZkpType,
{
    fn mul(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self>;
}

pub trait DivVar
where
    Self: Sized + ZkpType,
{
    fn div(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self>;
}

pub trait RemVar
where
    Self: Sized + ZkpType,
{
    fn rem(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self>;
}

pub trait SubVar
where
    Self: Sized + ZkpType,
{
    fn sub(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self>;
}

pub trait NegVar
where
    Self: Sized + ZkpType,
{
    fn neg(lhs: ProgramNode<Self>) -> ProgramNode<Self>;
}

pub trait NumFieldElements {
    /**
     * The number of native field elements needed to represent this type.
     */
    const NUM_NATIVE_FIELD_ELEMENTS: usize;
}

pub trait ZkpType: NumFieldElements {}
