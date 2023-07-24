use std::ops::*;

use crypto_bigint::{nlimbs, UInt, Wrapping};
use paste::paste;
use seal_fhe::Plaintext as SealPlaintext;

use sunscreen_runtime::{
    InnerPlaintext, NumCiphertexts, Plaintext, TryFromPlaintext, TryIntoPlaintext,
};

use crate as sunscreen;
use crate::{
    fhe::{with_fhe_ctx, FheContextOps},
    types::{
        ops::{
            GraphCipherAdd, GraphCipherConstAdd, GraphCipherConstMul, GraphCipherConstSub,
            GraphCipherMul, GraphCipherPlainAdd, GraphCipherPlainMul, GraphCipherPlainSub,
            GraphCipherSub, GraphConstCipherSub, GraphPlainCipherSub,
        },
        Cipher,
    },
};
use crate::{
    types::{intern::FheProgramNode, BfvType, FheType, TypeNameInstance},
    FheProgramInputTrait, Params, TypeName as DeriveTypeName, WithContext,
};

#[derive(Debug, Clone, Copy, DeriveTypeName, PartialEq, Eq)]
/**
 * A single unsigned integer.
 */
pub struct Unsigned<const LIMBS: usize> {
    val: UInt<LIMBS>,
}

impl<const LIMBS: usize> NumCiphertexts for Unsigned<LIMBS> {
    const NUM_CIPHERTEXTS: usize = 1;
}

impl<const LIMBS: usize> FheProgramInputTrait for Unsigned<LIMBS> {}
impl<const LIMBS: usize> FheType for Unsigned<LIMBS> {}
impl<const LIMBS: usize> BfvType for Unsigned<LIMBS> {}

impl<const LIMBS: usize> std::fmt::Display for Unsigned<LIMBS> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.val)
    }
}

impl<const LIMBS: usize> Default for Unsigned<LIMBS> {
    fn default() -> Self {
        Self::from(UInt::ZERO)
    }
}

impl<const LIMBS: usize> TryIntoPlaintext for Unsigned<LIMBS> {
    fn try_into_plaintext(
        &self,
        params: &Params,
    ) -> std::result::Result<Plaintext, sunscreen_runtime::Error> {
        let mut seal_plaintext = SealPlaintext::new()?;

        let sig_bits = self.val.bits_vartime();
        seal_plaintext.resize(sig_bits);

        for i in 0..sig_bits {
            let bit_value = self.val.bit_vartime(i);
            #[allow(clippy::unnecessary_cast)]
            seal_plaintext.set_coefficient(i, bit_value as u64);
        }

        Ok(Plaintext {
            data_type: self.type_name_instance(),
            inner: InnerPlaintext::Seal {
                value: vec![WithContext {
                    params: params.clone(),
                    data: seal_plaintext,
                }],
            },
        })
    }
}

impl<const LIMBS: usize> TryFromPlaintext for Unsigned<LIMBS> {
    fn try_from_plaintext(
        plaintext: &Plaintext,
        params: &Params,
    ) -> std::result::Result<Self, sunscreen_runtime::Error> {
        let val = match &plaintext.inner {
            InnerPlaintext::Seal { value: p } => {
                if p.len() != 1 {
                    return Err(sunscreen_runtime::Error::IncorrectCiphertextCount);
                }

                let bits = usize::min(std::mem::size_of::<UInt<LIMBS>>() * 8, p[0].len());

                let negative_cutoff = (params.plain_modulus + 1) / 2;

                let mut val = UInt::ZERO;
                for i in 0..bits {
                    let coeff = p[0].get_coefficient(i);
                    if coeff < negative_cutoff {
                        val = wrapping_add(
                            val,
                            wrapping_mul(UInt::from_u8(0x1) << i, UInt::from_u64(coeff)),
                        );
                    } else {
                        val = wrapping_sub(
                            val,
                            wrapping_mul(
                                UInt::from_u8(0x1) << i,
                                UInt::from_u64(params.plain_modulus - coeff),
                            ),
                        );
                    }
                }

                Self { val }
            }
        };

        Ok(val)
    }
}

