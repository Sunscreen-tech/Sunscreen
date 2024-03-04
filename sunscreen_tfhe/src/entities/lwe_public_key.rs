use num::Zero;
use serde::{Deserialize, Serialize};

use crate::{
    dst::OverlaySize,
    ops::encryption::encode_and_encrypt_lwe_ciphertext,
    rand::{binary, normal_torus},
    LweDef, LweDimension, PlaintextBits, Torus, TorusOps,
};

use super::{
    LweCiphertext, LweCiphertextIterator, LweCiphertextIteratorMut, LweCiphertextRef,
    LweSecretKeyRef,
};

/// Randomness used to encrypt a message with a public key.
#[derive(Debug)]
pub struct TlwePublicEncRandomness<S: TorusOps> {
    /// The binary selectors of the encryptions of zero in the public key.
    pub r: Vec<S>,

    /// The gaussian noise added to make the LWE problem.
    pub e: LweCiphertext<S>,
}

dst! {
    /// An LWE public key.
    LwePublicKey,
    LwePublicKeyRef,
    Torus,
    (Clone, Debug, Serialize, Deserialize),
    (TorusOps)
}

impl<S> OverlaySize for LwePublicKeyRef<S>
where
    S: TorusOps,
{
    type Inputs = LweDimension;

    fn size(t: Self::Inputs) -> usize {
        LweCiphertextRef::<S>::size(t) * t.0
    }
}

impl<S> LwePublicKey<S>
where
    S: TorusOps,
{
    /// Generate an LWE public key from a given secret key. This is done by
    /// encrypting the LWE dimension number of zeros under the secret key, and
    /// then using the resulting ciphertext as the public key.
    pub fn generate(sk: &LweSecretKeyRef<S>, params: &LweDef) -> Self {
        params.assert_valid();
        sk.assert_valid(params);

        let mut pk = LwePublicKey {
            data: avec![Torus::zero(); LwePublicKeyRef::<S>::size(params.dim)],
        };
        let enc_zeros = pk.enc_zeros_mut(params);

        for z in enc_zeros {
            encode_and_encrypt_lwe_ciphertext(z, sk, <S as Zero>::zero(), params, PlaintextBits(1));
        }

        pk
    }
}

impl<S> LwePublicKeyRef<S>
where
    S: TorusOps,
{
    /// Get the public key data as an iterator.
    pub fn enc_zeros(&self, params: &LweDef) -> LweCiphertextIterator<S> {
        LweCiphertextIterator::new(&self.data, LweCiphertextRef::<S>::size(params.dim))
    }

    /// Get the public key data as a mutable iterator.
    pub fn enc_zeros_mut(&mut self, params: &LweDef) -> LweCiphertextIteratorMut<S> {
        LweCiphertextIteratorMut::new(&mut self.data, LweCiphertextRef::<S>::size(params.dim))
    }

    /// Encrypt a message as an LWE ciphertext using a public key, returning the
    /// encrypted message and the randomness used.
    pub fn encrypt(
        &self,
        msg: S,
        params: &LweDef,
        plaintext_bits: PlaintextBits,
    ) -> (LweCiphertext<S>, TlwePublicEncRandomness<S>) {
        params.assert_valid();
        self.assert_valid(params);
        assert!(plaintext_bits.0 < S::BITS);

        let msg = Torus::<S>::encode(msg, plaintext_bits);
        let lwe_dimension = params.dim.0;

        let mut acc = LweCiphertext::zero(params);
        let (acc_a, acc_b) = acc.a_b_mut(params);

        let mut r_noise = vec![];
        let mut e = LweCiphertext::zero(params);
        let (e_a, e_b) = e.a_b_mut(params);

        for z in self.enc_zeros(params) {
            let (a, b) = z.a_b(params);
            let r = binary::<S>();
            r_noise.push(r);

            for i in 0..lwe_dimension {
                acc_a[i] += a[i] * r;
            }

            *acc_b += *b * r;
        }

        for i in 0..lwe_dimension {
            let a_noise = normal_torus(params.std);
            e_a[i] = a_noise;
            acc_a[i] += a_noise;
        }

        *acc_b += msg;
        *e_b = normal_torus(params.std);
        *acc_b += *e_b;

        let noise = TlwePublicEncRandomness { r: r_noise, e };

        (acc, noise)
    }

    #[inline(always)]
    /// Assert this entity is valid under the given `lwe`.
    pub fn assert_valid(&self, lwe: &LweDef) {
        assert_eq!(Self::size(lwe.dim), self.data.len());
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        high_level::{encryption, keygen, TEST_LWE_DEF_1},
        PlaintextBits,
    };

    #[test]
    fn public_key_is_zeros() {
        let params = TEST_LWE_DEF_1;

        let sk = keygen::generate_binary_lwe_sk(&params);
        let pk = keygen::generate_lwe_pk(&sk, &params);

        for ct in pk.enc_zeros(&params) {
            let pt = encryption::decrypt_lwe(ct, &sk, &params, PlaintextBits(1));
            assert_eq!(pt, 0);
        }
    }

    #[test]
    fn can_public_key_encrypt() {
        let params = TEST_LWE_DEF_1;
        let bits = PlaintextBits(4);

        let sk = keygen::generate_binary_lwe_sk(&params);
        let pk = keygen::generate_lwe_pk(&sk, &params);

        let ct = encryption::encrypt_lwe(5, &pk, &params, bits);
        assert_eq!(encryption::decrypt_lwe(&ct, &sk, &params, bits), 5);
    }
}
