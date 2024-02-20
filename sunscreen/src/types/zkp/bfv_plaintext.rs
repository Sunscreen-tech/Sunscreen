use paste::paste;
use petgraph::prelude::NodeIndex;
use sunscreen_compiler_macros::TypeName;
use sunscreen_runtime::LinkWithZkp;
use sunscreen_zkp_backend::{BigInt, FieldSpec};

use crate::{
    invoke_gadget,
    types::{
        bfv::{Signed, Unsigned128, Unsigned64},
        zkp::ProgramNode,
    },
    zkp::{with_zkp_ctx, ZkpContextOps},
};

use super::{gadgets::SignedModulus, DynamicNumFieldElements, Field, ToNativeFields};

use crate as sunscreen;

/// A BFV plaintext polynomial with signed encoding that has been linked to a ZKP program.
///
/// Both our Signed and Unsigned bfv types use this encoding.
///
/// Here `N` is the degree of the _linked_ polynomial, which may be less than the full lattice
/// dimension. See [`Link::DEGREE_BOUND`](sunscreen_runtime::Link).
#[derive(Debug, Clone)]
struct BfvSignedEncoding<F: FieldSpec, const N: usize> {
    data: Vec<Field<F>>,
}

impl<F: FieldSpec, const N: usize> DynamicNumFieldElements for BfvSignedEncoding<F, N> {
    fn num_native_field_elements(plaintext_modulus: u64) -> usize {
        let log_p = plaintext_modulus.ilog2() + 1;
        log_p as usize * N
    }
}

impl<F: FieldSpec, const N: usize> ToNativeFields for BfvSignedEncoding<F, N> {
    fn to_native_fields(&self) -> Vec<BigInt> {
        self.data.iter().map(|x| x.val).collect()
    }
}

/// Decode into the field.
pub trait AsFieldElement<F: FieldSpec> {
    /// The output type of the decoding.
    type Output;

    /// Get the plaintext value as a field element.
    fn into_field_elem(self) -> Self::Output;
}

/// Constrain a fresh encoding.
pub trait ConstrainFresh {
    /// Bound on the coefficients in the encoding.
    const BOUND: usize;

    /// Constrain a fresh encoding to the specified bound.
    fn constrain_fresh_encoding(&self);
}

impl<const N: usize, F: FieldSpec> ProgramNode<BfvSignedEncoding<F, N>> {
    fn extract_coefficients(&self) -> Vec<NodeIndex> {
        let bound = self.ids.len() / N;
        let plain_modulus = 2u64.pow(bound as u32 - 1);

        let (plain_modulus, plain_modulus_1, two, mut coeffs) = with_zkp_ctx(|ctx| {
            let plain_modulus = ctx.add_constant(&BigInt::from(plain_modulus));
            let one = ctx.add_constant(&BigInt::from_u32(1));
            let two = ctx.add_constant(&BigInt::from_u32(2));
            let plain_modulus_1 = ctx.add_addition(plain_modulus, one);
            // Get coeffs via 2s complement construction
            let coeffs = self
                .ids
                .chunks(bound)
                .map(|xs| {
                    let mut c = ctx.add_constant(&BigInt::ZERO);
                    for (i, x) in xs.iter().enumerate() {
                        let pow = ctx.add_constant(&(BigInt::ONE << i));
                        let mul = ctx.add_multiplication(pow, *x);
                        if i == bound - 1 {
                            c = ctx.add_subtraction(c, mul);
                        } else {
                            c = ctx.add_addition(c, mul);
                        }
                    }
                    c
                })
                .collect::<Vec<_>>();
            (plain_modulus, plain_modulus_1, two, coeffs)
        });

        // Translate coefficients into field modulus
        let cutoff_divider = SignedModulus::new(F::FIELD_MODULUS, 1);
        let divider = SignedModulus::new(F::FIELD_MODULUS, 63);
        let neg_cutoff = invoke_gadget(cutoff_divider, &[plain_modulus_1, two])[0];
        for c in coeffs.iter_mut() {
            let is_negative = invoke_gadget(divider, &[*c, neg_cutoff])[0];
            *c = with_zkp_ctx(|ctx| {
                let shift = ctx.add_multiplication(plain_modulus, is_negative);
                ctx.add_subtraction(*c, shift)
            });
        }

        coeffs
    }
}

impl<const N: usize, F: FieldSpec> AsFieldElement<F> for ProgramNode<BfvSignedEncoding<F, N>> {
    type Output = ProgramNode<Field<F>>;