impl<const LIMBS: usize> From<UInt<LIMBS>> for Unsigned<LIMBS> {
    fn from(val: UInt<LIMBS>) -> Self {
        Self { val }
    }
}

impl<const LIMBS: usize> From<u64> for Unsigned<LIMBS> {
    fn from(n: u64) -> Self {
        Self {
            val: UInt::from_u64(n),
        }
    }
}

impl<const LIMBS: usize> From<Unsigned<LIMBS>> for UInt<LIMBS> {
    fn from(unsigned: Unsigned<LIMBS>) -> Self {
        unsigned.val
    }
}

fn wrapping_add<const LIMBS: usize>(lhs: UInt<LIMBS>, rhs: UInt<LIMBS>) -> UInt<LIMBS> {
    (Wrapping(lhs) + Wrapping(rhs)).0
}
fn wrapping_mul<const LIMBS: usize>(lhs: UInt<LIMBS>, rhs: UInt<LIMBS>) -> UInt<LIMBS> {
    (Wrapping(lhs) * Wrapping(rhs)).0
}
fn wrapping_sub<const LIMBS: usize>(lhs: UInt<LIMBS>, rhs: UInt<LIMBS>) -> UInt<LIMBS> {
    (Wrapping(lhs) - Wrapping(rhs)).0
}

macro_rules! impl_std_op {
    ($($op:ident),+) => {
        $(
            paste! {
                impl<const LIMBS: usize> $op for Unsigned<LIMBS> {
                    type Output = Self;

                    fn [<$op:lower>](self, rhs: Unsigned<LIMBS>) -> Self::Output {
                        Self::Output {
                            val: self.val.[<wrapping_ $op:lower>](&rhs.val),
                        }
                    }
                }

                impl<const LIMBS: usize> $op<UInt<LIMBS>> for Unsigned<LIMBS> {
                    type Output = Self;

                    fn [<$op:lower>](self, rhs: UInt<LIMBS>) -> Self::Output {
                        Self {
                            val: self.val.[<wrapping_ $op:lower>](&rhs),
                        }
                    }
                }

                impl<const LIMBS: usize> $op<Unsigned<LIMBS>> for UInt<LIMBS> {
                    type Output = Unsigned<LIMBS>;

                    fn [<$op:lower>](self, rhs: Self::Output) -> Self::Output {
                        Self::Output {
                            val: self.[<wrapping_ $op:lower>](&rhs.val),
                        }
                    }
                }

                impl<const LIMBS: usize> $op<u64> for Unsigned<LIMBS> {
                    type Output = Self;

                    fn [<$op:lower>](self, rhs: u64) -> Self::Output {
                        Self {
                            val: self.val.[<wrapping_ $op:lower>](&UInt::from_u64(rhs)),
                        }
                    }
                }

                impl<const LIMBS: usize> $op<Unsigned<LIMBS>> for u64 {
                    type Output = Unsigned<LIMBS>;

                    fn [<$op:lower>](self, rhs: Self::Output) -> Self::Output {
                        Self::Output {
                            val: UInt::from_u64(self).[<wrapping_ $op:lower>](&rhs.val),
                        }
                    }
                }
            }
        )+
    };
}

impl_std_op! {
    Add, Sub, Mul
}

