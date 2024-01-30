use sunscreen_compiler_macros::TypeName;
use sunscreen_runtime::ShareWithZKP;
use sunscreen_zkp_backend::{BigInt, FieldSpec};

use crate::{
    invoke_gadget,
    types::{bfv::Signed, zkp::ProgramNode},
    zkp::{with_zkp_ctx, ZkpContextOps},
};

use super::{gadgets::SignedModulus, DynamicNumFieldElements, Field, ToNativeFields};

use crate as sunscreen;

/// A BFV plaintext polynomial that has been shared to a ZKP program.
///
/// Note that `C` represents the size of the 2s complement decomposition of each coefficient in the
/// polynomial. This is unfortunately plaintext modulus dependent, and can be calculated by
/// `plaintext_modulus.ilog2() + 1`.
///
/// Similarly `N` is the degree of the _shared_ polynomial, which may be less than the full lattice
/// dimension. See [`Share::DEGREE_BOUND`](sunscreen_runtime::Share).
//
// TODO shit if we only have a dynamic len it might not be possible to determine the exact
// plaintext modulus. We'll have the log_p but that's not distinct to each p. Unless we restrict to
// powers of 2
#[derive(Debug, Clone, TypeName)]
struct BfvPlaintext<F: FieldSpec, const N: usize> {
    data: Vec<Field<F>>,
}

impl<F: FieldSpec, const N: usize> DynamicNumFieldElements for BfvPlaintext<F, N> {
    fn num_native_field_elements(plaintext_modulus: u64) -> usize {
        // TODO ascertain the correct bound for all moduli. I think this is it but I'm not sure.
        // Add a test with odd moduli
        // it might be this instead?
        // let log_p = (plaintext_modulus as f64).log2().ceil() as usize + 1;
        let log_p = plaintext_modulus.ilog2() + 1;
        log_p as usize * N
    }
}

impl<F: FieldSpec, const N: usize> ToNativeFields for BfvPlaintext<F, N> {
    fn to_native_fields(&self) -> Vec<BigInt> {
        self.data.iter().map(|x| x.val).collect()
    }
}

#[derive(Debug, Clone, TypeName)]
/// A [BFV signed integer](crate::types::bfv::Signed) that has been shared to a ZKP program.
pub struct BfvSigned<F: FieldSpec>(BfvPlaintext<F, { <Signed as ShareWithZKP>::DEGREE_BOUND }>);

impl<F: FieldSpec> DynamicNumFieldElements for BfvSigned<F> {
    fn num_native_field_elements(plaintext_modulus: u64) -> usize {
        <BfvPlaintext<F, { <Signed as ShareWithZKP>::DEGREE_BOUND }> as DynamicNumFieldElements>::
            num_native_field_elements(plaintext_modulus)
    }
}

impl<F: FieldSpec> ToNativeFields for BfvSigned<F> {
    fn to_native_fields(&self) -> Vec<BigInt> {
        self.0.to_native_fields()
    }
}

/// Decode the underlying plaintext polynomial into the field.
pub trait AsFieldElement<F: FieldSpec> {
    /**
     * Return a structure scaled by `x`.
     */
    fn into_field_elem(self) -> ProgramNode<Field<F>>;
}

impl<F: FieldSpec> AsFieldElement<F> for ProgramNode<BfvSigned<F>> {
    fn into_field_elem(self) -> ProgramNode<Field<F>> {
        let bound = self.ids.len() / <Signed as ShareWithZKP>::DEGREE_BOUND;
        let plain_modulus = 2u64.pow(bound as u32 - 1);
        let (plain_modulus, two, mut coeffs) = with_zkp_ctx(|ctx| {
            let plain_modulus = ctx.add_constant(&BigInt::from(plain_modulus));
            let two = ctx.add_constant(&BigInt::from_u32(2));
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
            (plain_modulus, two, coeffs)
        });

        // Translate coefficients into field modulus
        let cutoff_divider = SignedModulus::new(F::FIELD_MODULUS, 1);
        let divider = SignedModulus::new(F::FIELD_MODULUS, 63);
        // TODO make sure this is correct, might need +1 somewhere to match the signed encoding;
        // Add a test with odd plaintext modulus.
        let neg_cutoff = invoke_gadget(cutoff_divider, &[plain_modulus, two])[0];
        for c in coeffs.iter_mut() {
            let is_negative = invoke_gadget(divider, &[*c, neg_cutoff])[0];
            *c = with_zkp_ctx(|ctx| {
                let shift = ctx.add_multiplication(plain_modulus, is_negative);
                ctx.add_subtraction(*c, shift)
            });
        }

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
    fn is_eq<F: FieldSpec>(#[shared] x: BfvSigned<F>, #[public] y: Field<F>) {
        x.into_field_elem().constrain_eq(y);
    }

    #[fhe_program(scheme = "bfv")]
    fn doggie() {}

    #[test]
    fn can_decode_signed_properly() {
        let plain_modulus = 4096_u64;
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

        const LOG_P: usize = 13; // i.e. `plain_modulus.ilog2() + 1`

        for val in [3i64, -3] {
            // Simulate the polynomial signed encoding
            let mut signed_encoding = [0; 128];
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
                let mut bits = [0; LOG_P];
                for (i, b) in bits.iter_mut().enumerate() {
                    let bit = (c & (0x1 << i)) >> i;
                    *b = bit;
                }
                bits
            });

            let encoded = BfvSigned(BfvPlaintext {
                data: coeffs
                    .iter()
                    .flat_map(|c| c.map(BulletproofsField::from))
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
