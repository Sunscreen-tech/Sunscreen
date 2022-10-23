use seal_fhe::Plaintext as SealPlaintext;

use crate::types::{
    ops::{
        GraphCipherAdd, GraphCipherConstAdd, GraphCipherConstMul, GraphCipherConstSub,
        GraphCipherMul, GraphCipherNeg, GraphCipherPlainAdd, GraphCipherPlainMul,
        GraphCipherPlainSub, GraphCipherSub, GraphConstCipherSub, GraphPlainCipherSub,
    },
    Cipher,
};
use crate::{
    types::{intern::FheProgramNode, BfvType, FheType, TypeNameInstance},
    with_ctx, FheProgramInputTrait, Params, TypeName as DeriveTypeName, WithContext,
};

use sunscreen_runtime::{
    InnerPlaintext, NumCiphertexts, Plaintext, TryFromPlaintext, TryIntoPlaintext,
};

use std::ops::*;

#[derive(Debug, Clone, Copy, DeriveTypeName, PartialEq, Eq)]
/**
 * A single signed integer.
 */
pub struct Signed {
    val: i64,
}

impl NumCiphertexts for Signed {
    const NUM_CIPHERTEXTS: usize = 1;
}

impl FheProgramInputTrait for Signed {}
impl FheType for Signed {}
impl BfvType for Signed {}

impl std::fmt::Display for Signed {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.val)
    }
}

impl Default for Signed {
    fn default() -> Self {
        Self::from(0)
    }
}

fn significant_bits(val: u64) -> usize {
    let bits = std::mem::size_of::<u64>() * 8;

    for i in 0..bits {
        if (0x1 << (bits - i - 1)) & val != 0 {
            return bits - i + 1;
        }
    }

    0
}

impl TryIntoPlaintext for Signed {
    fn try_into_plaintext(
        &self,
        params: &Params,
    ) -> std::result::Result<Plaintext, sunscreen_runtime::Error> {
        let mut seal_plaintext = SealPlaintext::new()?;

        let signed_val = if self.val < 0 { -self.val } else { self.val } as u64;

        let sig_bits = significant_bits(signed_val);
        seal_plaintext.resize(sig_bits);

        for i in 0..sig_bits {
            let bit_value = (signed_val & 0x1 << i) >> i;

            let coeff_value = if self.val < 0 {
                bit_value * (params.plain_modulus as u64 - bit_value)
            } else {
                bit_value
            };

            seal_plaintext.set_coefficient(i, coeff_value);
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

impl TryFromPlaintext for Signed {
    fn try_from_plaintext(
        plaintext: &Plaintext,
        params: &Params,
    ) -> std::result::Result<Self, sunscreen_runtime::Error> {
        let val = match &plaintext.inner {
            InnerPlaintext::Seal(p) => {
                if p.len() != 1 {
                    return Err(sunscreen_runtime::Error::IncorrectCiphertextCount);
                }

                let bits = usize::min(
                    usize::min(std::mem::size_of::<u64>() * 8, p[0].len()),
                    p[0].len(),
                );

                let negative_cutoff = (params.plain_modulus + 1) / 2;

                let mut val: i64 = 0;

                for i in 0..bits {
                    let coeff = p[0].get_coefficient(i);

                    if coeff < negative_cutoff {
                        val += ((0x1 << i) * coeff) as i64;
                    } else {
                        val -= ((0x1 << i) * (params.plain_modulus - coeff)) as i64;
                    }
                }

                Self { val }
            }
        };

        Ok(val)
    }
}

impl From<i64> for Signed {
    fn from(val: i64) -> Self {
        Self { val }
    }
}

impl From<Signed> for i64 {
    fn from(signed: Signed) -> Self {
        signed.val
    }
}

impl Add for Signed {
    type Output = Self;

    fn add(self, rhs: Self) -> Self::Output {
        Self::Output {
            val: self.val + rhs.val,
        }
    }
}

impl Add<i64> for Signed {
    type Output = Self;

    fn add(self, rhs: i64) -> Self::Output {
        Self {
            val: self.val + rhs,
        }
    }
}

impl Add<Signed> for i64 {
    type Output = Signed;

    fn add(self, rhs: Signed) -> Self::Output {
        Self::Output {
            val: self + rhs.val,
        }
    }
}

impl Mul for Signed {
    type Output = Self;

    fn mul(self, rhs: Self) -> Self::Output {
        Self::Output {
            val: self.val * rhs.val,
        }
    }
}

impl Mul<i64> for Signed {
    type Output = Self;

    fn mul(self, rhs: i64) -> Self::Output {
        Self {
            val: self.val * rhs,
        }
    }
}

impl Mul<Signed> for i64 {
    type Output = Signed;

    fn mul(self, rhs: Signed) -> Self::Output {
        Self::Output {
            val: self * rhs.val,
        }
    }
}

impl Sub for Signed {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self::Output {
        Self::Output {
            val: self.val - rhs.val,
        }
    }
}

impl Sub<i64> for Signed {
    type Output = Self;

    fn sub(self, rhs: i64) -> Self::Output {
        Self {
            val: self.val - rhs,
        }
    }
}

impl Sub<Signed> for i64 {
    type Output = Signed;

    fn sub(self, rhs: Signed) -> Self::Output {
        Self::Output {
            val: self - rhs.val,
        }
    }
}

impl Neg for Signed {
    type Output = Self;

    fn neg(self) -> Self::Output {
        Self::Output { val: -self.val }
    }
}

impl GraphCipherAdd for Signed {
    type Left = Signed;
    type Right = Signed;

    fn graph_cipher_add(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let n = ctx.add_addition(a.ids[0], b.ids[0]);

            FheProgramNode::new(&[n])
        })
    }
}

impl GraphCipherPlainAdd for Signed {
    type Left = Signed;
    type Right = Signed;

