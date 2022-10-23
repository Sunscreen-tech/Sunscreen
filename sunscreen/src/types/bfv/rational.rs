use crate::types::{
    bfv::Signed, intern::FheProgramNode, ops::*, BfvType, Cipher, FheType, GraphCipherAdd,
    GraphCipherDiv, GraphCipherMul, GraphCipherSub, NumCiphertexts, TryFromPlaintext,
    TryIntoPlaintext, TypeName,
};
use crate::{with_ctx, FheProgramInputTrait, InnerPlaintext, Params, Plaintext, TypeName};
use std::cmp::Eq;
use std::ops::*;
use sunscreen_runtime::Error;

use num::Rational64;

#[derive(Debug, Clone, Copy, TypeName, Eq)]
/**
 * Represents the ratio of two integers. Allows for fractional values and division.
 */
pub struct Rational {
    num: Signed,
    den: Signed,
}

impl PartialEq for Rational {
    fn eq(&self, other: &Self) -> bool {
        let num_a: i64 = self.num.into();
        let num_b: i64 = other.num.into();
        let den_a: i64 = self.den.into();
        let den_b: i64 = other.den.into();

        num_a * den_b == num_b * den_a
    }
}

impl Default for Rational {
    fn default() -> Self {
        Self::try_from(0.0).unwrap()
    }
}

impl NumCiphertexts for Rational {
    const NUM_CIPHERTEXTS: usize = Signed::NUM_CIPHERTEXTS + Signed::NUM_CIPHERTEXTS;
}

impl TryFromPlaintext for Rational {
    fn try_from_plaintext(plaintext: &Plaintext, params: &Params) -> Result<Self, Error> {
        let (num, den) = match &plaintext.inner {
            InnerPlaintext::Seal(p) => {
                let num = Plaintext {
                    data_type: Self::type_name(),
                    inner: InnerPlaintext::Seal(vec![p[0].clone()]),
                };
                let den = Plaintext {
                    data_type: Self::type_name(),
                    inner: InnerPlaintext::Seal(vec![p[1].clone()]),
                };

                (
                    Signed::try_from_plaintext(&num, params)?,
                    Signed::try_from_plaintext(&den, params)?,
                )
            }
        };

        Ok(Self { num, den })
    }
}

impl TryIntoPlaintext for Rational {
    fn try_into_plaintext(&self, params: &Params) -> Result<Plaintext, Error> {
        let num = self.num.try_into_plaintext(params)?;
        let den = self.den.try_into_plaintext(params)?;

        let (num, den) = match (num.inner, den.inner) {
            (InnerPlaintext::Seal(n), InnerPlaintext::Seal(d)) => (n[0].clone(), d[0].clone()),
        };

        Ok(Plaintext {
            data_type: Self::type_name(),
            inner: InnerPlaintext::Seal(vec![num, den]),
        })
    }
}

impl FheProgramInputTrait for Rational {}
impl FheType for Rational {}
impl BfvType for Rational {}

impl TryFrom<f64> for Rational {
    type Error = Error;

    fn try_from(val: f64) -> Result<Self, Self::Error> {
        let val = Rational64::approximate_float(val)
            .ok_or_else(|| Error::FheTypeError("Failed to parse float into rational".to_owned()))?;

        Ok(Self {
            num: Signed::from(*val.numer()),
            den: Signed::from(*val.denom()),
        })
    }
}

impl From<Rational> for f64 {
    fn from(val: Rational) -> Self {
        let num: i64 = val.num.into();
        let den: i64 = val.den.into();

        num as f64 / den as f64
    }
}

impl Add for Rational {
    type Output = Self;

    fn add(self, rhs: Self) -> Self::Output {
        Self::Output {
            num: self.num * rhs.den + rhs.num * self.den,
            den: self.den * rhs.den,
        }
    }
}

impl Add<f64> for Rational {
    type Output = Self;

    fn add(self, rhs: f64) -> Self::Output {
        let rhs = Rational::try_from(rhs).unwrap();

        Self::Output {
            num: self.num * rhs.den + rhs.num * self.den,
            den: self.den * rhs.den,
        }
    }
}