macro_rules! impl_graph_cipher_op {
    ($(($op:ident, $op_noun:ident)),+) => {
        $(
            paste! {
                impl<const LIMBS: usize> [<GraphCipher $op>] for Unsigned<LIMBS> {
                    type Left = Self;
                    type Right = Self;

                    fn [<graph_cipher_ $op:lower>](
                        a: FheProgramNode<Cipher<Self::Left>>,
                        b: FheProgramNode<Cipher<Self::Right>>,
                    ) -> FheProgramNode<Cipher<Self::Left>> {
                        with_fhe_ctx(|ctx| {
                            let n = ctx.[<add_ $op_noun>](a.ids[0], b.ids[0]);

                            FheProgramNode::new(&[n])
                        })
                    }
                }

                impl<const LIMBS: usize> [<GraphCipherPlain $op>] for Unsigned<LIMBS> {
                    type Left = Self;
                    type Right = Self;

                    fn [<graph_cipher_plain_ $op:lower>](
                        a: FheProgramNode<Cipher<Self::Left>>,
                        b: FheProgramNode<Self::Right>,
                    ) -> FheProgramNode<Cipher<Self::Left>> {
                        with_fhe_ctx(|ctx| {
                            let n = ctx.[<add_ $op_noun _plaintext>](a.ids[0], b.ids[0]);

                            FheProgramNode::new(&[n])
                        })
                    }
                }

                impl<const LIMBS: usize> [<GraphCipherConst $op>] for Unsigned<LIMBS> {
                    type Left = Self;
                    type Right = UInt<LIMBS>;

                    fn [<graph_cipher_const_ $op:lower>](
                        a: FheProgramNode<Cipher<Self::Left>>,
                        b: UInt<LIMBS>,
                    ) -> FheProgramNode<Cipher<Self::Left>> {
                        with_fhe_ctx(|ctx| {
                            let b = Self::from(b).try_into_plaintext(&ctx.data).unwrap();

                            let lit = ctx.add_plaintext_literal(b.inner);
                            let [<$op:lower>] = ctx.[<add_ $op_noun _plaintext>](a.ids[0], lit);

                            FheProgramNode::new(&[[<$op:lower>]])
                        })
                    }
                }
            }
        )+
    };
}

impl_graph_cipher_op! {
    (Add, addition),
    (Sub, subtraction),
    (Mul, multiplication)
}

impl<const LIMBS: usize> GraphConstCipherSub for Unsigned<LIMBS> {
    type Left = UInt<LIMBS>;
    type Right = Self;

    fn graph_const_cipher_sub(
        a: UInt<LIMBS>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Right>> {
        with_fhe_ctx(|ctx| {
            let a = Self::from(a).try_into_plaintext(&ctx.data).unwrap();

            let lit = ctx.add_plaintext_literal(a.inner);
            let n = ctx.add_subtraction_plaintext(b.ids[0], lit);
            let n = ctx.add_negate(n);

            FheProgramNode::new(&[n])
        })
    }
}

impl<const LIMBS: usize> GraphPlainCipherSub for Unsigned<LIMBS> {
    type Left = Self;
    type Right = Self;

    fn graph_plain_cipher_sub(
        a: FheProgramNode<Self::Left>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_fhe_ctx(|ctx| {
            let n = ctx.add_subtraction_plaintext(b.ids[0], a.ids[0]);
            let n = ctx.add_negate(n);

            FheProgramNode::new(&[n])
        })
    }
}

macro_rules! type_synonyms {
    ($($bits:expr),+) => {
        $(
            paste! {
                #[doc= concat!("Unsigned ", stringify!($bits), "-bit integer")]
                pub type [<Unsigned $bits>] = Unsigned<{nlimbs!($bits)}>;
            }
        )+
    };
}

type_synonyms! {
    64, 128, 256, 512
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_add_non_fhe() {
        let a = Unsigned256::from(5);
        let b = Unsigned256::from(10);

        assert_eq!(a + b, 15.into());
        assert_eq!(a + 10, 15.into());
        assert_eq!(10 + a, 15.into());
    }

    #[test]
    fn can_mul_non_fhe() {
        let a = Unsigned64::from(5);
        let b = Unsigned64::from(10);

        assert_eq!(a * b, 50.into());
        assert_eq!(a * 10, 50.into());
        assert_eq!(10 * a, 50.into());
    }

    #[test]
    fn can_sub_non_fhe() {
        let a = Unsigned128::from(5);
        let b = Unsigned128::from(11);

        assert_eq!(b - a, 6.into());
        assert_eq!(b - 5, 6.into());
    }
}
