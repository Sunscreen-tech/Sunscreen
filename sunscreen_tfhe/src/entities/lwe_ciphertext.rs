use num::Zero;
use serde::{Deserialize, Serialize};

use crate::{
    dst::OverlaySize,
    macros::{impl_binary_op, impl_unary_op},
    LweDef, LweDimension, Torus, TorusOps,
};

dst! {
    /// An LWE ciphertext.
    LweCiphertext,
    LweCiphertextRef,
    Torus,
    (Clone, Debug,Serialize, Deserialize),
    (TorusOps)
}
dst_iter! { LweCiphertextIterator, LweCiphertextIteratorMut, ParallelLweCiphertextIterator, ParallelLweCiphertextIteratorMut, Torus, LweCiphertextRef, (TorusOps,) }

impl_binary_op!(Add, LweCiphertext, (TorusOps,));
impl_binary_op!(Sub, LweCiphertext, (TorusOps,));
impl_unary_op!(Neg, LweCiphertext);

impl<S> OverlaySize for LweCiphertextRef<S>
where
    S: TorusOps,
{
    type Inputs = LweDimension;

    fn size(t: Self::Inputs) -> usize {
        t.0 + 1
    }
}

impl<S: TorusOps> LweCiphertext<S> {
    /// Create a new LWE ciphertext with all coefficients set to zero.
    pub fn new(params: &LweDef) -> Self {
        Self::zero(params)
    }

    /// Create a new LWE ciphertext with all coefficients set to zero.
    pub fn zero(params: &LweDef) -> Self {
        let data = avec![Torus::zero(); LweCiphertextRef::<S>::size(params.dim)];

        Self { data }
    }
}

impl<S: TorusOps> LweCiphertextRef<S> {
    fn split_at_idx(&self, params: &LweDef) -> usize {
        params.dim.0
    }

    /// Returns a reference to the mask A and body B in an LWE ciphertext.
    pub fn a_b(&self, params: &LweDef) -> (&[Torus<S>], &Torus<S>) {
        let (a, b) = self.data.split_at(self.split_at_idx(params));

        (a, &b[0])
    }

    /// Returns a reference to the mask A in an LWE ciphertext.
    pub fn a(&self, params: &LweDef) -> &[Torus<S>] {
        let (a, _) = self.a_b(params);

        a
    }

    /// Returns a reference to the body B in an LWE ciphertext.
    pub fn b(&self, params: &LweDef) -> &Torus<S> {
        let (_, b) = self.a_b(params);

        b
    }

    /// Returns a mutable reference to the mask A and body B in an LWE ciphertext.
    pub fn a_b_mut(&mut self, params: &LweDef) -> (&mut [Torus<S>], &mut Torus<S>) {
        let (a, b) = self.data.split_at_mut(self.split_at_idx(params));

        (a, &mut b[0])
    }

    /// Returns a mutable reference to the mask A in an LWE ciphertext.
    pub fn a_mut(&mut self, params: &LweDef) -> &mut [Torus<S>] {
        let (a, _) = self.a_b_mut(params);

        a
    }

    /// Returns a mutable reference to the body B in an LWE ciphertext.
    pub fn b_mut(&mut self, params: &LweDef) -> &mut Torus<S> {
        let (_, b) = self.a_b_mut(params);

        b
    }

    /// Asserts that the LWE ciphertext is valid for a given LWE dimension.
    #[inline(always)]
    pub fn assert_valid(&self, params: &LweDef) {
        assert_eq!(
            self.as_slice().len(),
            LweCiphertextRef::<S>::size(params.dim)
        );
    }
}

#[cfg(test)]
mod tests {
    use crate::{high_level::*, PlaintextBits, LWE_512_80};
    use proptest::prelude::*;

    // Test that the negation of a ciphertext is the same as the negation of the
    // plaintext.
    proptest! {
    #[test]
    fn negation_homomorphism(a in any::<u64>()) {
        let bits = PlaintextBits(4);

        let params = LWE_512_80;

        let sk = keygen::generate_binary_lwe_sk(&params);
        let a_enc = encryption::encrypt_lwe_secret(a, &sk, &params, bits);

        let a_enc_neg = -a_enc;

        prop_assert_eq!(encryption::decrypt_lwe(&a_enc_neg, &sk, &params, bits), a.wrapping_neg() % (0x1 << bits.0 as u64));
    }
    }

    // Test that the addition of ciphertexts is the same as the addition of the
    // plaintexts.
    proptest! {
    #[test]
    fn additive_homomorphism(a in any::<u64>(), b in any::<u64>()) {
        let params = LWE_512_80;
        let sk = keygen::generate_binary_lwe_sk(&params);

        let bits = PlaintextBits(4);

        let a_enc = encryption::encrypt_lwe_secret(a, &sk, &params, bits);
        let b_enc = encryption::encrypt_lwe_secret(b, &sk, &params, bits);

        let c_enc = a_enc + b_enc;

        prop_assert_eq!(encryption::decrypt_lwe(&c_enc, &sk, &params, bits), a.wrapping_add(b) % (0x1 << bits.0 as u64));
    }
    }

    // Test that the subtraction of ciphertexts is the same as the subtraction
    // of the plaintexts.
    proptest! {
    #[test]
    fn subtraction_homomorphism(a in any::<u64>(), b in any::<u64>()) {
        let params = LWE_512_80;
        let sk = keygen::generate_binary_lwe_sk(&params);

        let bits = PlaintextBits(4);

        let a_enc = encryption::encrypt_lwe_secret(a, &sk, &params, bits);
        let b_enc = encryption::encrypt_lwe_secret(b, &sk, &params, bits);

        let c_enc = a_enc - b_enc;

        prop_assert_eq!(encryption::decrypt_lwe(&c_enc, &sk, &params, bits), a.wrapping_sub(b) % (0x1 << bits.0 as u64));
    }
    }

    // Testing that the addition of a ciphertext and a negated ciphertext is the
    // same as the subtraction of the ciphertexts.
    proptest! {
    #[test]
    fn add_negative_is_subtraction(a in any::<u64>(), b in any::<u64>()) {
        let params = LWE_512_80;
        let sk = keygen::generate_binary_lwe_sk(&params);

        let bits = PlaintextBits(4);

        let a_enc = encryption::encrypt_lwe_secret(a, &sk, &params, bits);
        let b_enc = encryption::encrypt_lwe_secret(b, &sk, &params, bits);

        let c_enc_by_add_neg = a_enc.as_ref() + (-(b_enc.as_ref())).as_ref();
        let c_enc_by_sub = a_enc.as_ref() - b_enc.as_ref();

        // Test that the a values are the same
        for (a_enc_by_add_neg_i, a_enc_by_sub_i) in c_enc_by_add_neg.a(&params).iter().zip(c_enc_by_sub.a(&params).iter()) {
            assert_eq!(a_enc_by_add_neg_i, a_enc_by_sub_i);
        }

        // Test that the b values are the same
        assert_eq!(c_enc_by_add_neg.b(&params), c_enc_by_sub.b(&params));
    }
    }
}