impl Add<Rational> for f64 {
    type Output = Rational;

    fn add(self, rhs: Rational) -> Self::Output {
        let lhs = Rational::try_from(self).unwrap();

        Self::Output {
            num: lhs.num * rhs.den + rhs.num * lhs.den,
            den: lhs.den * rhs.den,
        }
    }
}

impl Mul for Rational {
    type Output = Self;

    fn mul(self, rhs: Self) -> Self::Output {
        Self::Output {
            num: self.num * rhs.num,
            den: self.den * rhs.den,
        }
    }
}

impl Mul<f64> for Rational {
    type Output = Self;

    fn mul(self, rhs: f64) -> Self::Output {
        let rhs = Rational::try_from(rhs).unwrap();

        Self {
            num: self.num * rhs.num,
            den: self.den * rhs.den,
        }
    }
}

impl Mul<Rational> for f64 {
    type Output = Rational;

    fn mul(self, rhs: Rational) -> Self::Output {
        let lhs = Rational::try_from(self).unwrap();

        Self::Output {
            num: lhs.num * rhs.num,
            den: lhs.den * rhs.den,
        }
    }
}

impl Sub for Rational {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self::Output {
        Self::Output {
            num: self.num * rhs.den - rhs.num * self.den,
            den: self.den * rhs.den,
        }
    }
}

impl Sub<f64> for Rational {
    type Output = Self;

    fn sub(self, rhs: f64) -> Self::Output {
        let rhs = Rational::try_from(rhs).unwrap();

        Self::Output {
            num: self.num * rhs.den - rhs.num * self.den,
            den: self.den * rhs.den,
        }
    }
}

impl Sub<Rational> for f64 {
    type Output = Rational;

    fn sub(self, rhs: Rational) -> Self::Output {
        let lhs = Rational::try_from(self).unwrap();

        Self::Output {
            num: lhs.num * rhs.den - rhs.num * lhs.den,
            den: lhs.den * rhs.den,
        }
    }
}

impl Div for Rational {
    type Output = Self;

    fn div(self, rhs: Self) -> Self::Output {
        Self::Output {
            num: self.num * rhs.den,
            den: self.den * rhs.num,
        }
    }
}

impl Div<f64> for Rational {
    type Output = Self;

    fn div(self, rhs: f64) -> Self::Output {
        let rhs = Rational::try_from(rhs).unwrap();

        Self::Output {
            num: self.num * rhs.den,
            den: self.den * rhs.num,
        }
    }
}

impl Div<Rational> for f64 {
    type Output = Rational;

    fn div(self, rhs: Rational) -> Self::Output {
        let lhs = Rational::try_from(self).unwrap();

        Self::Output {
            num: lhs.num * rhs.den,
            den: lhs.den * rhs.num,
        }
    }
}

impl Neg for Rational {
    type Output = Self;

    fn neg(self) -> Self::Output {
        Self::Output {
            num: -self.num,
            den: self.den,
        }
    }
}

impl GraphCipherAdd for Rational {
    type Left = Self;
    type Right = Self;

    fn graph_cipher_add(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            // Scale each numinator by the other's denominator.
            let num_a_2 = ctx.add_multiplication(a.ids[0], b.ids[1]);
            let num_b_2 = ctx.add_multiplication(a.ids[1], b.ids[0]);

            // Get denominators to have the same scale
            let den_2 = ctx.add_multiplication(a.ids[1], b.ids[1]);

            let ids = [ctx.add_addition(num_a_2, num_b_2), den_2];

            FheProgramNode::new(&ids)
        })
    }
}

impl GraphCipherPlainAdd for Rational {
    type Left = Self;
    type Right = Self;