    fn into_field_elem(self) -> Self::Output {
        let coeffs = self.extract_coefficients();

        ProgramNode::new(&[with_zkp_ctx(|ctx| {
            // Get signed value by decoding according to Signed implementation.
            let mut x = ctx.add_constant(&BigInt::ZERO);
            for (i, c) in coeffs.iter().enumerate() {
                let pow = ctx.add_constant(&(BigInt::ONE << i));
                let mul = ctx.add_multiplication(pow, *c);
                x = ctx.add_addition(x, mul);
            }
            x
        })])
    }
}

impl<const N: usize, F: FieldSpec> ConstrainFresh for ProgramNode<BfvSignedEncoding<F, N>> {
    const BOUND: usize = 1;

    fn constrain_fresh_encoding(&self) {
        let coeffs = self.extract_coefficients();
        todo!()
    }
}

/// A [BFV signed integer](Signed) that has been linked to a ZKP program.
///
/// Use the [`AsFieldElement::into_field_elem`] method to decode the value into a field
/// element within a ZKP program.
#[derive(Debug, Clone, TypeName)]
pub struct BfvSigned<F: FieldSpec>(BfvSignedEncoding<F, { <Signed as LinkWithZkp>::DEGREE_BOUND }>);

/// A [BFV unsigned 64-bit integer](Unsigned64) that has been linked to a ZKP program.
///
/// Use the [`AsFieldElement::into_field_elem`] method to decode the value into a field
/// element within a ZKP program.
#[derive(Debug, Clone, TypeName)]
pub struct BfvUnsigned64<F: FieldSpec>(
    BfvSignedEncoding<F, { <Unsigned64 as LinkWithZkp>::DEGREE_BOUND }>,
);

/// A [BFV unsigned 128-bit integer](Unsigned128) that has been linked to a ZKP program.
///
/// Use the [`AsFieldElement::into_field_elem`] method to decode the value into a field
/// element within a ZKP program.
#[derive(Debug, Clone, TypeName)]
pub struct BfvUnsigned128<F: FieldSpec>(
    BfvSignedEncoding<F, { <Unsigned128 as LinkWithZkp>::DEGREE_BOUND }>,
);

/// A [BFV rational](crate::types::bfv::Rational) that has been linked to a ZKP program.
///
/// Use the [`AsFieldElement::into_field_elem`] method to decode the numerator and denominator into
/// field elements within a ZKP program.
#[derive(Debug, Clone, TypeName)]
pub struct BfvRational<F: FieldSpec>(BfvSigned<F>, BfvSigned<F>);

macro_rules! impl_linked_zkp_type {
    ($($int_type:ident),+) => {
        $(
            paste! {
                impl<F: FieldSpec> DynamicNumFieldElements for [<Bfv $int_type>]<F> {
                    fn num_native_field_elements(plaintext_modulus: u64) -> usize {
                        <BfvSignedEncoding<F, { <$int_type as LinkWithZkp>::DEGREE_BOUND }> as DynamicNumFieldElements>::
                            num_native_field_elements(plaintext_modulus)
                    }
                }

                impl<F: FieldSpec> ToNativeFields for [<Bfv $int_type>]<F> {
                    fn to_native_fields(&self) -> Vec<BigInt> {
                        self.0.to_native_fields()
                    }
                }

                impl<F: FieldSpec> AsFieldElement<F> for ProgramNode<[<Bfv $int_type>]<F>> {
                    type Output = ProgramNode<Field<F>>;

                    fn into_field_elem(self) -> Self::Output {
                        let cast: ProgramNode<BfvSignedEncoding<F, { <$int_type as LinkWithZkp>::DEGREE_BOUND }>> =
                            ProgramNode::new(&self.ids);
                        cast.into_field_elem()
                    }
                }
            }
        )+
    };
}

impl_linked_zkp_type! {
    Signed, Unsigned64, Unsigned128
}

impl<F: FieldSpec> DynamicNumFieldElements for BfvRational<F> {
    fn num_native_field_elements(plaintext_modulus: u64) -> usize {
        2 * BfvSigned::<F>::num_native_field_elements(plaintext_modulus)
    }
}

impl<F: FieldSpec> ToNativeFields for BfvRational<F> {
    fn to_native_fields(&self) -> Vec<BigInt> {
        [self.0.to_native_fields(), self.1.to_native_fields()].concat()
    }
}

impl<F: FieldSpec> AsFieldElement<F> for ProgramNode<BfvRational<F>> {
    type Output = (ProgramNode<Field<F>>, ProgramNode<Field<F>>);

