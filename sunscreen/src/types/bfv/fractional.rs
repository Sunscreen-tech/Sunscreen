use seal_fhe::Plaintext as SealPlaintext;

use crate::types::{
    ops::{
        GraphCipherAdd, GraphCipherConstAdd, GraphCipherConstDiv, GraphCipherConstMul,
        GraphCipherConstSub, GraphCipherMul, GraphCipherNeg, GraphCipherPlainAdd,
        GraphCipherPlainMul, GraphCipherPlainSub, GraphCipherSub, GraphConstCipherSub,
        GraphPlainCipherSub,
    },
    Cipher,
};
use crate::{
    types::{intern::FheProgramNode, BfvType, FheType, Type, Version},
    with_ctx, FheProgramInputTrait, Params, WithContext,
};

use sunscreen_runtime::{
    InnerPlaintext, NumCiphertexts, Plaintext, TryFromPlaintext, TryIntoPlaintext, TypeName,
    TypeNameInstance,
};

use std::ops::*;

#[derive(Debug, Clone, Copy, PartialEq)]
/**
 * A quasi fixed-point representation capable of storing values with
 * both integer and fractional components.
 *
 * # Remarks
 * This type is capable of addition, subtraction, and multiplication with no
 * more overhead than the [`Signed`](crate::types::bfv::Signed) type.
 * That is, addition and multiplication each take exactly one operation.
 *
 * ## Representation
 * Recall that in BFV, the plaintext consists of a polynomial with
 * `poly_degree` terms. `poly_degree` is a BFV scheme parameter that (by
 * default) suncreen assigns for you depending on your FHE program's noise
 * requirements.
 *
 * This type represents values with both an integer and fractional component.
 * Semantically, you can think of this as a fixed-point value, but the
 * implementation is somewhat different. The generic argument `INT_BITS`
 * defines how many bits are reserved for the integer portion and the
 * remaining `poly_degree - INT_BITS` bits store the fraction.
 *
 * Internally, this has a fairly funky representation that differs from
 * traditional fixed-point. These variations allow the type to function
 * properly under addition and multiplication in the absence of carries
 * without needing to shift the decimal location after multiply operations.
 *
 * Each binary digit of the number maps to a single coefficient in the
 * polynomial. The integer digits map to the low order plaintext polynomial
 * coefficients with the following relation:
 *
 * ```text
 * int(x) = sum_{i=0..INT_BITS}(c_i * 2^i)
 * ```
 *
 * where `c_i` is the coefficient for the `x^i` term of the polynomial.
 *
 * Then, the fractional parts follow:
 *
 * ```text
 * frac(x) = sum_{i=INT_BITS..N}(-c_i * 2^(N-i))
 * ```
 *
 * where `N` is the `poly_degree`.
 *
 * Note that the sign of the polynomial coefficient for fractional terms are
 * inverted. The entire value is simply `int(x) + frac(x)`.
 *
 * For example:
 * `5.8125 =`
 *
 * | Coefficient index | 0   | 1   | 2   | ... | N-4  | N-3  | N-2  | N-1  |
 * |-------------------|-----|-----|-----|-----|------|------|------|------|
 * | 2^N               | 2^0 | 2^1 | 2^2 | ... | 2^-4 | 2^-3 | 2^-2 | 2^-1 |
 * | Value             | 1   | 0   | 1   | ... | -1   | 0    | -1   | -1   |
 *
 * Negative values encode every digit as negative, where a negative
 * coefficient is any value above `(plain_modulus + 1) / 2` up to
 * `plain_modulus - 1`. The former is the most negative value, while the
 * latter is the value `-1`. This is analogous to how 2's complement
 * defines values above `0x80..00` to be negative with `0x80..00`
 * being `INT_MIN` and `0xFF..FF` being `-1`.
 *
 * For example, if plain modulus is `14`, the value `-1` encodes as the
 * unsigned value `13`, `-6` encodes as `8`, and the values `0..7` are simply
 * `0..7` respectively.
 *
 * A full example of encoding a negative value:
 * `-5.8125 =`
 *
 * | Coefficient index | 0   | 1   | 2   | ... | N-4  | N-3  | N-2  | N-1  |
 * |-------------------|-----|-----|-----|-----|------|------|------|------|
 * | 2^N               | 2^0 | 2^1 | 2^2 | ... | 2^-4 | 2^-3 | 2^-2 | 2^-1 |
 * | Value             | -1  | 0   | -1  | ... | 1    | 0    |  1   | 1    |
 *
 * See [SEAL v2.1 documentation](https://eprint.iacr.org/2017/224.pdf) for
 * full details.
 *
 * ## Limitations
 * When encrypting a Fractional type, encoding will fail if:
 * * The underlying [`f64`] is infinite.
 * * The underlying [`f64`] is NaN
 * * The integer portion of the underlying [`f64`] exceeds the precision for
 * `INT_BITS`
 *
 * Subnormals flush to 0, while normals are represented without precision loss.
 *
 * While the numbers are binary, addition and multiplication are carryless.
 * That is, carries don't propagate but instead increase the digit (i.e.
 * polynomial coefficients) beyond radix 2. However, they're still subject to
 * the scheme's `plain_modulus` specified during FHE program compilation.
 * Repeated operations on an encrypted Fractional value will result in garbled
 * values if *any* digit overflows the `plain_modulus`.
 *
 * Additionally numbers can experience more traditional overflow if the integer
 * portion exceeds `2^INT_BITS`. Finally, repeated multiplications of
 * numbers with decimal components introduce new decmal digits. If more than
 * `2^(n-INT_BITS)` decimals appear, they will overflow into the integer
 * portion and garble the number.
 *
 * To mitigate these issues, you should do some mix of the following:
 * * Ensure inputs never result in either of these scenarios. Inputs to a
 * FHE program need to have small enough digits to avoid digit overflow, values
 * are small enough to avoid integer underflow, and have few enough decimal
 * places to avoid decimal underflow.
 * * Alice can periodically decrypt values, call turn the [`Fractional`] into
 * an [`f64`], turn that back into a [`Fractional`], and re-encrypt. This will
 * propagate carries and truncate the decimal portion to at most 53
 * places (radix 2).
 *
 * ```rust
 * # use sunscreen::types::bfv::Fractional;
 * # use sunscreen::{Ciphertext, PublicKey, PrivateKey, Runtime, Result};
 *
 * fn normalize(
 *   runtime: &Runtime,
 *   ciphertext: &Ciphertext,
 *   private_key: &PrivateKey,
 *   public_key: &PublicKey
 * ) -> Result<Ciphertext> {
 *   let val: Fractional::<64> = runtime.decrypt(&ciphertext, &private_key)?;
 *   let val: f64 = val.into();
 *   let val = Fractional::<64>::from(val);
 *
 *   Ok(runtime.encrypt(val, &public_key)?)
 * }
 * ```
 *
 * Overflow aside, decryption can result in more acceptable and exprected precision loss:
 * * If `INT_BITS > 1024`, the [`Fractional`]'s int can exceed [`f64::MAX`],
 * resulting in [`f64::INFINITY`].
 * * Decrypion will truncate precision beyond the 53 floating point mantissa bits (52 for subnormals). As previously mentioned, encrypting a subnormal
 *  flushes to 0.
 */
