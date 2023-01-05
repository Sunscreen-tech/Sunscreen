use std::marker::PhantomData;

use sunscreen_compiler_macros::TypeName;
use sunscreen_runtime::ZkpProgramInputTrait;
use sunscreen_zkp_backend::{BackendField, BigInt};

use crate::{
    invoke_gadget,
    types::zkp::{AddVar, ProgramNode},
    zkp::{with_zkp_ctx, ZkpContextOps},
};

use crate::types::zkp::{
    gadgets::ToUInt, ConstrainEqVarVar, IntoProgramNode, MulVar, NegVar, NumFieldElements,
    ToNativeFields, ZkpType,
};

use crate as sunscreen;

// Shouldn't need Clone + Copy, but there appears to be a bug in the Rust
// compiler that prevents ProgramNode from being Copy if we don't.
// https://github.com/rust-lang/rust/issues/104264
#[derive(Debug, Clone, TypeName)]
/**
 * The native field type in the underlying backend proof system. For
 * example, in Bulletproofs, this is [`Scalar`](https://docs.rs/curve25519-dalek-ng/4.1.1/curve25519_dalek_ng/scalar/struct.Scalar.html).
 */
pub struct NativeField<F: BackendField> {
    /**
     * The native field's value.
     */
    pub val: BigInt,

    _phantom: PhantomData<F>,
}

// Can't #[derive()] due to PhantomData.
impl<F: BackendField> Copy for NativeField<F> {}

impl<F: BackendField> NativeField<F> {
    /**
     * Converts a big-endian hex string into a native field.
     */
    pub fn from_be_hex(hex_str: &str) -> Self {
        Self {
            val: BigInt::from_be_hex(hex_str),
            _phantom: PhantomData,
        }
    }
}

impl<F: BackendField> From<u8> for NativeField<F>
{
    fn from(x: u8) -> Self {
        (x as u64).into()
        
    }
}

impl<F: BackendField> From<u16> for NativeField<F>
{
    fn from(x: u16) -> Self {
        (x as u64).into()
        
    }
}

impl<F: BackendField> From<u32> for NativeField<F>
{
    fn from(x: u32) -> Self {
        (x as u64).into()
        
    }
}

impl<F: BackendField> From<u64> for NativeField<F>
{
    fn from(x: u64) -> Self {
        Self {
            val: x.into(),
            _phantom: PhantomData,
        }
    }
}

impl<F: BackendField> From<i8> for NativeField<F> {
    fn from(x: i8) -> Self {
        (x as i64).into()
    }
}

impl<F: BackendField> From<i16> for NativeField<F> {
    fn from(x: i16) -> Self {
        (x as i64).into()
    }
}

impl<F: BackendField> From<i32> for NativeField<F> {
    fn from(x: i32) -> Self {
        (x as i64).into()
    }
}

// TODO SECURITY: Make non-vartime
impl<F: BackendField> From<i64> for NativeField<F> {
    fn from(x: i64) -> Self {
        assert!(BigInt::from(i64::abs(x) as u64) < F::FIELD_MODULUS);

        let val = if x < 0 {
            // Wrapping is fine because we've already checked that
            // x < FIELD_MODULUS.
            BigInt::from(F::FIELD_MODULUS.wrapping_sub(&BigInt::from(i64::abs(x) as u64)))
        } else {
            BigInt::from(i64::abs(x) as u64)
        };

        Self {
            val,
            _phantom: PhantomData
        }
    }
}

impl<F: BackendField> NumFieldElements for NativeField<F> {
    const NUM_NATIVE_FIELD_ELEMENTS: usize = 1;
}

impl<F: BackendField> ToNativeFields for NativeField<F> {
    fn to_native_fields(&self) -> Vec<BigInt> {
        vec![self.val]
    }
}

impl<F: BackendField> ZkpType for NativeField<F> {}
impl<F: BackendField> ZkpProgramInputTrait for NativeField<F> {}

impl<F: BackendField> AddVar for NativeField<F> {
    fn add(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> {
        with_zkp_ctx(|ctx| {
            let o = ctx.add_addition(lhs.ids[0], rhs.ids[0]);

            ProgramNode::new(&[o])
        })
    }
}

impl<F: BackendField> MulVar for NativeField<F> {
    fn mul(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> {
        with_zkp_ctx(|ctx| {
            let o = ctx.add_multiplication(lhs.ids[0], rhs.ids[0]);

            ProgramNode::new(&[o])
        })
    }
}

impl<F: BackendField> NegVar for NativeField<F> {
    fn neg(lhs: ProgramNode<Self>) -> ProgramNode<Self> {
        with_zkp_ctx(|ctx| {
            let o = ctx.add_negate(lhs.ids[0]);

            ProgramNode::new(&[o])
        })
    }
}

impl<F: BackendField> ConstrainEqVarVar for NativeField<F> {
    fn constraint_eq(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> {
        with_zkp_ctx(|ctx| {
            let sub = ctx.add_subtraction(lhs.ids[0], rhs.ids[0]);

            let constraint = ctx.add_constraint(sub, &BigInt::ZERO);

            ProgramNode::new(&[constraint])
        })
    }
}

impl<F: BackendField> IntoProgramNode for NativeField<F> {
    type Output = NativeField<F>;

    fn into_program_node(self) -> ProgramNode<Self> {
        with_zkp_ctx(|ctx| ProgramNode::new(&[ctx.add_constant(&self.val)]))
    }
}

/**
 * Methods for decomposing values into binary.
 */
pub trait ToBinary<F: BackendField> {
    /**
     * Decompose this value into unsigned N-bit binary. If the value
     * is too large, the proof will fail to validate.
     */
    fn to_unsigned<const N: usize>(&self) -> [ProgramNode<NativeField<F>>; N];
}

impl<F: BackendField> ToBinary<F> for ProgramNode<NativeField<F>> {
    fn to_unsigned<const N: usize>(&self) -> [ProgramNode<NativeField<F>>; N] {
        let bits = invoke_gadget(ToUInt::<N>, self.ids);

        let mut vals = [*self; N];

        for (i, bit) in bits.iter().enumerate() {
            vals[i] = Self::new(&[*bit]);
        }

        vals
    }
}

#[cfg(test)]
mod tests {
    use curve25519_dalek::scalar::Scalar;

    use super::*;

    #[test]
    fn can_encode_negative_number() {
        let x = NativeField::<Scalar>::from(-1);

        assert_eq!(x.val, BigInt::from(Scalar::FIELD_MODULUS.wrapping_sub(&BigInt::ONE)));
    }
}