    fn graph_cipher_plain_add(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Self::Right>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            // Scale each numinator by the other's denominator.
            let num_a_2 = ctx.add_multiplication_plaintext(a.ids[0], b.ids[1]);
            let num_b_2 = ctx.add_multiplication_plaintext(a.ids[1], b.ids[0]);

            // Get denominators to have the same scale
            let den_2 = ctx.add_multiplication_plaintext(a.ids[1], b.ids[1]);

            let ids = [ctx.add_addition(num_a_2, num_b_2), den_2];

            FheProgramNode::new(&ids)
        })
    }
}

impl GraphCipherConstAdd for Rational {
    type Left = Self;
    type Right = f64;

    fn graph_cipher_const_add(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: Self::Right,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let b = Self::try_from(b).unwrap();

            let b_num =
                ctx.add_plaintext_literal(b.num.try_into_plaintext(&ctx.params).unwrap().inner);

            let b_den =
                ctx.add_plaintext_literal(b.den.try_into_plaintext(&ctx.params).unwrap().inner);

            // Scale each numinator by the other's denominator.
            let num_a_2 = ctx.add_multiplication_plaintext(a.ids[0], b_den);
            let num_b_2 = ctx.add_multiplication_plaintext(a.ids[1], b_num);

            // Get denominators to have the same scale
            let den_2 = ctx.add_multiplication_plaintext(a.ids[1], b_den);

            let ids = [ctx.add_addition(num_a_2, num_b_2), den_2];

            FheProgramNode::new(&ids)
        })
    }
}

impl GraphCipherSub for Rational {
    type Left = Self;
    type Right = Self;

    fn graph_cipher_sub(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            // Scale each numinator by the other's denominator.
            let num_a_2 = ctx.add_multiplication(a.ids[0], b.ids[1]);
            let num_b_2 = ctx.add_multiplication(a.ids[1], b.ids[0]);

            // Get denominators to have the same scale
            let den_2 = ctx.add_multiplication(a.ids[1], b.ids[1]);

            let ids = [ctx.add_subtraction(num_a_2, num_b_2), den_2];

            FheProgramNode::new(&ids)
        })
    }
}

impl GraphCipherPlainSub for Rational {
    type Left = Self;
    type Right = Self;

    fn graph_cipher_plain_sub(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Self::Right>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            // Scale each numinator by the other's denominator.
            let num_a_2 = ctx.add_multiplication_plaintext(a.ids[0], b.ids[1]);
            let num_b_2 = ctx.add_multiplication_plaintext(a.ids[1], b.ids[0]);

            // Get denominators to have the same scale
            let den_2 = ctx.add_multiplication_plaintext(a.ids[1], b.ids[1]);

            let ids = [ctx.add_subtraction(num_a_2, num_b_2), den_2];

            FheProgramNode::new(&ids)
        })
    }
}

impl GraphPlainCipherSub for Rational {
    type Left = Self;
    type Right = Self;

    fn graph_plain_cipher_sub(
        a: FheProgramNode<Self::Left>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            // Scale each numinator by the other's denominator.
            let num_a_2 = ctx.add_multiplication_plaintext(b.ids[0], a.ids[1]);
            let num_b_2 = ctx.add_multiplication_plaintext(b.ids[1], a.ids[0]);

            // Get denominators to have the same scale
            let den_2 = ctx.add_multiplication_plaintext(b.ids[1], a.ids[1]);

            let ids = [ctx.add_subtraction(num_a_2, num_b_2), den_2];

            FheProgramNode::new(&ids)
        })
    }
}

impl GraphCipherConstSub for Rational {
    type Left = Self;
    type Right = f64;

    fn graph_cipher_const_sub(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: Self::Right,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let b = Self::try_from(b).unwrap();

            let b_num =
                ctx.add_plaintext_literal(b.num.try_into_plaintext(&ctx.params).unwrap().inner);
            let b_den =
                ctx.add_plaintext_literal(b.den.try_into_plaintext(&ctx.params).unwrap().inner);

            // Scale each numinator by the other's denominator.
            let num_a_2 = ctx.add_multiplication_plaintext(a.ids[0], b_den);
            let num_b_2 = ctx.add_multiplication_plaintext(a.ids[1], b_num);

            // Get denominators to have the same scale
            let den_2 = ctx.add_multiplication_plaintext(a.ids[1], b_den);

            let ids = [ctx.add_subtraction(num_a_2, num_b_2), den_2];

            FheProgramNode::new(&ids)
        })
    }
}

