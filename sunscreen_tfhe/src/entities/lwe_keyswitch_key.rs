use num::Zero;
use serde::{Deserialize, Serialize};

use crate::{
    dst::OverlaySize, LweDef, LweDimension, RadixCount, RadixDecomposition, Torus, TorusOps,
};

use super::{LevCiphertextIterator, LevCiphertextIteratorMut, LevCiphertextRef};

dst! {
    /// A LWE keyswitch key used to switch a ciphertext from one key to another.
    /// See [`module`](crate::ops::keyswitch) documentation for more details.
    LweKeyswitchKey,
    LweKeyswitchKeyRef,
    Torus,
    (Clone, Debug, Serialize, Deserialize),
    (TorusOps,)
}

impl<S> OverlaySize for LweKeyswitchKeyRef<S>
where
    S: TorusOps,
{
    // Old LWE dimension, new LWE dimension, radix count
    type Inputs = (LweDimension, LweDimension, RadixCount);

    fn size(t: Self::Inputs) -> usize {
        // Number of rows should be equal to the number of elements in the original key
        let num_rows = t.0 .0;

        // Each row is made up of encryptions under the new key
        let len_row = LevCiphertextRef::<S>::size((t.1, t.2));

        // Encrypt the secret key s_i in each row
        len_row * (num_rows)
    }
}

impl<S> LweKeyswitchKey<S>
where
    S: TorusOps,
{
    /// Creates a new LWE keyswitch key. This enables switching to a new key as
    /// well as switching from the `original_params` that define the first key
    /// to the `new_params` that define the second key.
    pub fn new(original_params: &LweDef, new_params: &LweDef, radix: &RadixDecomposition) -> Self {
        let elems =
            LweKeyswitchKeyRef::<S>::size((original_params.dim, new_params.dim, radix.count));

        Self {
            data: vec![Torus::zero(); elems],
        }
    }
}

impl<S> LweKeyswitchKeyRef<S>
where
    S: TorusOps,
{
    /// Returns an iterator over the rows of the LWE keyswitch key, which are
    /// [`LevCiphertext`](crate::entities::LevCiphertext)s.
    pub fn rows(
        &self,
        new_params: &LweDef,
        radix: &RadixDecomposition,
    ) -> LevCiphertextIterator<S> {
        let stride = LevCiphertextRef::<S>::size((new_params.dim, radix.count));

        LevCiphertextIterator::new(&self.data, stride)
    }

    /// Returns a mutable iterator over the rows of the LWE keyswitch key, which are
    /// [`LevCiphertext`](crate::entities::LevCiphertext)s.
    pub fn rows_mut(
        &mut self,
        new_params: &LweDef,
        radix: &RadixDecomposition,
    ) -> LevCiphertextIteratorMut<S> {
        let stride = LevCiphertextRef::<S>::size((new_params.dim, radix.count));

        LevCiphertextIteratorMut::new(&mut self.data, stride)
    }

    /// Asserts that the keyswitch key is valid for the given parameters.
    #[inline(always)]
    pub(crate) fn assert_valid(
        &self,
        original_params: &LweDef,
        new_params: &LweDef,
        radix: &RadixDecomposition,
    ) {
        assert_eq!(
            self.as_slice().len(),
            LweKeyswitchKeyRef::<S>::size((original_params.dim, new_params.dim, radix.count))
        );
    }
}

#[cfg(test)]
mod tests {

    use rand::{thread_rng, RngCore};

    use crate::{
        entities::{LweCiphertext, LweKeyswitchKey},
        high_level::*,
        high_level::{TEST_LWE_DEF_1, TEST_LWE_DEF_2, TEST_RADIX},
        ops::keyswitch::{
            lwe_keyswitch::keyswitch_lwe_to_lwe, lwe_keyswitch_key::generate_keyswitch_key_lwe,
        },
        PlaintextBits,
    };

    #[test]
    fn keyswitch_lwe() {
        let bits = PlaintextBits(4);
        let from_lwe = TEST_LWE_DEF_1;
        let to_lwe = TEST_LWE_DEF_2;

        for _ in 0..50 {
            let original_sk = keygen::generate_binary_lwe_sk(&from_lwe);
            let new_sk = keygen::generate_binary_lwe_sk(&to_lwe);

            let mut ksk = LweKeyswitchKey::<u64>::new(&from_lwe, &to_lwe, &TEST_RADIX);
            generate_keyswitch_key_lwe(&mut ksk, &original_sk, &new_sk, &to_lwe, &TEST_RADIX);

            let msg = thread_rng().next_u64() % (1 << bits.0);

            let original_ct = original_sk.encrypt(msg, &from_lwe, bits).0;

            let mut new_ct = LweCiphertext::new(&to_lwe);
            keyswitch_lwe_to_lwe(
                &mut new_ct,
                &original_ct,
                &ksk,
                &from_lwe,
                &to_lwe,
                &TEST_RADIX,
            );

            let new_decrypted = new_sk.decrypt(&new_ct, &to_lwe, bits);

            assert_eq!(new_decrypted, msg);
        }
    }

    #[test]
    fn lwe_keyswitch_keygen() {
        let from_lwe = TEST_LWE_DEF_1;
        let to_lwe = TEST_LWE_DEF_2;

        for _ in 0..10 {
            let sk_1 = keygen::generate_binary_lwe_sk(&from_lwe);
            let sk_2 = keygen::generate_binary_lwe_sk(&to_lwe);

            let mut ksk = LweKeyswitchKey::<u64>::new(&from_lwe, &to_lwe, &TEST_RADIX);
            generate_keyswitch_key_lwe(&mut ksk, &sk_1, &sk_2, &to_lwe, &TEST_RADIX);

            for (i, r) in ksk.rows(&to_lwe, &TEST_RADIX).enumerate() {
                for (j, l) in r.lwe_ciphertexts(&to_lwe).enumerate() {
                    let decomp = (j + 1) * TEST_RADIX.radix_log.0;

                    let res = sk_2.decrypt(l, &to_lwe, PlaintextBits(decomp as u32));

                    assert_eq!(res, sk_1.s()[i]);
                }
            }
        }
    }
}
