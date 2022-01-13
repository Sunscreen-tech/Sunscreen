use seal::Plaintext as SealPlaintext;

use crate::types::{GraphAdd, GraphMul};
use crate::{
    types::{BfvType, CircuitNode, FheType, Type, Version},
    with_ctx, Params, crate_version
};

use sunscreen_runtime::{
    InnerPlaintext, NumCiphertexts, Plaintext, TryFromPlaintext, TryIntoPlaintext, TypeName, TypeNameInstance
};

#[derive(Debug, Clone, Copy, PartialEq)]
/**
 * A quasi fixed-point representation capable of representing values with
 * both integer and fractional components.
 */
pub struct Fractional<const INT_BITS: usize> {
    val: f64,
}

impl <const INT_BITS: usize> std::ops::Deref for Fractional<INT_BITS> {
    type Target = f64;

    fn deref(&self) -> &Self::Target {
        &self.val
    }
}

impl <const INT_BITS: usize> NumCiphertexts for Fractional<INT_BITS> {
    const NUM_CIPHERTEXTS: usize = 1;
}

impl <const INT_BITS: usize> TypeName for Fractional<INT_BITS> {
    fn type_name() -> Type {
        Type { name: "sunscreen_compiler::types::Fractional".to_owned(), version: Version::parse(crate_version!()).expect("Crate version is not a valid semver") }
    }
}
impl <const INT_BITS: usize> TypeNameInstance for Fractional<INT_BITS> {
    fn type_name_instance(&self) -> Type {
        Self::type_name()
    }
}

impl <const INT_BITS: usize> FheType for Fractional<INT_BITS> {}
impl <const INT_BITS: usize> BfvType for Fractional<INT_BITS> {}

impl <const INT_BITS: usize> Fractional<INT_BITS> {}

impl <const INT_BITS: usize> GraphAdd for Fractional<INT_BITS> {
    type Left = Fractional<INT_BITS>;
    type Right = Fractional<INT_BITS>;

    fn graph_add(
        a: CircuitNode<Self::Left>,
        b: CircuitNode<Self::Right>,
    ) -> CircuitNode<Self::Left> {
        with_ctx(|ctx| {
            let n = ctx.add_addition(a.ids[0], b.ids[0]);

            CircuitNode::new(&[n])
        })
    }
}

impl <const INT_BITS: usize> GraphMul for Fractional<INT_BITS> {
    type Left = Fractional<INT_BITS>;
    type Right = Fractional<INT_BITS>;

    fn graph_mul(
        a: CircuitNode<Self::Left>,
        b: CircuitNode<Self::Right>,
    ) -> CircuitNode<Self::Left> {
        with_ctx(|ctx| {
            let n = ctx.add_multiplication(a.ids[0], b.ids[0]);

            CircuitNode::new(&[n])
        })
    }
}

impl <const INT_BITS: usize> TryIntoPlaintext for Fractional<INT_BITS> {
    fn try_into_plaintext(
        &self,
        params: &Params,
    ) -> std::result::Result<Plaintext, sunscreen_runtime::Error> {
        if self.val.is_nan() {
            return Err(sunscreen_runtime::Error::FheTypeError("Value is NaN.".to_owned()));
        }

        if self.val.is_infinite() {
            return Err(sunscreen_runtime::Error::FheTypeError("Value is infinite.".to_owned()));
        }

        let mut seal_plaintext = SealPlaintext::new()?;
        let n = params.lattice_dimension as usize;
        seal_plaintext.resize(n);

        // Just flush subnormals, as they're tiny and annoying.
        if self.val.is_subnormal() || self.val == 0.0 {
            return Ok(Plaintext {
                inner: InnerPlaintext::Seal(vec![seal_plaintext])
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

        if power > INT_BITS as i64 {
            return Err(sunscreen_runtime::Error::FheTypeError("Out of range".to_owned()));
        }

        for i in 0..f64::MANTISSA_DIGITS {
            let bit_value = (mantissa & 0x1 << i) >> i;
            let bit_power = power - (f64::MANTISSA_DIGITS - i - 1) as i64;

            let coeff_index = if bit_power >= 0 {
                bit_power as usize
            } else {
                (n as i64 + bit_power) as usize
            };

            seal_plaintext.set_coefficient(coeff_index as usize, bit_value);
        }

        Ok(Plaintext {
            inner: InnerPlaintext::Seal(vec![seal_plaintext]),
        })
    }
}

impl <const INT_BITS: usize> TryFromPlaintext for Fractional<INT_BITS> {
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

                for i in 0..n {
                    let power = if i < INT_BITS {
                        i as i64
                    } else {
                        i as i64 - n as i64
                    };

                    val += p[0].get_coefficient(i) as f64 * (power as f64).exp2();
                }


                Self { val }
            }
        };

        Ok(val)
    }
}

impl <const INT_BITS: usize> From<f64> for Fractional<INT_BITS> {
    fn from(val: f64) -> Self {
        Self { val }
    }
}

impl <const INT_BITS: usize> Into<f64> for Fractional<INT_BITS> {
    fn into(self) -> f64 {
        self.val
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{SecurityLevel, SchemeType};

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

        round_trip(0.0);
        round_trip(1.0);
        round_trip(6.0);
        round_trip(6.6);
        round_trip(1.2);
        round_trip(1e13);
        round_trip(0.0000000005);
    }
}
