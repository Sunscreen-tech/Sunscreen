use num::Zero;
use serde::{Deserialize, Serialize};

use crate::{
    dst::{NoWrapper, OverlaySize},
    macros::{impl_binary_op, impl_unary_op},
    ops::encryption::encode_and_encrypt_lwe_ciphertext,
    rand::{binary, uniform_torus},
    LweDef, LweDimension, PlaintextBits, Torus, TorusOps,
};

use super::{LweCiphertext, LweCiphertextRef};

dst! {
    /// An LWE secret key.
    LweSecretKey,
    LweSecretKeyRef,
    NoWrapper,
    (Clone, Debug, Serialize, Deserialize),
    ()
}

impl_binary_op!(Add, LweSecretKey, (TorusOps,));
impl_binary_op!(Sub, LweSecretKey, (TorusOps,));
impl_unary_op!(Neg, LweSecretKey);

impl<S> OverlaySize for LweSecretKeyRef<S>
where
    S: TorusOps,
{
    type Inputs = LweDimension;

    fn size(t: Self::Inputs) -> usize {
        t.0
    }
}

impl<S> LweSecretKey<S>
where
    S: TorusOps,
{
    fn generate(params: &LweDef, torus_element_generator: fn() -> S) -> Self {
        let len = LweSecretKeyRef::<S>::size(params.dim);

        LweSecretKey {
            data: avec_from_iter!((0..len).map(|_| torus_element_generator())),
        }
    }

    /// Generate a random binary LWE secret key
    pub fn generate_binary(params: &LweDef) -> Self {
        Self::generate(params, binary)
    }

    /// Generate a secret key with uniformly random coefficients.  This can be
    /// used when performing threshold decryption, which needs random secret
    /// keys that are uniform over the entire ciphertext modulus.  Uniform
    /// secret keys are also valid keys for encryption/decryption but are not
    /// widely used.
    pub fn generate_uniform(params: &LweDef) -> Self {
        Self::generate(params, || uniform_torus::<S>().inner())
    }
}

impl<S> LweSecretKeyRef<S>
where
    S: TorusOps,
{
    /// Create an LWE ciphertext from a given message with a private key. The
    /// message should be in the plaintext space, and will be encoded onto the
    /// Torus automatically.
    pub fn encrypt(
        &self,
        msg: S,
        params: &LweDef,
        plaintext_bits: PlaintextBits,
    ) -> (LweCiphertext<S>, Torus<S>) {
        params.assert_valid();
        assert!(plaintext_bits.0 < S::BITS);

        let mut ct = LweCiphertext::<S>::zero(params);

        let e = encode_and_encrypt_lwe_ciphertext(&mut ct, self, msg, params, plaintext_bits);

        (ct, e)
    }

    /// Decrypts the given ciphertext, returning the message. The message will
    /// not be decoded into the plaintext space; the caller is responsible for
    /// performing operations like shifting by delta and rounding. See
    /// [Self::decrypt] for a function that performs the decoding automatically.
    pub fn decrypt_without_decode(&self, ct: &LweCiphertextRef<S>, params: &LweDef) -> Torus<S> {
        params.assert_valid();
        ct.assert_valid(params);

        let (a, b) = ct.a_b(params);

        let mut dot = Torus::<S>::zero();

        for (a_i, d_i) in a.iter().zip(self.data.iter()) {
            dot += a_i * d_i
        }

        b - dot
    }

    /// Decrypts and decodes a ciphertext, returning the message. The message
    /// will be decoded into the plaintext space. See
    /// [Self::decrypt_without_decode] for a function that does not perform the
    /// decoding.
    pub fn decrypt(
        &self,
        ct: &LweCiphertextRef<S>,
        params: &LweDef,
        plaintext_bits: PlaintextBits,
    ) -> S {
        params.assert_valid();
        assert!(plaintext_bits.0 < S::BITS);
        ct.assert_valid(params);

        let msg = self.decrypt_without_decode(ct, params);

        msg.decode(plaintext_bits)
    }

    /// Asserts that a given secret key is valid for a given LWE dimension.
    pub fn assert_valid(&self, params: &LweDef) {
        assert_eq!(
            self.as_slice().len(),
            LweSecretKeyRef::<S>::size(params.dim)
        );
    }
}

impl<S> LweSecretKeyRef<S>
where
    S: TorusOps,
{
    /// Returns the secret key data as a slice.
    pub fn s(&self) -> &[S] {
        &self.data
    }
}

#[cfg(test)]
mod tests {
    use crate::high_level::*;
    use num::traits::{WrappingAdd, WrappingNeg, WrappingSub};

    // Addition

    #[test]
    fn add_secret_keys() {
        let params = &TEST_LWE_DEF_1;

        let sk = keygen::generate_uniform_lwe_sk(params);
        let sk2 = keygen::generate_uniform_lwe_sk(params);

        let sk3_expected = sk
            .s()
            .iter()
            .zip(sk2.s().iter())
            .map(|(a, b)| a.wrapping_add(b))
            .collect::<Vec<_>>();

        let sk3 = sk + sk2;

        assert_eq!(sk3_expected, sk3.s())
    }

