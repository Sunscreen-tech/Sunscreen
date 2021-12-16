use sunscreen_compiler::{TypeName, Params, InnerPlaintext, Plaintext, with_ctx};
use sunscreen_compiler::types::{BfvType, FheType, NumCiphertexts, TryIntoPlaintext, TryFromPlaintext, Signed, GraphAdd, CircuitNode};
use sunscreen_runtime::{Error};

use num::Rational64;

#[derive(Debug, Clone, Copy, TypeName, PartialEq, Eq)]
pub struct Rational {
    num: Signed,
    den: Signed,
}

// This trait is needed to help the runtime group a circuit's return value into vectors for
// each type. It's spiritually similar to [`std::mem::sizeof`] except it returns the number
// of plaintexts this type needs rather than the number of bytes.
impl NumCiphertexts for Rational {
    const NUM_CIPHERTEXTS: usize = Signed::NUM_CIPHERTEXTS + Signed::NUM_CIPHERTEXTS;
}

// This trait takes a plaintext and turns it into a [`Rational`]. [`Plaintext`] is a type generally
// hidden from users that serves as an intermediary before encryption. While its underlying
// representation is scheme specific, it doesn't matter for this type since it simply composes
// other types. You *can* add new primitive types if you encode into the underlying plaintext,
// but that's a more advanced use case.
//
// This trait is needed so Runtime knows how to package this type after decryption.
impl TryFromPlaintext for Rational {
    fn try_from_plaintext(plaintext: &Plaintext, params: &Params) -> Result<Self, Error> {
         let (num, den) = match &plaintext.inner {
            InnerPlaintext::Seal(p) => {
                // We encode Rationals as 2 plaintexts. Wrap each plaintext and delegate
                // to Signed::try_from_plaintext to compute our inner values.
                let num = Plaintext {inner: InnerPlaintext::Seal(vec![p[0].clone()]) };
                let den = Plaintext {inner: InnerPlaintext::Seal(vec![p[1].clone()]) };

                (
                    Signed::try_from_plaintext(&num, params)?,
                    Signed::try_from_plaintext(&den, params)?
                )
            }
         };

         Ok(Self { num, den })
    }
}

// This trait takes a Rational and turns it into a plaintext. This is used in encryption.
impl TryIntoPlaintext for Rational {
    fn try_into_plaintext(&self, params: &Params) -> Result<Plaintext, Error> {
        // We encode Rationals as 2 plaintexts. Wrap each plaintext and delegate
            // to Signed::try_from_plaintext to compute our inner values.
        let num = self.num.try_into_plaintext(params)?;
        let den = self.den.try_into_plaintext(params)?;

        let (num, den) = match (num.inner, den.inner) {
            (InnerPlaintext::Seal(n), InnerPlaintext::Seal(d)) => {
                (n[0].clone(), d[0].clone())
            }
        };

        Ok(Plaintext {
            inner: InnerPlaintext::Seal(vec![num, den])
        })
    }
}

// This marker trait is required in order to use this type as an input or output of a circuit.
impl FheType for Rational {}
impl BfvType for Rational {}

// Next, we need to provide a way for users to easily create one of these from an f64.
impl TryFrom<f64> for Rational {
    type Error = Error;

    fn try_from(val: f64) -> Result<Self, Self::Error> {
        // Here we stand on the shoulders of giants, and use the `num` crate's Rational64
        // type to parse a float into a rational.
        let val = Rational64::approximate_float(val).ok_or(Error::FheTypeError("Failed to parse float into rational".to_owned()))?;

        Ok(Self {
            num: Signed::from(*val.numer()),
            den: Signed::from(*val.denom())
        })
    }
}

impl GraphAdd for Rational {
    type Left = Self;
    type Right = Self;

    fn graph_add(a: CircuitNode<Self::Left>, b: CircuitNode<Self::Right>) -> CircuitNode<Self::Left> {
        with_ctx(|ctx| {
            let ids = [
                ctx.add_addition(a.ids[0], b.ids[0]),
                ctx.add_addition(a.ids[1], b.ids[1]),
            ];

            CircuitNode::new(&ids)
        })
    }

}