use std::ops::{Add, Mul, Shl, Shr};

use seal::Plaintext as SealPlaintext;

use crate::{
    types::{BfvType, CircuitNode, FheType, U64LiteralRef},
    Context, Params, TypeName as DeriveTypeName, CURRENT_CTX,
};
use sunscreen_runtime::{InnerPlaintext, Plaintext, TryFromPlaintext, TryIntoPlaintext};

impl CircuitNode<Unsigned> {
    /**
     * Returns the plain modulus parameter for the given BFV scheme
     */
    pub fn get_plain_modulus() -> u64 {
        with_ctx(|ctx| ctx.params.plain_modulus)
    }
}

#[derive(Debug, Clone, Copy, DeriveTypeName, PartialEq)]
/**
 * Represents a single unsigned integer encrypted as a ciphertext. Suitable for use
 * as an input or output for a Sunscreen circuit.
 */
pub struct Unsigned {
    val: u64,
}

impl std::ops::Deref for Unsigned {
    type Target = u64;

    fn deref(&self) -> &Self::Target {
        &self.val
    }
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
    fn try_into_plaintext(
        &self,
        params: &Params,
    ) -> std::result::Result<Vec<Plaintext>, sunscreen_runtime::Error> {
        let mut seal_plaintext = SealPlaintext::new()?;
        let bits = std::mem::size_of::<u64>() * 8;

        seal_plaintext.resize(bits);

        for i in 0..bits {
            let bit_value = (self.val & 0x1 << i) >> i;
            seal_plaintext.set_coefficient(i, bit_value);
        }

        Ok(vec![Plaintext::new(
            InnerPlaintext::Seal(seal_plaintext),
            params.clone(),
        )])
    }
}

impl TryFromPlaintext for Unsigned {
    fn try_from_plaintext<I>(
        plaintexts: &mut I,
        _params: &Params,
    ) -> std::result::Result<Self, sunscreen_runtime::Error> 
    where I: Iterator<Item=sunscreen_runtime::Result<Plaintext>>
    {
        let p = plaintexts.next().ok_or(sunscreen_runtime::Error::IncorrectCiphertextCount)??;

        let val = match p.inner {
            InnerPlaintext::Seal(p) => {
                let mut val = 0u64;
                let bits = usize::min(std::mem::size_of::<u64>() * 8, p.len());

                for i in 0..bits {
                    val += p.get_coefficient(i) * (1 << i);
                }

                Self { val }
            }
            _ => {
                return Err(sunscreen_runtime::Error::ParameterMismatch);
            }
        };

        Ok(val)
    }
}

impl From<u64> for Unsigned {
    fn from(val: u64) -> Self {
        Self { val }
    }
}

impl Into<u64> for Unsigned {
    fn into(self) -> u64 {
        self.val
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_convert_u64_to_unsigned() {
        let foo: Unsigned = 64u64.into();

        assert_eq!(foo.val, 64);
    }

    #[test]
    fn can_convert_unsigned_to_u64() {
        let foo = Unsigned { val: 64 };
        let converted: u64 = foo.into();

        assert_eq!(converted, 64u64);
    }
}