    fn into_field_elem(self) -> Self::Output {
        let len = self.ids.len() / 2;
        let num: ProgramNode<BfvSigned<F>> = ProgramNode::new(&self.ids[..len]);
        let den: ProgramNode<BfvSigned<F>> = ProgramNode::new(&self.ids[len..]);
        (num.into_field_elem(), den.into_field_elem())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use sunscreen_runtime::ZkpRuntime;
    use sunscreen_zkp_backend::bulletproofs::BulletproofsBackend;
    use sunscreen_zkp_backend::FieldSpec;

    use crate::types::zkp::{BulletproofsField, Field};
    use crate::{self as sunscreen, Compiler, PlainModulusConstraint};
    use crate::{fhe_program, zkp_program};

    #[zkp_program]
    fn is_eq<F: FieldSpec>(#[linked] x: BfvSigned<F>, #[public] y: Field<F>) {
        x.into_field_elem().constrain_eq(y);
    }

    #[fhe_program(scheme = "bfv")]
    fn doggie() {}

    #[test]
    #[ignore = "currently unsupported"]
    fn can_decode_signed_for_arbitrary_plain_moduli() {
        test_plain_modulus(4095);
        test_plain_modulus(4097);
        test_plain_modulus(1153);
    }

    #[test]
    fn can_decode_signed_for_powers_of_two_moduli() {
        test_plain_modulus(1024);
        test_plain_modulus(4096);
        test_plain_modulus(262_144); // default in compiler.rs
    }

    #[test]
    fn can_decode_signed_with_coefficients_near_cutoff() {
        let plain_modulus = 1024_u64;
        let is_eq_zkp = Compiler::new()
            .fhe_program(doggie)
            .plain_modulus_constraint(PlainModulusConstraint::Raw(1024))
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(is_eq)
            .compile()
            .unwrap()
            .take_zkp_program(is_eq)
            .unwrap();

        let runtime = ZkpRuntime::new(BulletproofsBackend::new()).unwrap();

        let log_p = plain_modulus.ilog2() as usize + 1;

        for (coeff, equiv) in [(511, 511), (512, -512), (513, -511)] {
            let mut signed_encoding = [0; <Signed as LinkWithZkp>::DEGREE_BOUND];
            signed_encoding[0] = coeff;

            let coeffs = signed_encoding.map(|c| {
                let mut bits = vec![0; log_p];
                for (i, b) in bits.iter_mut().enumerate() {
                    let bit = (c & (0x1 << i)) >> i;
                    *b = bit;
                }
                bits
            });

            let encoded = BfvSigned(BfvSignedEncoding {
                data: coeffs
                    .into_iter()
                    .flat_map(|c| c.into_iter().map(BulletproofsField::from))
                    .collect(),
            });

            let proof = runtime
                .proof_builder(&is_eq_zkp)
                .private_input(encoded)
                .public_input(BulletproofsField::from(equiv))
                .prove()
                .unwrap();

            runtime
                .verification_builder(&is_eq_zkp)
                .proof(&proof)
                .public_input(BulletproofsField::from(equiv))
                .verify()
                .unwrap();
        }
    }

    fn test_plain_modulus(plain_modulus: u64) {
        let is_eq_zkp = Compiler::new()
            .fhe_program(doggie)
            .plain_modulus_constraint(PlainModulusConstraint::Raw(plain_modulus))
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(is_eq)
            .compile()
            .unwrap()
            .take_zkp_program(is_eq)
            .unwrap();

        let runtime = ZkpRuntime::new(BulletproofsBackend::new()).unwrap();

        let log_p = plain_modulus.ilog2() as usize + 1;

        for val in [3i64, -3] {
            // Simulate the polynomial signed encoding
            let mut signed_encoding = [0; <Signed as LinkWithZkp>::DEGREE_BOUND];
            let abs_val = val.unsigned_abs();
            for (i, c) in signed_encoding.iter_mut().take(64).enumerate() {
                let bit = (abs_val & 0x1 << i) >> i;
                *c = if val.is_negative() {
                    bit * (plain_modulus - bit)
                } else {
                    bit
                };
            }

            // Now further break down each coeff into 2s complement
            // Note that these numbers will virtually always be positive in the Zq context, for all but
            // pathological plaintext moduli.
            let coeffs = signed_encoding.map(|c| {
                let mut bits = vec![0; log_p];
                for (i, b) in bits.iter_mut().enumerate() {
                    let bit = (c & (0x1 << i)) >> i;
                    *b = bit;
                }
                bits
            });

            let encoded = BfvSigned(BfvSignedEncoding {
                data: coeffs
                    .into_iter()
                    .flat_map(|c| c.into_iter().map(BulletproofsField::from))
                    .collect(),
            });

            let proof = runtime
                .proof_builder(&is_eq_zkp)
                .private_input(encoded)
                .public_input(BulletproofsField::from(val))
                .prove()
                .unwrap();

            runtime
                .verification_builder(&is_eq_zkp)
                .proof(&proof)
                .public_input(BulletproofsField::from(val))
                .verify()
                .unwrap();
        }
    }
}
