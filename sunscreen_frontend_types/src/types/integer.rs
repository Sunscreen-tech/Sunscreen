use std::ops::{Add, Mul, Shl, Shr};

use seal::Plaintext as SealPlaintext;

use crate::{Context, CURRENT_CTX, Params, Result, types::{CircuitNode, FheType, BfvType, U64LiteralRef, TryIntoPlaintext}};
use sunscreen_runtime::{InnerPlaintext, Plaintext};

impl CircuitNode<Unsigned> {
    /**
     * Returns the plain modulus parameter for the given BFV scheme
     */
    pub fn get_plain_modulus() -> u64 {
        with_ctx(|ctx| ctx.params.plain_modulus)
    }
}

#[derive(Clone, Copy)]
/**
 * Represents a single unsigned integer encrypted as a ciphertext. Suitable for use
 * as an input or output for a Sunscreen circuit.
 */
pub struct Unsigned {
    val: u64,
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

impl TryIntoPlaintext for Unsigned {
    fn try_into_plaintext(&self, params: &Params) -> Result<Plaintext> {
        let mut seal_plaintext = SealPlaintext::new()?;
        let bits = std::mem::size_of::<u64>() * 8;
        
        seal_plaintext.resize(bits);

        for i in 0..bits {
            let bit_value = (self.val & 0x1 << i) >> i;
            seal_plaintext.set_coefficient(i, bit_value);
        }

        Ok(Plaintext::new(InnerPlaintext::Seal(seal_plaintext), params.clone()))
    }
}

impl From<u64> for Unsigned {
    fn from(val: u64) -> Self {
        Self { val }
    }
}

#[cfg(test)] 
mod tests
{
    use super::*;
    
    #[test]
    fn can_convert_u64_to_unsigned() {
        let foo: Unsigned = 64u64.into();

        assert_eq!(foo.val, 64);
    }
}