pub struct Fractional<const INT_BITS: usize> {
    val: f64,
}

impl<const INT_BITS: usize> std::ops::Deref for Fractional<INT_BITS> {
    type Target = f64;

    fn deref(&self) -> &Self::Target {
        &self.val
    }
}

impl<const INT_BITS: usize> NumCiphertexts for Fractional<INT_BITS> {
    const NUM_CIPHERTEXTS: usize = 1;
}

impl<const INT_BITS: usize> FheProgramInputTrait for Fractional<INT_BITS> {}

impl<const INT_BITS: usize> Default for Fractional<INT_BITS> {
    fn default() -> Self {
        Self::from(0.0)
    }
}

impl<const INT_BITS: usize> TypeName for Fractional<INT_BITS> {
    fn type_name() -> Type {
        let version = env!("CARGO_PKG_VERSION");

        Type {
            name: format!("sunscreen::types::Fractional<{}>", INT_BITS),
            version: Version::parse(version).expect("Crate version is not a valid semver"),
            is_encrypted: false,
        }
    }
}
impl<const INT_BITS: usize> TypeNameInstance for Fractional<INT_BITS> {
    fn type_name_instance(&self) -> Type {
        Self::type_name()
    }
}

impl<const INT_BITS: usize> FheType for Fractional<INT_BITS> {}
impl<const INT_BITS: usize> BfvType for Fractional<INT_BITS> {}

impl<const INT_BITS: usize> Fractional<INT_BITS> {}