impl GraphConstCipherSub for Rational {
    type Left = f64;
    type Right = Self;

    fn graph_const_cipher_sub(
        a: Self::Left,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Right>> {
        with_ctx(|ctx| {
            let a = Self::try_from(a).unwrap();

            let a_num =
                ctx.add_plaintext_literal(a.num.try_into_plaintext(&ctx.params).unwrap().inner);
            let a_den =
                ctx.add_plaintext_literal(a.den.try_into_plaintext(&ctx.params).unwrap().inner);

            // Scale each numinator by the other's denominator.
            let num_b_2 = ctx.add_multiplication_plaintext(b.ids[0], a_den);
            let num_a_2 = ctx.add_multiplication_plaintext(b.ids[1], a_num);

            // Get denominators to have the same scale
            let den_2 = ctx.add_multiplication_plaintext(b.ids[1], a_den);

            let ids = [ctx.add_subtraction(num_a_2, num_b_2), den_2];

            FheProgramNode::new(&ids)
        })
    }
}

impl GraphCipherMul for Rational {
    type Left = Self;
    type Right = Self;

    fn graph_cipher_mul(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            // Scale each numinator by the other's denominator.
            let mul_num = ctx.add_multiplication(a.ids[0], b.ids[0]);
            let mul_den = ctx.add_multiplication(a.ids[1], b.ids[1]);

            let ids = [mul_num, mul_den];

            FheProgramNode::new(&ids)
        })
    }
}

impl GraphCipherPlainMul for Rational {
    type Left = Self;
    type Right = Self;

    fn graph_cipher_plain_mul(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Self::Right>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            // Scale each numinator by the other's denominator.
            let mul_num = ctx.add_multiplication_plaintext(a.ids[0], b.ids[0]);
            let mul_den = ctx.add_multiplication_plaintext(a.ids[1], b.ids[1]);

            let ids = [mul_num, mul_den];

            FheProgramNode::new(&ids)
        })
    }
}

impl GraphCipherConstMul for Rational {
    type Left = Self;
    type Right = f64;

    fn graph_cipher_const_mul(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: Self::Right,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let b = Self::try_from(b).unwrap();

            let num_b =
                ctx.add_plaintext_literal(b.num.try_into_plaintext(&ctx.params).unwrap().inner);
            let den_b =
                ctx.add_plaintext_literal(b.den.try_into_plaintext(&ctx.params).unwrap().inner);

            // Scale each numinator by the other's denominator.
            let mul_num = ctx.add_multiplication_plaintext(a.ids[0], num_b);
            let mul_den = ctx.add_multiplication_plaintext(a.ids[1], den_b);

            let ids = [mul_num, mul_den];

            FheProgramNode::new(&ids)
        })
    }
}

impl GraphCipherDiv for Rational {
    type Left = Self;
    type Right = Self;

    fn graph_cipher_div(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            // Scale each numinator by the other's denominator.
            let mul_num = ctx.add_multiplication(a.ids[0], b.ids[1]);
            let mul_den = ctx.add_multiplication(a.ids[1], b.ids[0]);

            let ids = [mul_num, mul_den];

            FheProgramNode::new(&ids)
        })
    }
}

impl GraphCipherPlainDiv for Rational {
    type Left = Self;
    type Right = Self;

    fn graph_cipher_plain_div(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Self::Right>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            // Scale each numinator by the other's denominator.
            let mul_num = ctx.add_multiplication_plaintext(a.ids[0], b.ids[1]);
            let mul_den = ctx.add_multiplication_plaintext(a.ids[1], b.ids[0]);

            let ids = [mul_num, mul_den];

            FheProgramNode::new(&ids)
        })
    }
}

impl GraphPlainCipherDiv for Rational {
    type Left = Self;
    type Right = Self;

