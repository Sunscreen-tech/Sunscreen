use crate::{entities::LweCiphertextRef, LweDef, Torus, TorusOps};

/// Add `amount` to each torus element (mod q) in the ciphertext.
/// This shifts where messages lie on the torus and adds no noise.
///
/// # Remark
/// Suppose we have plaintexts 0 and 1 that lie centered at 0 and q/2 respectively.
/// If we rotate by q/4, then the 0 lies centered at q/4 and 1 lies at 3q/4 == -q/4.
pub fn rotate<S: TorusOps>(
    output: &mut LweCiphertextRef<S>,
    input: &LweCiphertextRef<S>,
    amount: Torus<S>,
    lwe: &LweDef,
) {
    output.assert_valid(lwe);
    input.assert_valid(lwe);

    output.a_mut(lwe).clone_from_slice(input.a(lwe));
    *output.b_mut(lwe) = input.b(lwe) + amount;
}

#[cfg(test)]
mod tests {
    use crate::{
        entities::LweCiphertext,
        high_level::{keygen, TEST_LWE_DEF_1},
        PlaintextBits, Torus,
    };

    use super::rotate;

    #[test]
    fn can_rotate() {
        let lwe_params = TEST_LWE_DEF_1;

        for _ in 0..100 {
            let sk = keygen::generate_binary_lwe_sk(&lwe_params);
            let val = sk.encrypt(0, &lwe_params, PlaintextBits(1)).0;

            let mut res = LweCiphertext::new(&lwe_params);

            rotate(
                &mut res,
                &val,
                Torus::encode(1, PlaintextBits(2)),
                &lwe_params,
            );

            let t = sk.decrypt_without_decode(&res, &lwe_params);

            assert!(t.inner() < 0x1u64 << 63);

            let val = sk.encrypt(1, &lwe_params, PlaintextBits(1)).0;

            rotate(
                &mut res,
                &val,
                Torus::encode(1, PlaintextBits(2)),
                &lwe_params,
            );

            let t = sk.decrypt_without_decode(&res, &lwe_params);

            assert!(t.inner() > 0x1u64 << 63);
        }
    }
}