impl<const INT_BITS: usize> GraphCipherAdd for Fractional<INT_BITS> {
    type Left = Fractional<INT_BITS>;
    type Right = Fractional<INT_BITS>;

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

impl<const INT_BITS: usize> GraphCipherPlainAdd for Fractional<INT_BITS> {
    type Left = Fractional<INT_BITS>;
    type Right = Fractional<INT_BITS>;

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

impl<const INT_BITS: usize> GraphCipherConstAdd for Fractional<INT_BITS> {
    type Left = Fractional<INT_BITS>;
    type Right = f64;

    fn graph_cipher_const_add(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: Self::Right,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let b = Self::from(b).try_into_plaintext(&ctx.params).unwrap();

            let lit = ctx.add_plaintext_literal(b.inner);
            let n = ctx.add_addition_plaintext(a.ids[0], lit);

            FheProgramNode::new(&[n])
        })
    }
}

impl<const INT_BITS: usize> GraphCipherSub for Fractional<INT_BITS> {
    type Left = Fractional<INT_BITS>;
    type Right = Fractional<INT_BITS>;

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

impl<const INT_BITS: usize> GraphCipherPlainSub for Fractional<INT_BITS> {
    type Left = Fractional<INT_BITS>;
    type Right = Fractional<INT_BITS>;

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

impl<const INT_BITS: usize> GraphPlainCipherSub for Fractional<INT_BITS> {
    type Left = Fractional<INT_BITS>;
    type Right = Fractional<INT_BITS>;

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

impl<const INT_BITS: usize> GraphCipherConstSub for Fractional<INT_BITS> {
    type Left = Fractional<INT_BITS>;
    type Right = f64;

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

impl<const INT_BITS: usize> GraphConstCipherSub for Fractional<INT_BITS> {
    type Left = f64;
    type Right = Fractional<INT_BITS>;

    fn graph_const_cipher_sub(
        a: Self::Left,
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

impl<const INT_BITS: usize> GraphCipherMul for Fractional<INT_BITS> {
    type Left = Fractional<INT_BITS>;
    type Right = Fractional<INT_BITS>;

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

impl<const INT_BITS: usize> GraphCipherPlainMul for Fractional<INT_BITS> {
    type Left = Fractional<INT_BITS>;
    type Right = Fractional<INT_BITS>;

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

impl<const INT_BITS: usize> GraphCipherConstMul for Fractional<INT_BITS> {
    type Left = Fractional<INT_BITS>;
    type Right = f64;

    fn graph_cipher_const_mul(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: Self::Right,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let b = Self::from(b).try_into_plaintext(&ctx.params).unwrap();
            let lit = ctx.add_plaintext_literal(b.inner);

            let n = ctx.add_multiplication_plaintext(a.ids[0], lit);

            FheProgramNode::new(&[n])
        })
    }
}

impl<const INT_BITS: usize> GraphCipherConstDiv for Fractional<INT_BITS> {
    type Left = Fractional<INT_BITS>;
    type Right = f64;

    fn graph_cipher_const_div(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: f64,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let b = Self::try_from(1. / b)
                .unwrap()
                .try_into_plaintext(&ctx.params)
                .unwrap();

            let lit = ctx.add_plaintext_literal(b.inner);

            let n = ctx.add_multiplication_plaintext(a.ids[0], lit);

            FheProgramNode::new(&[n])
        })
    }
}

impl<const INT_BITS: usize> GraphCipherNeg for Fractional<INT_BITS> {
    type Val = Fractional<INT_BITS>;