    fn graph_plain_cipher_div(
        a: FheProgramNode<Self::Left>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            // Scale each numinator by the other's denominator.
            let mul_num = ctx.add_multiplication_plaintext(b.ids[1], a.ids[0]);
            let mul_den = ctx.add_multiplication_plaintext(b.ids[0], a.ids[1]);

            let ids = [mul_num, mul_den];

            FheProgramNode::new(&ids)
        })
    }
}

impl GraphCipherConstDiv for Rational {
    type Left = Self;
    type Right = f64;

    fn graph_cipher_const_div(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: Self::Right,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let b = Self::try_from(b).unwrap();

            let num_b =
                ctx.add_plaintext_literal(b.num.try_into_plaintext(&ctx.params).unwrap().inner);
            let den_b =
                ctx.add_plaintext_literal(b.den.try_into_plaintext(&ctx.params).unwrap().inner);

            // Scale each numinator by the other's denominator.
            let mul_num = ctx.add_multiplication_plaintext(a.ids[0], den_b);
            let mul_den = ctx.add_multiplication_plaintext(a.ids[1], num_b);

            let ids = [mul_num, mul_den];

            FheProgramNode::new(&ids)
        })
    }
}

impl GraphConstCipherDiv for Rational {
    type Left = f64;
    type Right = Self;

    fn graph_const_cipher_div(
        a: Self::Left,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Right>> {
        with_ctx(|ctx| {
            let a = Self::try_from(a).unwrap();

            let num_a =
                ctx.add_plaintext_literal(a.num.try_into_plaintext(&ctx.params).unwrap().inner);
            let den_a =
                ctx.add_plaintext_literal(a.den.try_into_plaintext(&ctx.params).unwrap().inner);

            // Scale each numinator by the other's denominator.
            let mul_num = ctx.add_multiplication_plaintext(b.ids[1], num_a);
            let mul_den = ctx.add_multiplication_plaintext(b.ids[0], den_a);

            let ids = [mul_num, mul_den];

            FheProgramNode::new(&ids)
        })
    }
}

impl GraphCipherNeg for Rational {
    type Val = Self;

    fn graph_cipher_neg(a: FheProgramNode<Cipher<Self::Val>>) -> FheProgramNode<Cipher<Self::Val>> {
        with_ctx(|ctx| {
            let neg = ctx.add_negate(a.ids[0]);
            let ids = [neg, a.ids[1]];

            FheProgramNode::new(&ids)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_add_non_fhe() {
        let a = Rational::try_from(5.).unwrap();
        let b = Rational::try_from(10.).unwrap();

        assert_eq!(a + b, 15f64.try_into().unwrap());
        assert_eq!(a + 10., 15f64.try_into().unwrap());
        assert_eq!(10. + a, 15f64.try_into().unwrap());
    }

    #[test]
    fn can_mul_non_fhe() {
        let a = Rational::try_from(5.).unwrap();
        let b = Rational::try_from(10.).unwrap();

        assert_eq!(a * b, 50f64.try_into().unwrap());
        assert_eq!(a * 10., 50f64.try_into().unwrap());
        assert_eq!(10. * a, 50f64.try_into().unwrap());
    }

    #[test]
    fn can_sub_non_fhe() {
        let a = Rational::try_from(5.).unwrap();
        let b = Rational::try_from(10.).unwrap();

        assert_eq!(a - b, (-5.).try_into().unwrap());
        assert_eq!(a - 10., (-5.).try_into().unwrap());
        assert_eq!(10. - a, (5.).try_into().unwrap());
    }

    #[test]
    fn can_div_non_fhe() {
        let a = Rational::try_from(5.).unwrap();
        let b = Rational::try_from(10.).unwrap();

        assert_eq!(a / b, (0.5).try_into().unwrap());
        assert_eq!(a / 10., (0.5).try_into().unwrap());
        assert_eq!(10. / a, (2.).try_into().unwrap());
    }

    #[test]
    fn can_neg_non_fhe() {
        let a = Rational::try_from(5.).unwrap();

        assert_eq!(-a, (-5.).try_into().unwrap());
    }
}
