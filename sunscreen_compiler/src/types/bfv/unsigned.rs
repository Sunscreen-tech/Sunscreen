use seal::Plaintext as SealPlaintext;

use crate::types::{Cipher, GraphCipherMul, ops::{GraphCipherAdd, GraphCipherPlainAdd}};
use crate::{
    types::{BfvType, FheType, intern::CircuitNode, TypeNameInstance},
    with_ctx, CircuitInputTrait, Params, TypeName as DeriveTypeName, WithContext,
};

use sunscreen_runtime::{
    InnerPlaintext, NumCiphertexts, Plaintext, TryFromPlaintext, TryIntoPlaintext,
};

#[derive(Debug, Clone, Copy, DeriveTypeName, PartialEq, Eq)]
/**
 * A single unsigned integer.
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

impl CircuitInputTrait for Unsigned {}
impl FheType for Unsigned {}
impl BfvType for Unsigned {}

impl Unsigned {}

impl GraphCipherAdd for Unsigned {
    type Left = Unsigned;
    type Right = Unsigned;

    fn graph_cipher_add(
        a: CircuitNode<Cipher<Self::Left>>,
        b: CircuitNode<Cipher<Self::Right>>,
    ) -> CircuitNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let n = ctx.add_addition(a.ids[0], b.ids[0]);

            CircuitNode::new(&[n])
        })
    }
}

impl GraphCipherPlainAdd for Unsigned {
    type Left = Unsigned;
    type Right = Unsigned;

    fn graph_cipher_plain_add(
        a: CircuitNode<Cipher<Self::Left>>,
        b: CircuitNode<Self::Right>,
    ) -> CircuitNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let n = ctx.add_addition_plaintext(a.ids[0], b.ids[0]);

            CircuitNode::new(&[n])
        })
    }
}

impl GraphCipherMul for Unsigned {
    type Left = Unsigned;
    type Right = Unsigned;

    fn graph_cipher_mul(
        a: CircuitNode<Cipher<Self::Left>>,
        b: CircuitNode<Cipher<Self::Right>>,
    ) -> CircuitNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let n = ctx.add_multiplication(a.ids[0], b.ids[0]);

            CircuitNode::new(&[n])
        })
    }
}

impl TryIntoPlaintext for Unsigned {
    fn try_into_plaintext(
        &self,
        params: &Params,
    ) -> std::result::Result<Plaintext, sunscreen_runtime::Error> {
        let mut seal_plaintext = SealPlaintext::new()?;

        let bits = std::mem::size_of::<u64>() * 8;

        seal_plaintext.resize(bits);

        for i in 0..bits {
            let bit_value = (self.val & 0x1 << i) >> i;
            seal_plaintext.set_coefficient(i, bit_value);
        }

        Ok(Plaintext {
            data_type: self.type_name_instance(),
            inner: InnerPlaintext::Seal(vec![WithContext {
                params: params.clone(),
                data: seal_plaintext,
            }]),
        })
    }
}

impl TryFromPlaintext for Unsigned {
    fn try_from_plaintext(
        plaintext: &Plaintext,
        _params: &Params,
    ) -> std::result::Result<Self, sunscreen_runtime::Error> {
        let val = match &plaintext.inner {
            InnerPlaintext::Seal(p) => {
                if p.len() != 1 {
                    return Err(sunscreen_runtime::Error::IncorrectCiphertextCount);
                }

                let mut val = 0u64;
                let bits = usize::min(std::mem::size_of::<u64>() * 8, p[0].len());

                for i in 0..bits {
                    val += p[0].get_coefficient(i) * (1 << i);
                }

                Self { val }
            }
        };

        Ok(val)
    }
}

impl NumCiphertexts for Unsigned {
    const NUM_CIPHERTEXTS: usize = 1;
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