    fn graph_cipher_neg(a: FheProgramNode<Cipher<Self>>) -> FheProgramNode<Cipher<Self::Val>> {
        with_ctx(|ctx| {
            let n = ctx.add_negate(a.ids[0]);

            FheProgramNode::new(&[n])
        })
    }
}

impl<const INT_BITS: usize> TryIntoPlaintext for Fractional<INT_BITS> {
    fn try_into_plaintext(
        &self,
        params: &Params,
    ) -> std::result::Result<Plaintext, sunscreen_runtime::Error> {
        if self.val.is_nan() {
            return Err(sunscreen_runtime::Error::FheTypeError(
                "Value is NaN.".to_owned(),
            ));
        }

        if self.val.is_infinite() {
            return Err(sunscreen_runtime::Error::FheTypeError(
                "Value is infinite.".to_owned(),
            ));
        }

        let mut seal_plaintext = SealPlaintext::new()?;
        let n = params.lattice_dimension as usize;
        seal_plaintext.resize(n);

        // Just flush subnormals, as they're tiny and annoying.
        if self.val.is_subnormal() || self.val == 0.0 {
            return Ok(Plaintext {
                data_type: self.type_name_instance(),
                inner: InnerPlaintext::Seal(vec![WithContext {
                    params: params.clone(),
                    data: seal_plaintext,
                }]),
            });
        }

        // If we made it this far, the float value is of normal form.
        // Recall 64-bit IEEE 754-2008 floats have 52 mantissa, 11 exp, and 1
        // sign bit from LSB to MSB order. They are represented by the form
        // -1^sign * 2^(exp - 1023) * 1.mantissa

        // Coerce the f64 into a u64 so we can extract out the
        // sign, mantissa, and exponent.
        let as_u64: u64 = unsafe { std::mem::transmute(self.val) };

        let sign_mask = 0x1 << 63;
        let mantissa_mask = 0xFFFFFFFFFFFFF;
        let exp_mask = !mantissa_mask & !sign_mask;

        // Mask of the mantissa and add the implicit 1
        let mantissa = as_u64 & mantissa_mask | (mantissa_mask + 1);
        let exp = as_u64 & exp_mask;
        let power = (exp >> (f64::MANTISSA_DIGITS - 1)) as i64 - 1023;
        let sign = (as_u64 & sign_mask) >> 63;

        if power + 1 > INT_BITS as i64 {
            return Err(sunscreen_runtime::Error::FheTypeError(
                "Out of range".to_owned(),
            ));
        }

        for i in 0..f64::MANTISSA_DIGITS {
            let bit_value = (mantissa & 0x1 << i) >> i;
            let bit_power = power - (f64::MANTISSA_DIGITS - i - 1) as i64;

            let coeff_index = if bit_power >= 0 {
                bit_power as usize
            } else {
                (n as i64 + bit_power) as usize
            };

            // For powers less than 0, we invert the sign.
            let sign = if bit_power >= 0 { sign } else { !sign & 0x1 };

            let coeff = if sign == 0 {
                bit_value
            } else if bit_value > 0 {
                params.plain_modulus - bit_value
            } else {
                0
            };

            seal_plaintext.set_coefficient(coeff_index as usize, coeff);
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

impl<const INT_BITS: usize> TryFromPlaintext for Fractional<INT_BITS> {
    fn try_from_plaintext(
        plaintext: &Plaintext,
        params: &Params,
    ) -> std::result::Result<Self, sunscreen_runtime::Error> {
        let val = match &plaintext.inner {
            InnerPlaintext::Seal(p) => {
                if p.len() != 1 {
                    return Err(sunscreen_runtime::Error::IncorrectCiphertextCount);
                }

                let mut val = 0.0f64;
                let n = params.lattice_dimension as usize;

                let len = p[0].len();

                let negative_cutoff = (params.plain_modulus + 1) / 2;

                for i in 0..usize::min(n, len) {
                    let power = if i < INT_BITS {
                        i as i64
                    } else {
                        i as i64 - n as i64
                    };

                    let coeff = p[0].get_coefficient(i);

                    // Reverse the sign of negative powers.
                    let sign = if power >= 0 { 1f64 } else { -1f64 };

                    if coeff < negative_cutoff {
                        val += sign * coeff as f64 * (power as f64).exp2();
                    } else {
                        val -= sign * (params.plain_modulus - coeff) as f64 * (power as f64).exp2();
                    };
                }

                Self { val }
            }
        };

        Ok(val)
    }
}

impl<const INT_BITS: usize> From<f64> for Fractional<INT_BITS> {
    fn from(val: f64) -> Self {
        Self { val }
    }
}

impl<const INT_BITS: usize> Into<f64> for Fractional<INT_BITS> {
    fn into(self) -> f64 {
        self.val
    }
}

impl<const INT_BITS: usize> Add for Fractional<INT_BITS> {
    type Output = Self;

    fn add(self, rhs: Self) -> Self {
        Self {
            val: self.val + rhs.val,
        }
    }
}

impl<const INT_BITS: usize> Add<f64> for Fractional<INT_BITS> {
    type Output = Self;

    fn add(self, rhs: f64) -> Self {
        Self {
            val: self.val + rhs,
        }
    }
}

impl<const INT_BITS: usize> Add<Fractional<INT_BITS>> for f64 {
    type Output = Fractional<INT_BITS>;

    fn add(self, rhs: Fractional<INT_BITS>) -> Self::Output {
        Fractional {
            val: self + rhs.val,
        }
    }
}

impl<const INT_BITS: usize> Mul for Fractional<INT_BITS> {
    type Output = Self;

    fn mul(self, rhs: Self) -> Self {
        Self {
            val: self.val * rhs.val,
        }
    }
}

impl<const INT_BITS: usize> Mul<f64> for Fractional<INT_BITS> {
    type Output = Self;

    fn mul(self, rhs: f64) -> Self {
        Self {
            val: self.val * rhs,
        }
    }
}

impl<const INT_BITS: usize> Mul<Fractional<INT_BITS>> for f64 {
    type Output = Fractional<INT_BITS>;

    fn mul(self, rhs: Fractional<INT_BITS>) -> Self::Output {
        Fractional {
            val: self * rhs.val,
        }
    }
}

impl<const INT_BITS: usize> Sub for Fractional<INT_BITS> {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self {
        Self {
            val: self.val - rhs.val,
        }
    }
}

impl<const INT_BITS: usize> Sub<f64> for Fractional<INT_BITS> {
    type Output = Self;

    fn sub(self, rhs: f64) -> Self {
        Self {
            val: self.val - rhs,
        }
    }
}

impl<const INT_BITS: usize> Sub<Fractional<INT_BITS>> for f64 {
    type Output = Fractional<INT_BITS>;

    fn sub(self, rhs: Fractional<INT_BITS>) -> Self::Output {
        Fractional {
            val: self - rhs.val,
        }
    }
}

impl<const INT_BITS: usize> Div<f64> for Fractional<INT_BITS> {
    type Output = Self;

    fn div(self, rhs: f64) -> Self {
        Self {
            val: self.val / rhs,
        }
    }
}

impl<const INT_BITS: usize> Neg for Fractional<INT_BITS> {
    type Output = Self;

    fn neg(self) -> Self {
        Self { val: -self.val }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{SchemeType, SecurityLevel};
    use float_cmp::ApproxEq;

    #[test]
    fn can_encode_decode_fractional() {
        let round_trip = |x: f64| {
            let params = Params {
                lattice_dimension: 4096,
                plain_modulus: 1_000_000,
                coeff_modulus: vec![],
                scheme_type: SchemeType::Bfv,
                security_level: SecurityLevel::TC128,
            };

            let f_1 = Fractional::<64>::from(x);
            let pt = f_1.try_into_plaintext(&params).unwrap();
            let f_2 = Fractional::<64>::try_from_plaintext(&pt, &params).unwrap();

            assert_eq!(f_1, f_2);
        };

        round_trip(3.14);
        round_trip(0.0);
        round_trip(1.0);
        round_trip(5.8125);
        round_trip(6.0);
        round_trip(6.6);
        round_trip(1.2);
        round_trip(1e13);
        round_trip(0.0000000005);
        round_trip(-1.0);
        round_trip(-5.875);
        round_trip(-6.0);
        round_trip(-6.6);
        round_trip(-1.2);
        round_trip(-1e13);
        round_trip(-0.0000000005);
    }

    #[test]
    fn can_add_non_fhe() {
        let a = Fractional::<64>::from(3.14);
        let b = Fractional::<64>::from(1.5);

        // Allow 1 ULP of error
        assert!((a + b).approx_eq(4.64, (0.0, 1)));
        assert!((3.14 + b).approx_eq(4.64, (0.0, 1)));
        assert!((a + 1.5).approx_eq(4.64, (0.0, 1)));
    }

    #[test]
    fn can_mul_non_fhe() {
        let a = Fractional::<64>::from(3.14);
        let b = Fractional::<64>::from(1.5);

        // Allow 1 ULP of error
        assert!((a * b).approx_eq(4.71, (0.0, 1)));
        assert!((3.14 * b).approx_eq(4.71, (0.0, 1)));
        assert!((a * 1.5).approx_eq(4.71, (0.0, 1)));
    }

    #[test]
    fn can_sub_non_fhe() {
        let a = Fractional::<64>::from(3.14);
        let b = Fractional::<64>::from(1.5);

        // Allow 1 ULP of error
        assert!((a - b).approx_eq(1.64, (0.0, 1)));
        assert!((3.14 - b).approx_eq(1.64, (0.0, 1)));
        assert!((a - 1.5).approx_eq(1.64, (0.0, 1)));
    }

    #[test]
    fn can_div_non_fhe() {
        let a = Fractional::<64>::from(3.14);

        // Allow 1 ULP of error
        assert!((a / 1.5).approx_eq(3.14 / 1.5, (0.0, 1)));
    }

    #[test]
    fn can_neg_non_fhe() {
        let a = Fractional::<64>::from(3.14);

        // Allow 1 ULP of error
        assert_eq!(-a, (-3.14).into());
    }
}
