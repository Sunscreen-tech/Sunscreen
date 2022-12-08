use sunscreen_compiler_macros::TypeName;
use sunscreen_zkp_backend::BigInt;

use crate::{
    invoke_gadget,
    types::zkp::{AddVar, ProgramNode},
    zkp::{with_zkp_ctx, ZkpContextOps},
};

use super::{
    gadgets::ToUInt, ConstrainEqVarVar, IntoProgramNode, MulVar, NegVar, NumFieldElements, ZkpType,
};

// Shouldn't need Clone + Copy, but there appears to be a bug in the Rust
// compiler that prevents ProgramNode from being Copy if we don't.
// https://github.com/rust-lang/rust/issues/104264
#[derive(Clone, Copy, TypeName)]
/**
 * The native field type in the underlying backend proof system. For
 * example, in Bulletproofs, this is [`Scalar`](https://docs.rs/curve25519-dalek-ng/4.1.1/curve25519_dalek_ng/scalar/struct.Scalar.html).
 */
pub struct NativeField {
    val: BigInt,
}

impl NativeField {
    /**
     * Converts a big-endian hex string into a native field.
     */
    pub fn from_be_hex(hex_str: &str) -> Self {
        Self {
            val: BigInt::from_be_hex(hex_str),
        }
    }
}

impl<T> From<T> for NativeField
where
    T: Into<BigInt>,
{
    fn from(x: T) -> Self {
        Self { val: x.into() }
    }
}

impl NumFieldElements for NativeField {
    const NUM_NATIVE_FIELD_ELEMENTS: usize = 1;
}

impl ZkpType for NativeField {}

impl AddVar for NativeField {
    fn add(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> {
        with_zkp_ctx(|ctx| {
            let o = ctx.add_addition(lhs.ids[0], rhs.ids[0]);

            ProgramNode::new(&[o])
        })
    }
}

impl MulVar for NativeField {
    fn mul(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> {
        with_zkp_ctx(|ctx| {
            let o = ctx.add_multiplication(lhs.ids[0], rhs.ids[0]);

            ProgramNode::new(&[o])
        })
    }
}

impl NegVar for NativeField {
    fn neg(lhs: ProgramNode<Self>) -> ProgramNode<Self> {
        with_zkp_ctx(|ctx| {
            let o = ctx.add_negate(lhs.ids[0]);

            ProgramNode::new(&[o])
        })
    }
}

impl ConstrainEqVarVar for NativeField {
    fn constraint_eq(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> {
        with_zkp_ctx(|ctx| {
            let sub = ctx.add_subtraction(lhs.ids[0], rhs.ids[0]);

            let constraint = ctx.add_constraint(sub, &BigInt::ZERO);

            ProgramNode::new(&[constraint])
        })
    }
}

impl IntoProgramNode for NativeField {
    type Output = NativeField;

    fn into_program_node(self) -> ProgramNode<Self> {
        with_zkp_ctx(|ctx| ProgramNode::new(&[ctx.add_constant(&self.val)]))
    }
}

/**
 * Methods for decomposing values into binary.
 */
pub trait ToBinary {
    /**
     * Decompose this value into unsigned N-bit binary. If the value
     * is too large, the proof will fail to validate.
     */
    fn to_unsigned<const N: usize>(&self) -> [ProgramNode<NativeField>; N];
}

impl ToBinary for ProgramNode<NativeField> {
    fn to_unsigned<const N: usize>(&self) -> [ProgramNode<NativeField>; N] {
        let bits = invoke_gadget(ToUInt::<5>, self.ids);

        let mut vals = [*self; N];

        for (i, bit) in bits.iter().enumerate() {
            vals[i] = Self::new(&[*bit]);
        }

        vals
    }
}
