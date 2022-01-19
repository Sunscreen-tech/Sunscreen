use crate::types::{
    BfvType, CircuitNode, Cipher, FheType, GraphCipherAdd, GraphDiv, GraphCipherMul, GraphCipherSub, NumCiphertexts, Signed,
    TryFromPlaintext, TryIntoPlaintext,
};
use crate::{with_ctx, InnerPlaintext, Params, Plaintext, TypeName};
use std::cmp::Eq;
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

impl NumCiphertexts for Rational {
    const NUM_CIPHERTEXTS: usize = Signed::NUM_CIPHERTEXTS + Signed::NUM_CIPHERTEXTS;
}

impl TryFromPlaintext for Rational {
    fn try_from_plaintext(plaintext: &Plaintext, params: &Params) -> Result<Self, Error> {
        let (num, den) = match &plaintext.inner {
            InnerPlaintext::Seal(p) => {
                let num = Plaintext {
                    inner: InnerPlaintext::Seal(vec![p[0].clone()]),
                };
                let den = Plaintext {
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
            inner: InnerPlaintext::Seal(vec![num, den]),
        })
    }
}

impl FheType for Rational {}
impl BfvType for Rational {}

impl TryFrom<f64> for Rational {
    type Error = Error;

    fn try_from(val: f64) -> Result<Self, Self::Error> {
        let val = Rational64::approximate_float(val).ok_or(Error::FheTypeError(
            "Failed to parse float into rational".to_owned(),
        ))?;

        Ok(Self {
            num: Signed::from(*val.numer()),
            den: Signed::from(*val.denom()),
        })
    }
}

impl Into<f64> for Rational {
    fn into(self) -> f64 {
        let num: i64 = self.num.into();
        let den: i64 = self.den.into();

        num as f64 / den as f64
    }
}

impl GraphCipherAdd for Rational {
    type Left = Self;
    type Right = Self;

    fn graph_cipher_add(
        a: CircuitNode<Cipher<Self::Left>>,
        b: CircuitNode<Cipher<Self::Right>>,
    ) -> CircuitNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            // Scale each numinator by the other's denominator.
            let num_a_2 = ctx.add_multiplication(a.ids[0], b.ids[1]);
            let num_b_2 = ctx.add_multiplication(a.ids[1], b.ids[0]);

            // Get denominators to have the same scale
            let den_2 = ctx.add_multiplication(a.ids[1], b.ids[1]);

            let ids = [ctx.add_addition(num_a_2, num_b_2), den_2];

            CircuitNode::new(&ids)
        })
    }
}

impl GraphCipherSub for Rational {
    type Left = Self;
    type Right = Self;

    fn graph_cipher_sub(
        a: CircuitNode<Cipher<Self::Left>>,
        b: CircuitNode<Cipher<Self::Right>>,
    ) -> CircuitNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            // Scale each numinator by the other's denominator.
            let num_a_2 = ctx.add_multiplication(a.ids[0], b.ids[1]);
            let num_b_2 = ctx.add_multiplication(a.ids[1], b.ids[0]);

            // Get denominators to have the same scale
            let den_2 = ctx.add_multiplication(a.ids[1], b.ids[1]);

            let ids = [ctx.add_subtraction(num_a_2, num_b_2), den_2];

            CircuitNode::new(&ids)
        })
    }
}

impl GraphCipherMul for Rational {
    type Left = Self;
    type Right = Self;

    fn graph_cipher_mul(
        a: CircuitNode<Cipher<Self::Left>>,
        b: CircuitNode<Cipher<Self::Right>>,
    ) -> CircuitNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            // Scale each numinator by the other's denominator.
            let mul_num = ctx.add_multiplication(a.ids[0], b.ids[0]);
            let mul_den = ctx.add_multiplication(a.ids[1], b.ids[1]);

            let ids = [mul_num, mul_den];

            CircuitNode::new(&ids)
        })
    }
}

impl GraphDiv for Rational {
    type Left = Self;
    type Right = Self;

    fn graph_div(
        a: CircuitNode<Self::Left>,
        b: CircuitNode<Self::Right>,
    ) -> CircuitNode<Self::Left> {
        with_ctx(|ctx| {
            // Scale each numinator by the other's denominator.
            let mul_num = ctx.add_multiplication(a.ids[0], b.ids[1]);
            let mul_den = ctx.add_multiplication(a.ids[1], b.ids[0]);

            let ids = [mul_num, mul_den];

            CircuitNode::new(&ids)
        })
    }
}