    fn graph_cipher_plain_add(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Self::Right>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let n = ctx.add_addition_plaintext(a.ids[0], b.ids[0]);

            FheProgramNode::new(&[n])
        })
    }
}

impl GraphCipherConstAdd for Signed {
    type Left = Self;
    type Right = i64;

    fn graph_cipher_const_add(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: i64,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let b = Self::from(b).try_into_plaintext(&ctx.params).unwrap();

            let lit = ctx.add_plaintext_literal(b.inner);
            let add = ctx.add_addition_plaintext(a.ids[0], lit);

            FheProgramNode::new(&[add])
        })
    }
}

impl GraphCipherSub for Signed {
    type Left = Signed;
    type Right = Signed;

    fn graph_cipher_sub(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let n = ctx.add_subtraction(a.ids[0], b.ids[0]);

            FheProgramNode::new(&[n])
        })
    }
}

impl GraphCipherPlainSub for Signed {
    type Left = Signed;
    type Right = Signed;

    fn graph_cipher_plain_sub(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Self::Right>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let n = ctx.add_subtraction_plaintext(a.ids[0], b.ids[0]);

            FheProgramNode::new(&[n])
        })
    }
}

impl GraphPlainCipherSub for Signed {
    type Left = Signed;
    type Right = Signed;

    fn graph_plain_cipher_sub(
        a: FheProgramNode<Self::Left>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let n = ctx.add_subtraction_plaintext(b.ids[0], a.ids[0]);
            let n = ctx.add_negate(n);

            FheProgramNode::new(&[n])
        })
    }
}

impl GraphCipherConstSub for Signed {
    type Left = Signed;
    type Right = i64;

    fn graph_cipher_const_sub(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: Self::Right,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let b = Self::from(b).try_into_plaintext(&ctx.params).unwrap();

            let lit = ctx.add_plaintext_literal(b.inner);
            let n = ctx.add_subtraction_plaintext(a.ids[0], lit);

            FheProgramNode::new(&[n])
        })
    }
}

impl GraphConstCipherSub for Signed {
    type Left = i64;
    type Right = Signed;

    fn graph_const_cipher_sub(
        a: i64,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Right>> {
        with_ctx(|ctx| {
            let a = Self::from(a).try_into_plaintext(&ctx.params).unwrap();

            let lit = ctx.add_plaintext_literal(a.inner);
            let n = ctx.add_subtraction_plaintext(b.ids[0], lit);
            let n = ctx.add_negate(n);

            FheProgramNode::new(&[n])
        })
    }
}

impl GraphCipherNeg for Signed {
    type Val = Signed;

    fn graph_cipher_neg(a: FheProgramNode<Cipher<Self>>) -> FheProgramNode<Cipher<Self>> {
        with_ctx(|ctx| {
            let n = ctx.add_negate(a.ids[0]);

            FheProgramNode::new(&[n])
        })
    }
}

impl GraphCipherMul for Signed {
    type Left = Signed;
    type Right = Signed;

    fn graph_cipher_mul(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let n = ctx.add_multiplication(a.ids[0], b.ids[0]);

            FheProgramNode::new(&[n])
        })
    }
}

impl GraphCipherConstMul for Signed {
    type Left = Self;
    type Right = i64;

    fn graph_cipher_const_mul(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: i64,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let b = Self::from(b).try_into_plaintext(&ctx.params).unwrap();

            let lit = ctx.add_plaintext_literal(b.inner);
            let add = ctx.add_multiplication_plaintext(a.ids[0], lit);

            FheProgramNode::new(&[add])
        })
    }
}

impl GraphCipherPlainMul for Signed {
    type Left = Signed;
    type Right = Signed;

    fn graph_cipher_plain_mul(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Self::Right>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let n = ctx.add_multiplication_plaintext(a.ids[0], b.ids[0]);

            FheProgramNode::new(&[n])
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_add_non_fhe() {
        let a = Signed::from(5);
        let b = Signed::from(10);

        assert_eq!(a + b, 15.into());
        assert_eq!(a + 10, 15.into());
        assert_eq!(10 + a, 15.into());
    }

    #[test]
    fn can_mul_non_fhe() {
        let a = Signed::from(5);
        let b = Signed::from(10);

        assert_eq!(a * b, 50.into());
        assert_eq!(a * 10, 50.into());
        assert_eq!(10 * a, 50.into());
    }

    #[test]
    fn can_sub_non_fhe() {
        let a = Signed::from(5);
        let b = Signed::from(10);

        assert_eq!(a - b, (-5).into());
        assert_eq!(a - 10, (-5).into());
        assert_eq!(10 - a, (5).into());
    }

    #[test]
    fn can_neg_non_fhe() {
        let a = Signed::from(5);

        assert_eq!(-a, (-5).into());
    }
}
