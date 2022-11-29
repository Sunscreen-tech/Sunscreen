mod native_field;
mod program_node;

pub use native_field::*;
pub use program_node::*;

/**
 * A trait for adding two ZKP values together
 */
pub trait AddVar
where
    Self: Sized + ZkpType,
{
    /**
     * Add the 2 values.
     */
    fn add(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self>;
}

/**
 * A trait for multiplying two ZKP values together
 */
pub trait MulVar
where
    Self: Sized + ZkpType,
{
    /**
     * Compute lhs * rhs.
     */
    fn mul(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self>;
}

/**
 * A trait for dividing 2 zkp values.
 */
pub trait DivVar
where
    Self: Sized + ZkpType,
{
    /**
     * Compute lhs / rhs.
     */
    fn div(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self>;
}

/**
 * A trait for computing the Remainder of 2 zkp values.
 */
pub trait RemVar
where
    Self: Sized + ZkpType,
{
    /**
     * Compute lhs % rhs;
     */
    fn rem(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self>;
}

/**
 * A trait for subtracting 2 zkp values.
 */
pub trait SubVar
where
    Self: Sized + ZkpType,
{
    /**
     * Compute lhs - rhs.
     */
    fn sub(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self>;
}

/**
 * A trait for computing the additive inverse of a zkp value.
 */
pub trait NegVar
where
    Self: Sized + ZkpType,
{
    /**
     * Compute -lhs.
     */
    fn neg(lhs: ProgramNode<Self>) -> ProgramNode<Self>;
}

/**
 * A trait for adding an equality constraint to a type.
 */
pub trait ConstrainEqVarVar
where
    Self: Sized + ZkpType,
{
    /**
     * Asserts that lhs equals rhs.
     */
    fn constraint_eq(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self>;
}

/**
 * The given FHE type can be turned into a program node. Useful for declaring
 * constants.
 */
pub trait IntoProgramNode
where
    Self: Sized,
{
    /**
     * The type of [`ProgramNode`] this becomes.
     */
    type Output: ZkpType;

    /**
     * Turns the given value into a [`ProgramNode`].
     *
     * # Panics
     * Calling this function outside of a ZKP program will panic.
     */
    fn into_program_node(self) -> ProgramNode<Self::Output>;
}

/**
 * The number of native field elements needed to represent a ZKP type.
 */
pub trait NumFieldElements {
    /**
     * The number of native field elements needed to represent this type.
     */
    const NUM_NATIVE_FIELD_ELEMENTS: usize;
}

/**
 * Encapsulates all the traits required for a type to be used in ZKP
 * programs.
 */
pub trait ZkpType: NumFieldElements {}