    #[test]
    fn add_assign_secret_keys() {
        let params = &TEST_LWE_DEF_1;

        let sk = keygen::generate_uniform_lwe_sk(params);
        let mut sk2 = keygen::generate_uniform_lwe_sk(params);

        let sk2_expected = sk
            .s()
            .iter()
            .zip(sk2.s().iter())
            .map(|(a, b)| a.wrapping_add(b))
            .collect::<Vec<_>>();

        sk2 += sk;

        assert_eq!(sk2_expected, sk2.s())
    }

    #[test]
    fn add_secret_key_refs() {
        let params = &TEST_LWE_DEF_1;

        let sk = keygen::generate_uniform_lwe_sk(params);
        let sk2 = keygen::generate_uniform_lwe_sk(params);

        let sk3_expected = sk
            .s()
            .iter()
            .zip(sk2.s().iter())
            .map(|(a, b)| a.wrapping_add(b))
            .collect::<Vec<_>>();

        let sk3 = sk.as_ref() + sk2.as_ref();

        assert_eq!(sk3_expected, sk3.s())
    }

    #[test]
    fn wrapping_add_secret_keys() {
        let params = &TEST_LWE_DEF_1;

        let sk = keygen::generate_uniform_lwe_sk(params);
        let sk2 = keygen::generate_uniform_lwe_sk(params);

        let sk3_expected = sk
            .s()
            .iter()
            .zip(sk2.s().iter())
            .map(|(a, b)| a.wrapping_add(b))
            .collect::<Vec<_>>();

        let sk3 = sk.wrapping_add(&sk2);

        assert_eq!(sk3_expected, sk3.s())
    }

    // Subtraction

    #[test]
    fn sub_secret_keys() {
        let params = &TEST_LWE_DEF_1;

        let sk = keygen::generate_uniform_lwe_sk(params);
        let sk2 = keygen::generate_uniform_lwe_sk(params);

        let sk3_expected = sk
            .s()
            .iter()
            .zip(sk2.s().iter())
            .map(|(a, b)| a.wrapping_sub(b))
            .collect::<Vec<_>>();

        let sk3 = sk - sk2;

        assert_eq!(sk3_expected, sk3.s())
    }

    #[test]
    fn sub_assign_secret_keys() {
        let params = &TEST_LWE_DEF_1;

        let sk = keygen::generate_uniform_lwe_sk(params);
        let mut sk2 = keygen::generate_uniform_lwe_sk(params);

        let sk2_expected = sk2
            .s()
            .iter()
            .zip(sk.s().iter())
            .map(|(a, b)| a.wrapping_sub(b))
            .collect::<Vec<_>>();

        sk2 -= sk;

        assert_eq!(sk2_expected, sk2.s())
    }

    #[test]
    fn sub_secret_key_refs() {
        let params = &TEST_LWE_DEF_1;

        let sk = keygen::generate_uniform_lwe_sk(params);
        let sk2 = keygen::generate_uniform_lwe_sk(params);

        let sk3_expected = sk
            .s()
            .iter()
            .zip(sk2.s().iter())
            .map(|(a, b)| a.wrapping_sub(b))
            .collect::<Vec<_>>();

        let sk3 = sk.as_ref() - sk2.as_ref();

        assert_eq!(sk3_expected, sk3.s())
    }

    #[test]
    fn wrapping_sub_secret_keys() {
        let params = &TEST_LWE_DEF_1;

        let sk = keygen::generate_uniform_lwe_sk(params);
        let sk2 = keygen::generate_uniform_lwe_sk(params);

        let sk3_expected = sk
            .s()
            .iter()
            .zip(sk2.s().iter())
            .map(|(a, b)| a.wrapping_sub(b))
            .collect::<Vec<_>>();

        let sk3 = sk.wrapping_sub(&sk2);

        assert_eq!(sk3_expected, sk3.s())
    }

    // Negation

    #[test]
    fn neg_secret_key() {
        let params = &TEST_LWE_DEF_1;

        let sk = keygen::generate_uniform_lwe_sk(params);

        let sk2_expected = sk.s().iter().map(|a| a.wrapping_neg()).collect::<Vec<_>>();
        let sk2 = -sk;

        assert_eq!(sk2_expected, sk2.s())
    }

    #[test]
    fn neg_secret_key_ref() {
        let params = &TEST_LWE_DEF_1;

        let sk = keygen::generate_uniform_lwe_sk(params);

        let sk2_expected = sk.s().iter().map(|a| a.wrapping_neg()).collect::<Vec<_>>();
        let sk2 = -sk.as_ref();

        assert_eq!(sk2_expected, sk2.s())
    }

    #[test]
    fn wrapping_neg_secret_key() {
        let params = &TEST_LWE_DEF_1;

        let sk = keygen::generate_uniform_lwe_sk(params);

        let sk2_expected = sk.s().iter().map(|a| a.wrapping_neg()).collect::<Vec<_>>();
        let sk2 = sk.wrapping_neg();

        assert_eq!(sk2_expected, sk2.s())
    }
}
